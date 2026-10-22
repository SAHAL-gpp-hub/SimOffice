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
import { matchMaker } from 'colyseus';
import * as bcrypt from 'bcrypt';
import * as jwt from 'jsonwebtoken';
import { sql } from 'kysely';

export interface JwtStudentPayload {
  sub: string;
  role: 'student';
  sessionId: string;
  classId: string;
  teamId: string | null;
  displayName?: string;
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
  private async checkTeacherOwnership(sessionIdOrCode: string, teacherId: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionIdOrCode);
    
    let query = this.db
      .selectFrom('sessions')
      .innerJoin('classes', 'classes.id', 'sessions.class_id')
      .select(['sessions.id', 'classes.teacher_account_id', 'sessions.status']);

    if (isUuid) {
      query = query.where('sessions.id', '=', sessionIdOrCode);
    } else {
      const clean = sessionIdOrCode.trim().toUpperCase().replace(/O/g, '0');
      query = query.where(sql<boolean>`REPLACE(UPPER(sessions.join_code), 'O', '0') = ${clean}`);
    }

    const session = await query.executeTakeFirst();

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
  async startSession(sessionIdOrCode: string, teacherId: string) {
    const session = await this.checkTeacherOwnership(sessionIdOrCode, teacherId);
    const sessionId = session.id;

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
      this.logger.error(
        `Failed to provision environments for session ${sessionId}`,
        e,
      );
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

        // Seed project code files into the container sandbox
        try {
          await this.sandbox.writeFile(
            envRef,
            'package.json',
            JSON.stringify(
              {
                name: 'omnicart-inventory-api',
                version: '1.0.0',
                scripts: {
                  start: 'node src/index.js',
                  check: 'node verification/check.js',
                  test: 'node verification/check.js',
                },
              },
              null,
              2,
            ),
          );

          await this.sandbox.writeFile(
            envRef,
            'src/index.js',
            `const express = require('express');
const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Seeded in-memory state
const initialInventory = {
  "ITEM-001": { id: "ITEM-001", name: "Wireless Mouse", stock: 5 },
  "ITEM-002": { id: "ITEM-002", name: "Mechanical Keyboard", stock: 2 }
};

let inventory = JSON.parse(JSON.stringify(initialInventory));

app.post('/api/inventory/reset', (req, res) => {
  inventory = JSON.parse(JSON.stringify(initialInventory));
  res.status(200).json({ success: true, message: "Inventory reset to initial state." });
});

app.post('/api/inventory/allocate', (req, res) => {
  const { itemId, quantity } = req.body;
  if (!itemId || !quantity || quantity <= 0) {
    return res.status(400).json({ error: "Invalid request. Provide itemId and a positive quantity." });
  }

  const item = inventory[itemId];
  if (!item) {
    return res.status(404).json({ error: "Item not found" });
  }

  // BUG: Checks if stock is greater than 0, but doesn't check if it's enough to fulfill the request.
  if (item.stock > 0) {
    item.stock -= quantity;
    return res.status(200).json({ success: true, stock: item.stock });
  } else {
    return res.status(400).json({ error: "Insufficient stock", stock: item.stock });
  }
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(\`Inventory API listening on port \${PORT}\`);
});

module.exports = server;
`,
          );

          await this.sandbox.writeFile(
            envRef,
            'verification/check.js',
            `console.log("Running OmniCart verification check...");
process.exit(0);
`,
          );
        } catch (fileErr) {
          this.logger.warn(`Could not seed initial files to sandbox: ${fileErr}`);
        }

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
    const session = await this.checkTeacherOwnership(sessionId, teacherId);
    const teams = await this.db
      .selectFrom('teams')
      .select('id')
      .where('session_id', '=', session.id)
      .execute();
    const teamIds = new Set(teams.map(t => t.id));
    
    // Broadcast to all team rooms for this session
    const rooms = await matchMaker.query({ name: 'team_room' });
    for (const room of rooms) {
      if (room.metadata && teamIds.has(room.metadata.teamId)) {
        if (!body.teamId || room.metadata.teamId === body.teamId) {
          matchMaker.remoteRoomCall(room.roomId, 'broadcast', ['teacherAnnouncement', {
            message: body.text,
            timestamp: Date.now()
          }]);
        }
      }
    }
    
    this.logger.log(
      `[Broadcast] Session ${session.id}, Team ${body.teamId || 'ALL'}: ${body.text}`,
    );
  }

  // 7. End Session
  async endSession(sessionIdOrCode: string, teacherId: string) {
    const session = await this.checkTeacherOwnership(sessionIdOrCode, teacherId);
    const sessionId = session.id;

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

    // Broadcast sessionEnded to all connected student rooms
    await this.broadcastSessionEnded(sessionId);

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

  private async broadcastSessionEnded(sessionId: string) {
    const teams = await this.db
      .selectFrom('teams')
      .select('id')
      .where('session_id', '=', sessionId)
      .execute();
    const teamIds = new Set(teams.map(t => t.id));

    const rooms = await matchMaker.query({ name: 'team_room' });
    for (const room of rooms) {
      if (room.metadata && teamIds.has(room.metadata.teamId)) {
        try {
          await matchMaker.remoteRoomCall(room.roomId, 'broadcast', ['sessionEnded', {
            debriefUrl: `/sessions/${sessionId}/debrief/me`, // Frontend route
          }]);
        } catch (e) {
          this.logger.warn(`Failed to broadcast sessionEnded to room ${room.roomId}`);
        }
      }
    }
  }

  private async teardownEnvironments(sessionId: string) {
    // 1. Broadcast sessionEnded to all connected clients
    await this.broadcastSessionEnded(sessionId);

    // 2. Wait a brief grace period (2-3 seconds) to ensure buffers flush
    await new Promise(resolve => setTimeout(resolve, 2000));

    // 3. Force disconnect/dispose Colyseus rooms
    const teams = await this.db
      .selectFrom('teams')
      .select('id')
      .where('session_id', '=', sessionId)
      .execute();
    const teamIds = new Set(teams.map(t => t.id));
    const rooms = await matchMaker.query({ name: 'team_room' });
    for (const room of rooms) {
      if (room.metadata && teamIds.has(room.metadata.teamId)) {
        try {
          await matchMaker.remoteRoomCall(room.roomId, 'disconnect');
        } catch (e) {
          // ignore
        }
      }
    }
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
    const cleanCode = joinCode.trim().toUpperCase().replace(/O/g, '0');

    const classSession = await this.db
      .selectFrom('sessions')
      .select(['id', 'class_id', 'status', 'max_roster_size'])
      .where(sql<boolean>`REPLACE(UPPER(join_code), 'O', '0') = ${cleanCode}`)
      .executeTakeFirst();

    if (!classSession) {
      throw new NotFoundException('INVALID_JOIN_CODE');
    }
    if (classSession.status === 'torn_down' || classSession.status === 'ended') {
      throw new ConflictException('SESSION_NOT_JOINABLE');
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
        throw new UnauthorizedException('INVALID_ROSTER_PASSCODE');
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
      displayName: displayName || rosterEntry.display_name,
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
