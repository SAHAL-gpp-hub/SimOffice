import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { DbService } from '../db/db.service';
import { sql } from 'kysely';

@Injectable()
export class DebriefService {
  private readonly logger = new Logger(DebriefService.name);

  constructor(private readonly db: DbService) {}

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

  async getTeacherDebrief(sessionIdOrCode: string, teacherId: string) {
    const session = await this.checkTeacherOwnership(sessionIdOrCode, teacherId);
    const sessionId = session.id;

    if (session.status !== 'ended' && session.status !== 'debriefed' && session.status !== 'torn_down') {
      throw new BadRequestException('Session is not yet in debrief state');
    }

    const teamSummaries = await this.db
      .selectFrom('team_debrief_summary')
      .selectAll()
      .where('session_id', '=', sessionId)
      .execute();

    return {
      sessionStatus: session.status,
      teams: teamSummaries,
    };
  }

  async getStudentDebrief(sessionIdOrCode: string, rosterEntryId: string) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sessionIdOrCode);

    let query = this.db
      .selectFrom('sessions')
      .select(['id', 'status', 'scenario_variant_id']);

    if (isUuid) {
      query = query.where('id', '=', sessionIdOrCode);
    } else {
      const clean = sessionIdOrCode.trim().toUpperCase().replace(/O/g, '0');
      query = query.where(sql<boolean>`REPLACE(UPPER(sessions.join_code), 'O', '0') = ${clean}`);
    }

    const session = await query.executeTakeFirst();

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    const sessionId = session.id;

    if (session.status !== 'ended' && session.status !== 'debriefed' && session.status !== 'torn_down') {
      throw new BadRequestException('Session is not yet in debrief state');
    }

    // Find student's team in this session
    const teamMembership = await this.db
      .selectFrom('team_memberships')
      .innerJoin('teams', 'teams.id', 'team_memberships.team_id')
      .select(['teams.id as team_id'])
      .where('teams.session_id', '=', sessionId)
      .where('team_memberships.roster_entry_id', '=', rosterEntryId)
      .executeTakeFirst();

    if (!teamMembership) {
      throw new ForbiddenException('Not a participant of this session');
    }

    const teamSummary = await this.db
      .selectFrom('team_debrief_summary')
      .selectAll()
      .where('team_id', '=', teamMembership.team_id)
      .executeTakeFirst();

    const studentSummary = await this.db
      .selectFrom('student_contribution_summary')
      .selectAll()
      .where('session_id', '=', sessionId)
      .where('roster_entry_id', '=', rosterEntryId)
      .executeTakeFirst();

    // If revealed, we fetch fixContent
    let fixContent: string | null = null;
    // @ts-ignore
    if (teamSummary && teamSummary.fix_revealed_at) {
      const variantInfo = await this.db
        .selectFrom('sessions')
        .innerJoin('scenario_variants', 'scenario_variants.id', 'sessions.scenario_variant_id')
        .select(['scenario_variants.issue_repo_ref'])
        .where('sessions.id', '=', sessionId)
        .executeTakeFirst();
      if (variantInfo) {
        fixContent = `Issue: ${variantInfo.issue_repo_ref}`;
      }
    }

    return {
      teamSummary: teamSummary || null,
      studentSummary: studentSummary || null,
      fixContent,
    };
  }

  async revealFix(sessionIdOrCode: string, teamId: string, teacherId: string) {
    const session = await this.checkTeacherOwnership(sessionIdOrCode, teacherId);
    const sessionId = session.id;

    const result = await this.db
      .updateTable('teams')
      // @ts-ignore
      .set({ fix_revealed_at: sql`now()` })
      .where('session_id', '=', sessionId)
      .where('id', '=', teamId)
      .executeTakeFirst();

    if (result.numUpdatedRows === 0n) {
      throw new NotFoundException('Team not found in this session');
    }

    return { success: true };
  }
}
