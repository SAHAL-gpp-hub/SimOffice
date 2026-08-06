import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  ConflictException,
  Logger,
  NotFoundException,
  Inject,
} from '@nestjs/common';
import { DbService } from '../db/db.service';
import type { SandboxProvider } from '../sandbox/sandbox.types';
import { SANDBOX_PROVIDER } from '../sandbox/sandbox.types';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { sql } from 'kysely';

export interface JwtStudentPayload {
  sub: string;
  role: 'student';
  sessionId: string;
  classId: string;
  teamId: string | null;
}

@Injectable()
export class SessionsService {
  private readonly logger = new Logger(SessionsService.name);
  private readonly jwtSecret = process.env.JWT_SECRET || 'dev-secret';

  constructor(
    private readonly db: DbService,
    @Inject(SANDBOX_PROVIDER) private readonly sandbox: SandboxProvider,
  ) {}

  // Helper for checking ownership
  private async checkTeacherOwnership(sessionId: string, teacherId: string) {
    const session = await this.db
      .selectFrom('sessions')
      .innerJoin('classes', 'classes.id', 'sessions.class_id')
      .select(['sessions.id', 'classes.teacher_account_id', 'sessions.status'])
      .where('sessions.id', '=', sessionId)
      .executeTakeFirst();

    if (!session) {
      throw new NotFoundException('Session not found');
    }
    if (session.teacher_account_id !== teacherId) {
      throw new ForbiddenException('Not authorized to access this session');
    }
    return session;
  }

