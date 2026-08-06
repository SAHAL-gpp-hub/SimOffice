import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';
import { DbService } from '../src/db/db.service';
import * as jwt from 'jsonwebtoken';

describe('SessionsController (e2e)', () => {
  let app: INestApplication<App>;
  let db: DbService;
  let classId: string;
  let variantId: string;
  let sessionId: string;
  let fullSessionId: string;
  let teacherId: string;
  let scenarioId: string;
  let departmentId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    db = app.get(DbService);
    await app.init();

    // Setup teacher
    const teacher = await db
      .insertInto('accounts')
      .values({
        email: 'session.test@example.com',
        password_hash: 'hash',
        display_name: 'Session Test Teacher',
        role: 'teacher',
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    teacherId = teacher.id;

    // Setup class
    const cls = await db
      .insertInto('classes')
      .values({
        teacher_account_id: teacherId,
        name: 'Test Class',
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    classId = cls.id;

    const scenario = await db
      .insertInto('scenarios')
      .values({
        title: 'Test Scenario',
        domain: 'web_development',
        departmental_shape: 'full_stack',
        fix_baseline_repo_ref: 'main',
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    scenarioId = scenario.id;

    // Setup variant
    const variant = await db
      .insertInto('scenario_variants')
      .values({
        scenario_id: scenario.id,
        difficulty: 'beginner',
        category: 'logic_bug',
        issue_repo_ref: 'bug/1',
        briefing_text: 'Fix the bug',
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    variantId = variant.id;

    // Setup normal session
    const session = await db
      .insertInto('sessions')
      .values({
        class_id: classId,
        scenario_variant_id: variantId,
        join_code: 'TEST01',
        status: 'active',
        time_limit_minutes: 60,
        max_roster_size: 5,
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    sessionId = session.id;

    // Setup full session
    const fullSession = await db
      .insertInto('sessions')
      .values({
        class_id: classId,
        scenario_variant_id: variantId,
        join_code: 'FULL01',
        status: 'active',
        time_limit_minutes: 60,
        max_roster_size: 1, // Only 1 allowed
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    fullSessionId = fullSession.id;

    // Fill up the full session
    const re = await db
      .insertInto('roster_entries')
      .values({
        class_id: classId,
        display_name: 'Already In',
        roster_passcode_hash: 'hash',
      })
      .returning('id')
      .executeTakeFirstOrThrow();

    const department = await db
      .insertInto('departments')
      .values({
        code: 'backend_test_only',
        display_name: 'Test Dept',
      })
      .returning('id')
      .executeTakeFirstOrThrow();
    departmentId = department.id;

    // Link department to scenario
    await db
      .insertInto('scenario_departments')
      .values({
        scenario_id: scenario.id,
        department_id: department.id,
      })
      .execute();

    // Add team for the full session
    const team = await db
      .insertInto('teams')
      .values({
        session_id: fullSessionId,
        department_id: department.id,
        label: 'Team 1',
      })
      .returning('id')
      .executeTakeFirstOrThrow();

    await db
      .insertInto('team_memberships')
      .values({
        team_id: team.id,
        roster_entry_id: re.id,
      })
      .execute();
  });

  afterAll(async () => {
    // Cleanup
    await db.deleteFrom('environment_instances').execute();
    await db.deleteFrom('team_memberships').execute();
    await db.deleteFrom('teams').execute();
    await db
      .deleteFrom('scenario_departments')
      .where('scenario_id', '=', scenarioId)
      .execute();
    await db.deleteFrom('departments').where('id', '=', departmentId).execute();
    await db
      .deleteFrom('roster_entries')
      .where('class_id', '=', classId)
      .execute();
    await db.deleteFrom('sessions').where('class_id', '=', classId).execute();
    await db
      .deleteFrom('scenario_variants')
      .where('id', '=', variantId)
      .execute();
    await db.deleteFrom('scenarios').where('id', '=', scenarioId).execute();
    await db.deleteFrom('classes').where('id', '=', classId).execute();
    await db.deleteFrom('accounts').where('id', '=', teacherId).execute();
    await app.close();
  });

  it('/sessions/join (POST) - new student', async () => {
    const res = await request(app.getHttpServer())
      .post('/sessions/join')
      .send({ joinCode: 'TEST01', displayName: 'New Student' })
      .expect(200);

    expect(res.body.token).toBeDefined();
    expect(res.body.rosterPasscode).toBeDefined();
    expect(res.body.sessionId).toEqual(sessionId);
  });

  it('/sessions/join (POST) - roster full', () => {
    return request(app.getHttpServer())
      .post('/sessions/join')
      .send({ joinCode: 'FULL01', displayName: 'Another Student' })
      .expect(409)
      .expect((res) => {
        expect(res.body.message).toEqual('SESSION_ROSTER_FULL');
      });
  });

  it('/sessions/join (POST) - returning student', async () => {
    // First join to get the passcode
    const res1 = await request(app.getHttpServer())
      .post('/sessions/join')
      .send({ joinCode: 'TEST01', displayName: 'Returning Student' })
      .expect(200);

    const passcode = res1.body.rosterPasscode;

    // Now return with it
    const res2 = await request(app.getHttpServer())
      .post('/sessions/join')
      .send({
        joinCode: 'TEST01',
        displayName: 'Returning Student',
        rosterPasscode: passcode,
      })
      .expect(200);

    expect(res2.body.token).toBeDefined();
    expect(res2.body.rosterEntryId).toEqual(res1.body.rosterEntryId);
  });

  it('/sessions/me (GET) - success', async () => {
    const res1 = await request(app.getHttpServer())
      .post('/sessions/join')
      .send({ joinCode: 'TEST01', displayName: 'Me Test' })
      .expect(200);

    const token = res1.body.token;

    return request(app.getHttpServer())
      .get('/sessions/me')
      .set('Authorization', `Bearer ${token}`)
      .expect(200)
      .expect((res) => {
        expect(res.body.role).toEqual('student');
        expect(res.body.rosterEntryId).toEqual(res1.body.rosterEntryId);
      });
  });

  it('teacher session lifecycle: create -> start -> end', async () => {
    // Generate teacher token
    const token = jwt.sign(
      { sub: teacherId, role: 'teacher' },
      process.env.JWT_SECRET || 'dev-secret',
    );

    // 1. Create
    const createRes = await request(app.getHttpServer())
      .post('/sessions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        classId: classId,
        scenarioVariantId: variantId,
        timeLimitMinutes: 30,
      })
      .expect(201);

    const newSessionId = createRes.body.sessionId;
    expect(createRes.body.status).toEqual('created');

    // 2. Start
    const startRes = await request(app.getHttpServer())
      .post(`/sessions/${newSessionId}/start`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    expect(startRes.body.status).toEqual('provisioning');

    // 3. Wait for provisioning to finish (mock takes 500ms in service)
    await new Promise((r) => setTimeout(r, 600));

    // 4. Verify Active
    const getRes = await request(app.getHttpServer())
      .get(`/sessions/${newSessionId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(getRes.body.status).toEqual('active');

    // 5. End
    const endRes = await request(app.getHttpServer())
      .post(`/sessions/${newSessionId}/end`)
      .set('Authorization', `Bearer ${token}`)
      .expect(201);

    expect(endRes.body.status).toEqual('ended');

    // 6. Verify torn_down
    // teardownEnvironments is async, let's wait a bit
    await new Promise((r) => setTimeout(r, 100));

    const finalRes = await request(app.getHttpServer())
      .get(`/sessions/${newSessionId}`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(finalRes.body.status).toEqual('torn_down');
  });
});
