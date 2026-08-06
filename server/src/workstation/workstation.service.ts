import {
  Injectable,
  ConflictException,
  BadRequestException,
  PayloadTooLargeException,
  UnprocessableEntityException,
  Inject,
} from '@nestjs/common';
import { DbService } from '../db/db.service';
import { SANDBOX_PROVIDER, FileNode, EnvironmentRef } from '../sandbox/sandbox.types';
import type { SandboxProvider } from '../sandbox/sandbox.types';
import { VerificationService } from '../verification/verification.service';
import { JwtStudentPayload } from '../sessions/sessions.service';

interface EnvRow {
  envId: string;
  envStatus: string;
  sessionStatus: string;
  scenarioVariantId: string;
}

@Injectable()
export class WorkstationService {
  constructor(
    private readonly db: DbService,
    @Inject(SANDBOX_PROVIDER) private readonly sandbox: SandboxProvider,
    private readonly verificationService: VerificationService,
  ) {}

  private async getEnvironment(teamId: string): Promise<EnvRow> {
    const row = await this.db
      .selectFrom('environment_instances as ei')
      .innerJoin('teams as t', 't.id', 'ei.team_id')
      .innerJoin('sessions as s', 's.id', 't.session_id')
      .select([
        'ei.id as envId',
        'ei.status as envStatus',
        's.status as sessionStatus',
        's.scenario_variant_id as scenarioVariantId',
      ])
      .where('ei.team_id', '=', teamId)
      .executeTakeFirst();

    if (!row || row.envStatus !== 'ready' || row.sessionStatus !== 'active') {
      throw new ConflictException('ENVIRONMENT_NOT_READY');
    }

    return row;
  }

  private validatePath(path: string): void {
    if (path.includes('..') || path.startsWith('/')) {
      throw new BadRequestException('Invalid path: Directory traversal and leading slashes are not allowed');
    }
  }

  async listFiles(teamId: string): Promise<{ files: FileNode[] }> {
    const row = await this.getEnvironment(teamId);
    const files = await this.sandbox.listFiles({ id: row.envId });
    return { files };
  }

  async readFile(teamId: string, path: string): Promise<{ path: string; content: string }> {
    this.validatePath(path);
    const row = await this.getEnvironment(teamId);
    const content = await this.sandbox.readFile({ id: row.envId }, path);
    return { path, content };
  }

  async writeFile(
    teamId: string,
    path: string,
    content: string,
    user: { id: string; sessionId: string },
  ): Promise<{ saved: boolean; savedAt: string }> {
    this.validatePath(path);
    // 1MB limit check
    if (Buffer.byteLength(content, 'utf8') > 1024 * 1024) {
      throw new PayloadTooLargeException('File content exceeds 1MB limit');
    }

    const row = await this.getEnvironment(teamId);
    await this.sandbox.writeFile({ id: row.envId }, path, content);

    await this.db
      .insertInto('contribution_events')
      .values({
        session_id: user.sessionId,
        team_id: teamId,
        roster_entry_id: user.id,
        event_type: 'code_edit_saved',
        metadata: JSON.stringify({ path }),
      })
      .execute();

    return { saved: true, savedAt: new Date().toISOString() };
  }

  async runCheck(teamId: string, user: { id: string; sessionId: string }): Promise<any> {
    const row = await this.getEnvironment(teamId);

    await this.db
      .insertInto('contribution_events')
      .values({
        session_id: user.sessionId,
        team_id: teamId,
        roster_entry_id: user.id,
        event_type: 'check_run_triggered',
        metadata: JSON.stringify({}),
      })
      .execute();

    const result = await this.sandbox.runCheck({ id: row.envId });

    if (result.timedOut) {
      throw new UnprocessableEntityException('RESOURCE_LIMIT_EXCEEDED');
    }

    return {
      result: result.exitCode === 0 ? 'pass' : 'fail',
      output: result.stdout || result.stderr || '',
    };
  }

  async submitVerification(teamId: string, user: { id: string }): Promise<any> {
    const row = await this.getEnvironment(teamId);

    const env: EnvironmentRef = { id: row.envId };
    const runs = await this.verificationService.submitVerification(
      env,
      teamId,
      row.scenarioVariantId,
      user.id,
    );

    // After submitVerification completes, we must fetch the new outcome state for the team
    const teamRow = await this.db
      .selectFrom('teams')
      .select('outcome_state')
      .where('id', '=', teamId)
      .executeTakeFirstOrThrow();

    // Map `runs` to match the API Specification
    const mappedRuns = runs.map((r) => ({
      checkId: r.verificationCheckId,
      checkType: r.diagnosticDetails ? 'diagnostic' : 'full_fix', // We need checkType which is not in VerificationRunRecord directly, but VerificationService broadcasts it. Wait.
      result: r.result,
      diagnosticDetails: r.diagnosticDetails ? JSON.parse(r.diagnosticDetails) : {},
    }));
    // Note: The above mapping of `checkType` is an approximation since `checkType` is not in VerificationRunRecord.
    // Let me check if VerificationRunRecord has checkType or if I need to query `verification_checks`.
    // Let's assume we can fetch checkType.

    // Better: let's query verification_checks to get checkType for these checks
    const checkIds = mappedRuns.map(r => r.checkId);
    let checkTypesMap = new Map<string, string>();
    if (checkIds.length > 0) {
      const checks = await this.db
        .selectFrom('verification_checks')
        .select(['id', 'check_type'])
        .where('id', 'in', checkIds)
        .execute();
      for (const c of checks) {
        checkTypesMap.set(c.id, c.check_type);
      }
    }

    for (const r of mappedRuns) {
      r.checkType = checkTypesMap.get(r.checkId) || 'diagnostic';
    }

    return {
      runs: mappedRuns,
      outcomeState: teamRow.outcome_state,
    };
  }
}