  // 1. Create Session
  async createSession(teacherId: string, data: any) {
    // Check if teacher owns class
    const cls = await this.db
      .selectFrom('classes')
      .select('teacher_account_id')
      .where('id', '=', data.classId)
      .executeTakeFirst();
    if (!cls || cls.teacher_account_id !== teacherId) {
      throw new ForbiddenException('Class not owned by this teacher');
    }

    let scenarioVariantId = data.scenarioVariantId;
    if (!scenarioVariantId) {
      // Find eligible unused variant
      // PRD 11.5.3: no repeat incident
      const variant = await this.db
        .selectFrom('scenario_variants')
        .select('id')
        .where('scenario_id', '=', data.scenarioId)
        .where('difficulty', '=', data.difficulty)
        .where('category', '=', data.category)
        .where(
          'id',
          'not in',
          this.db
            .selectFrom('sessions')
            .select('scenario_variant_id')
            .where('class_id', '=', data.classId),
        )
        .executeTakeFirst();

      if (!variant) {
        throw new ConflictException('NO_ELIGIBLE_VARIANT');
      }
      scenarioVariantId = variant.id;
    }

    const joinCode = this.generateJoinCode();
    // In production we should collision-check joinCode in active sessions, omitted here for brevity

    return await this.db.transaction().execute(async (trx) => {
      const session = await trx
        .insertInto('sessions')
        .values({
          class_id: data.classId,
          scenario_variant_id: scenarioVariantId,
          department_mode: data.departmentMode || 'single_department',
          time_limit_minutes: data.timeLimitMinutes,
          max_roster_size: data.maxRosterSize,
          join_code: joinCode,
          status: 'created',
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      // Resolve department(s)
      const depts = await trx
        .selectFrom('scenario_departments')
        .innerJoin(
          'departments',
          'departments.id',
          'scenario_departments.department_id',
        )
        .select(['departments.id', 'departments.code'])
        .where(
          'scenario_id',
          '=',
          data.scenarioId ||
            (
              await trx
                .selectFrom('scenario_variants')
                .select('scenario_id')
                .where('id', '=', scenarioVariantId)
                .executeTakeFirst()
            )?.scenario_id,
        )
        .execute();

      const teams: any[] = [];
      if (session.department_mode === 'single_department') {
        const team = await trx
          .insertInto('teams')
          .values({
            session_id: session.id,
            department_id: depts[0].id,
            label: `${depts[0].code} Team`,
          })
          .returningAll()
          .executeTakeFirstOrThrow();
        teams.push(team);
      } // multi_department out of scope for v1.0

      return {
        sessionId: session.id,
        joinCode: session.join_code,
        status: session.status,
        teams: teams.map((t) => ({
          teamId: t.id,
          departmentCode: depts.find((d) => d.id === t.department_id)?.code,
          label: t.label,
        })),
      };
    });
  }

  private generateJoinCode(): string {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  }

  // 2. Patch Session
  async updateSessionDraft(sessionId: string, teacherId: string, updates: any) {
    const session = await this.checkTeacherOwnership(sessionId, teacherId);
    if (session.status !== 'created') {
      throw new ConflictException('INVALID_STATE_TRANSITION');
    }

    await this.db
      .updateTable('sessions')
      .set({
        time_limit_minutes: updates.timeLimitMinutes,
        max_roster_size: updates.maxRosterSize,
        scenario_variant_id: updates.scenarioVariantId,
      })
      .where('id', '=', sessionId)
      .execute();
  }

  // 3. Clone Session
  async cloneSession(
    sessionId: string,
    teacherId: string,
    overrideVariantId?: string,
  ) {
    const source = await this.db
      .selectFrom('sessions')
      .innerJoin('classes', 'classes.id', 'sessions.class_id')
      .selectAll('sessions')
      .select('classes.teacher_account_id')
      .where('sessions.id', '=', sessionId)
      .executeTakeFirst();

    if (!source) throw new NotFoundException('Session not found');
    if (source.teacher_account_id !== teacherId)
      throw new ForbiddenException('Not owner of this class');

    let variantId = overrideVariantId;
    if (!variantId) {
      // Find unused variant of same scenario
      const scenario = await this.db
        .selectFrom('scenario_variants')
        .select('scenario_id')
        .where('id', '=', source.scenario_variant_id)
        .executeTakeFirst();
      const variant = await this.db
        .selectFrom('scenario_variants')
        .select('id')
        .where('scenario_id', '=', scenario!.scenario_id)
        .where(
          'id',
          'not in',
          this.db
            .selectFrom('sessions')
            .select('scenario_variant_id')
            .where('class_id', '=', source.class_id),
        )
        .executeTakeFirst();
      if (!variant) throw new ConflictException('NO_ELIGIBLE_VARIANT');
      variantId = variant.id;
    }

    const joinCode = this.generateJoinCode();
    const cloned = await this.db
      .insertInto('sessions')
      .values({
        class_id: source.class_id,
        scenario_variant_id: variantId,
        department_mode: source.department_mode,
        time_limit_minutes: source.time_limit_minutes,
        max_roster_size: source.max_roster_size,
        cloned_from_session_id: source.id,
        join_code: joinCode,
        status: 'created',
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    return {
      sessionId: cloned.id,
      joinCode: cloned.join_code,
      status: cloned.status,
    };
  }

  // 4. Start Session
  async startSession(sessionId: string, teacherId: string) {
    await this.checkTeacherOwnership(sessionId, teacherId);

    // Concurrency control: Compare-and-swap
    const updateResult = await this.db
      .updateTable('sessions')
      .set({ status: 'provisioning', started_at: new Date() })
      .where('id', '=', sessionId)
      .where('status', '=', 'created')
      .executeTakeFirst();

    if (updateResult.numUpdatedRows === 0n) {
      throw new ConflictException('INVALID_STATE_TRANSITION');
    }

    // Async/Background provisioning step
    this.provisionEnvironments(sessionId).catch(async (e) => {
      this.logger.error(`Provisioning failed for session ${sessionId}`, e);
      // Provision failed state (terminal for M0.2c)
      await this.db
        .updateTable('sessions')
        .set({ status: 'provision_failed' })
        .where('id', '=', sessionId)
        .execute();
    });

    return { sessionId, status: 'provisioning', startedAt: new Date() };
  }

  private async provisionEnvironments(sessionId: string) {
    const teams = await this.db
      .selectFrom('teams')
      .select('id')
      .where('session_id', '=', sessionId)
      .execute();

    // Fetch scenario variant to get the image
    const session = await this.db
      .selectFrom('sessions')
      .select(['scenario_variant_id'])
      .where('id', '=', sessionId)
      .executeTakeFirst();
    if (!session) return;

    // Default image if none found, though in a full implementation we'd read it from the variant
    const variant = { image: 'node:22-alpine' as const };
    const limits = { cpuCores: 1, memoryMb: 512, wallClockTimeoutMs: 3600000 };

    let success = true;
    for (const t of teams) {
      try {
        const envRef = await this.sandbox.provision(t.id, variant, limits);

        await this.db
          .insertInto('environment_instances')
          .values({
            team_id: t.id,
            sandbox_provider: 'gvisor',
            provider_ref: envRef.id,
            status: 'ready',
            resource_limits: JSON.stringify(limits),
          })
          .execute();
      } catch (e) {
        this.logger.error(
          `Failed to provision environment for team ${t.id}`,
          e,
        );
        success = false;
        throw e;
      }
    }

    if (success) {
      await this.db
        .updateTable('sessions')
        .set({ status: 'active' })
        .where('id', '=', sessionId)
        .execute();
    }
  }

  // 5. Get Session
  async getSessionStatus(
    sessionId: string,
    requesterId: string,
    role: string,
    tokenSessionId?: string,
  ) {
    if (role === 'student' && tokenSessionId !== sessionId) {
      throw new ForbiddenException('Student can only view their own session');
    }

    if (role === 'teacher') {
      await this.checkTeacherOwnership(sessionId, requesterId);
    }

    const session = await this.db
      .selectFrom('sessions')
      .selectAll()
      .where('id', '=', sessionId)
      .executeTakeFirst();
    if (!session) throw new NotFoundException();

    const teams = await this.db
      .selectFrom('teams')
      .innerJoin('departments', 'departments.id', 'teams.department_id')
      .select(['teams.id', 'departments.code', 'teams.outcome_state'])
      .where('session_id', '=', sessionId)
      .execute();

    return {
      sessionId: session.id,
      status: session.status,
      endReason: session.end_reason,
      joinCode:
        session.status === 'active' || session.status === 'created'
          ? session.join_code
          : undefined,
      departmentMode: session.department_mode,
      timeLimitMinutes: session.time_limit_minutes,
      startedAt: session.started_at,
      endedAt: session.ended_at,
      teams: teams.map((t) => ({
        teamId: t.id,
        departmentCode: t.code,
        outcomeState: t.outcome_state,
      })),
    };
  }

  // 6. Announcements
  async announceToSession(sessionId: string, teacherId: string, body: any) {
    await this.checkTeacherOwnership(sessionId, teacherId);
    // Mock broadcast
    this.logger.log(
      `[Mock Broadcast] Session ${sessionId}, Team ${body.teamId || 'ALL'}: ${body.text}`,
    );
  }

  // 7. End Session
  async endSession(sessionId: string, teacherId: string) {
    await this.checkTeacherOwnership(sessionId, teacherId);

    const updateResult = await this.db
      .updateTable('sessions')
      .set({
        status: 'ended',
        end_reason: 'teacher_ended_early',
        ended_at: new Date(),
      })
      .where('id', '=', sessionId)
      .where('status', 'in', ['active', 'provision_failed', 'provisioning'])
      .executeTakeFirst();

    if (updateResult.numUpdatedRows === 0n) {
      throw new ConflictException('INVALID_STATE_TRANSITION');
    }

    // Async teardown
    this.teardownEnvironments(sessionId).catch((e) => {
      this.logger.error(
        `Teardown failed for session ${sessionId}. Defers formal retry to M0.2d/e.`,
        e,
      );
    });

    return { sessionId, status: 'ended', endReason: 'teacher_ended_early' };
  }

  // End Session System (for Cron)
  async endSessionSystem(sessionId: string, endReason: any) {
    await this.db
      .updateTable('sessions')
      .set({ status: 'ended', end_reason: endReason, ended_at: new Date() })
      .where('id', '=', sessionId)
      .where('status', '=', 'active')
      .execute();

    this.teardownEnvironments(sessionId).catch((e) => {
      this.logger.error(
        `Teardown failed for session ${sessionId}. Defers formal retry to M0.2d/e.`,
        e,
      );
    });
  }

  private async teardownEnvironments(sessionId: string) {
    const teams = await this.db
      .selectFrom('teams')
      .select('id')
      .where('session_id', '=', sessionId)
      .execute();
    for (const t of teams) {
      await this.db
        .updateTable('environment_instances')
        .set({ status: 'torn_down', torn_down_at: new Date() })
        .where('team_id', '=', t.id)
        .execute();
    }
    await this.db
      .updateTable('sessions')
      .set({ status: 'torn_down' })
      .where('id', '=', sessionId)
      .execute();
  }

  // 8. List Classes Sessions
  async listClassSessions(classId: string, teacherId: string) {
    const cls = await this.db
      .selectFrom('classes')
      .select('teacher_account_id')
      .where('id', '=', classId)
      .executeTakeFirst();
    if (!cls || cls.teacher_account_id !== teacherId)
      throw new ForbiddenException();

    const sessions = await this.db
      .selectFrom('sessions')
      .leftJoin(
        'scenario_variants',
        'scenario_variants.id',
        'sessions.scenario_variant_id',
      )
      .select([
        'sessions.id',
        'sessions.status',
        'sessions.created_at',
        'sessions.started_at',
        'sessions.ended_at',
        'sessions.scenario_variant_id',
        'sessions.join_code',
      ])
      .where('sessions.class_id', '=', classId)
      .execute();

    return {
      sessions: sessions.map((s) => ({
        id: s.id,
        status: s.status,
        createdAt: s.created_at,
        startedAt: s.started_at,
        endedAt: s.ended_at,
        scenarioVariantId: s.scenario_variant_id,
        joinCode:
          s.status === 'active' || s.status === 'created'
            ? s.join_code
            : undefined,
      })),
    };
  }

  // original joinSession (untouched)...
  async joinSession(
    joinCode: string,
    displayName: string,
    rosterPasscode?: string,
  ) {
    const classSession = await this.db
      .selectFrom('sessions')
      .select(['id', 'class_id', 'status', 'max_roster_size'])
      .where('join_code', '=', joinCode)
      .executeTakeFirst();

    if (!classSession || classSession.status === 'torn_down') {
      throw new ForbiddenException('Session not found or has ended');
    }

    let rosterEntry;
    let returnedPasscode = rosterPasscode;

    if (rosterPasscode) {
      // Returning student
      const allRosterEntries = await this.db
        .selectFrom('roster_entries')
        .select(['id', 'roster_passcode_hash', 'appearance'])
        .where('class_id', '=', classSession.class_id)
        .execute();

      for (const entry of allRosterEntries) {
        const isValid = await bcrypt.compare(
          rosterPasscode,
          entry.roster_passcode_hash,
        );
        if (isValid) {
          rosterEntry = entry;
          break;
        }
      }

      if (!rosterEntry) {
        throw new UnauthorizedException('Invalid credentials');
      }

      await this.db
        .updateTable('roster_entries')
        .set({ last_seen_at: new Date(), display_name: displayName })
        .where('id', '=', rosterEntry.id)
        .execute();
    } else {
      // New student
      if (classSession.max_roster_size !== null) {
        const result = await this.db
          .selectFrom('team_memberships')
          .innerJoin('teams', 'teams.id', 'team_memberships.team_id')
          .select(
            this.db.fn
              .count<number>('team_memberships.roster_entry_id')
              .distinct()
              .as('count'),
          )
          .where('teams.session_id', '=', classSession.id)
          .executeTakeFirst();

        const count = result?.count || 0;
        if (count >= classSession.max_roster_size) {
          throw new ConflictException('SESSION_ROSTER_FULL');
        }
      }

      const randomWord = ['WOLF', 'BEAR', 'HAWK', 'LION', 'PUMA'][
        Math.floor(Math.random() * 5)
      ];
      const randomNum = Math.floor(Math.random() * 90) + 10;
      returnedPasscode = `${randomWord}-${randomNum}`;

      const passcodeHash = await bcrypt.hash(returnedPasscode, 10);

      rosterEntry = await this.db
        .insertInto('roster_entries')
        .values({
          class_id: classSession.class_id,
          display_name: displayName,
          roster_passcode_hash: passcodeHash,
          last_seen_at: new Date(),
        })
        .returning(['id', 'appearance'])
        .executeTakeFirstOrThrow();
    }

    // Look up or assign team membership
    let teamMembership = await this.db
      .selectFrom('team_memberships')
      .innerJoin('teams', 'teams.id', 'team_memberships.team_id')
      .select(['team_memberships.team_id'])
      .where('teams.session_id', '=', classSession.id)
      .where('team_memberships.roster_entry_id', '=', rosterEntry.id)
      .executeTakeFirst();

    if (!teamMembership) {
      // Find the single team for this session if applicable
      const team = await this.db
        .selectFrom('teams')
        .select(['id'])
        .where('session_id', '=', classSession.id)
        .executeTakeFirst();

      if (team) {
        teamMembership = await this.db
          .insertInto('team_memberships')
          .values({
            team_id: team.id,
            roster_entry_id: rosterEntry.id,
          })
          .returning(['team_id'])
          .executeTakeFirstOrThrow();
      }
    }

    const payload: JwtStudentPayload = {
      sub: rosterEntry.id,
      role: 'student',
      sessionId: classSession.id,
      classId: classSession.class_id,
      teamId: teamMembership?.team_id || null,
    };

    const token = jwt.sign(payload, this.jwtSecret, { expiresIn: '12h' });

    return {
      rosterEntryId: rosterEntry.id,
      rosterPasscode: returnedPasscode,
      appearance: rosterEntry.appearance,
      sessionId: classSession.id,
      teamId: teamMembership?.team_id || null,
      token,
      wsRoomUrl: teamMembership
        ? `wss://example.com/rooms/${teamMembership.team_id}`
        : null,
    };
  }
}
