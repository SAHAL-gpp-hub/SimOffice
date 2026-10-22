import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { DbService } from '../db/db.service';
import { matchMaker } from '@colyseus/core';
import type { TeamRoom } from '../rooms/TeamRoom';
import { sql } from 'kysely';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

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

  async getSessionDashboard(sessionIdOrCode: string, teacherId: string) {
    const session = await this.checkTeacherOwnership(sessionIdOrCode, teacherId);
    const sessionId = session.id;

    // Get all teams for the session and their debrief summary
    const teamsData = await this.db
      .selectFrom('teams')
      .innerJoin('departments', 'departments.id', 'teams.department_id')
      .leftJoin('team_debrief_summary', 'team_debrief_summary.team_id', 'teams.id')
      .select([
        'teams.id as teamId',
        'departments.code as departmentCode',
        'teams.outcome_state as outcomeState',
        'team_debrief_summary.full_fix_checks_passed as fullFixChecksPassed',
        'team_debrief_summary.full_fix_checks_total as fullFixChecksTotal',
        'team_debrief_summary.diagnostic_checks_passed as diagnosticChecksPassed',
      ])
      .where('teams.session_id', '=', sessionId)
      .execute();

    const rooms = await matchMaker.query({ name: 'team_room' });

    const resultTeams = await Promise.all(
      teamsData.map(async (t) => {
        const teamRoomMeta = rooms.find((r) => r.metadata?.teamId === t.teamId);
        const roster: any[] = [];

        if (teamRoomMeta) {
          try {
            const room = matchMaker.getRoomById(teamRoomMeta.roomId) as TeamRoom;
            if (room && room.state) {
              room.state.players.forEach((p) => {
                roster.push({
                  rosterEntryId: p.rosterEntryId,
                  displayName: p.displayName,
                  connected: p.connected,
                  seated: p.animState === 'sit' || p.animState === 'sitDown',
                  deskId: p.deskId || '',
                });
              });
            }
          } catch (e) {
            this.logger.warn(`Failed to get Room instance for team ${t.teamId}: ${e.message}`);
          }
        }

        // Fallback or empty room: fetch from DB
        if (roster.length === 0) {
          const dbRoster = await this.db
            .selectFrom('team_memberships')
            .innerJoin('roster_entries', 'roster_entries.id', 'team_memberships.roster_entry_id')
            .select([
              'roster_entries.id as rosterEntryId',
              'roster_entries.display_name as displayName',
            ])
            .where('team_memberships.team_id', '=', t.teamId)
            .execute();

          dbRoster.forEach((entry) => {
            roster.push({
              rosterEntryId: entry.rosterEntryId,
              displayName: entry.displayName,
              connected: false,
              seated: false,
              deskId: '',
            });
          });
        }

        return {
          teamId: t.teamId,
          departmentCode: t.departmentCode,
          outcomeState: t.outcomeState,
          fullFixChecksPassed: t.fullFixChecksPassed ? Number(t.fullFixChecksPassed) : 0,
          fullFixChecksTotal: t.fullFixChecksTotal ? Number(t.fullFixChecksTotal) : 1, // Default to 1 if missing for now
          diagnosticChecksPassed: t.diagnosticChecksPassed ? Number(t.diagnosticChecksPassed) : 0,
          roster,
        };
      }),
    );

    return { 
      sessionStatus: session.status,
      teams: resultTeams 
    };
  }

  async sendHint(sessionIdOrCode: string, teamId: string, teacherId: string, message: string) {
    const session = await this.checkTeacherOwnership(sessionIdOrCode, teacherId);
    const sessionId = session.id;

    // Verify team belongs to session
    const team = await this.db
      .selectFrom('teams')
      .select('id')
      .where('id', '=', teamId)
      .where('session_id', '=', sessionId)
      .executeTakeFirst();
    
    if (!team) {
      throw new NotFoundException('Team not found in this session');
    }

    // Console logging as basic audit trail since hint isn't persisted (per UIUXD/PRD)
    this.logger.log(`[TeacherHint] Session ${sessionId}, Team ${teamId}: ${message}`);

    const rooms = await matchMaker.query({ name: 'team_room' });
    const teamRoomMeta = rooms.find((r) => r.metadata?.teamId === teamId);

    if (teamRoomMeta) {
      try {
        const room = matchMaker.getRoomById(teamRoomMeta.roomId) as TeamRoom;
        if (room && typeof room.broadcastHint === 'function') {
          room.broadcastHint(message);
        }
      } catch (e) {
        this.logger.warn(`Failed to broadcast hint to team ${teamId}: ${e.message}`);
      }
    }
  }
}
