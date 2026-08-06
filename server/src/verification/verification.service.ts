import { Injectable, Inject, Logger } from '@nestjs/common';
import { DbService } from '../db/db.service';
import {
  SANDBOX_PROVIDER,
  EnvironmentRef,
} from '../sandbox/sandbox.types';
import type { SandboxProvider } from '../sandbox/sandbox.types';
import {
  ROOM_BROADCASTER,
  OutcomeState,
  VerificationRunRecord,
} from './verification.types';
import type { RoomBroadcaster } from './verification.types';

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);

  constructor(
    private readonly db: DbService,
    @Inject(SANDBOX_PROVIDER) private readonly sandbox: SandboxProvider,
    @Inject(ROOM_BROADCASTER) private readonly broadcaster: RoomBroadcaster,
  ) {}

  async submitVerification(
    env: EnvironmentRef,
    teamId: string,
    scenarioVariantId: string,
    triggeredByRosterEntryId: string | null,
  ): Promise<VerificationRunRecord[]> {
    // 1. Fetch checks
    const checks = await this.db
      .selectFrom('verification_checks')
      .selectAll()
      .where('scenario_variant_id', '=', scenarioVariantId)
      .orderBy('sort_order', 'asc')
      .execute();

    const newRuns: VerificationRunRecord[] = [];

    // 2. Sequential execution & immediate broadcast
    for (const check of checks) {
      const abortController = new AbortController();
      let resultStatus: 'pass' | 'fail' | 'resource_limit_exceeded' | 'error' =
        'error';

      const timeoutId = setTimeout(() => {
        abortController.abort();
      }, 30000);

      try {
        const sandboxResult = await this.sandbox.runVerification(
          env,
          check.harness_ref,
          abortController.signal,
        );

        if (sandboxResult.timedOut) {
          resultStatus = 'resource_limit_exceeded';
        } else {
          resultStatus = sandboxResult.exitCode === 0 ? 'pass' : 'fail';
        }
      } catch (err: any) {
        this.logger.error(
          `Sandbox run failed for check ${check.id}: ${err.message}`,
          err.stack,
        );
        resultStatus = err.name === 'AbortError' ? 'error' : 'error';
      } finally {
        clearTimeout(timeoutId);
      }

      // Immediate DB insert
      const runResult = await this.db
        .insertInto('verification_runs')
        .values({
          team_id: teamId,
          verification_check_id: check.id,
          triggered_by_roster_entry_id: triggeredByRosterEntryId,
          result: resultStatus,
          diagnostic_details: JSON.stringify({}),
        })
        .returningAll()
        .executeTakeFirstOrThrow();

      const runRecord: VerificationRunRecord = {
        id: runResult.id,
        teamId: runResult.team_id,
        verificationCheckId: runResult.verification_check_id,
        triggeredByRosterEntryId: runResult.triggered_by_roster_entry_id,
        result: runResult.result as any,
        diagnosticDetails: runResult.diagnostic_details,
        ranAt: runResult.ran_at,
      };

      newRuns.push(runRecord);

      // Immediate broadcast
      this.broadcaster.broadcastVerificationResult(
        teamId,
        runRecord,
        check.check_type as 'full_fix' | 'diagnostic',
      );
    }

    // 3. Atomic Outcome Update (with row lock)
    await this.db.transaction().execute(async (trx) => {
      // Row lock to serialize concurrent submitVerification calls
      await trx
        .selectFrom('teams')
        .select('id')
        .where('id', '=', teamId)
        .forUpdate()
        .executeTakeFirst();

      // Read all runs for this team (which is intrinsically scoped to the session)
      const allRuns = await trx
        .selectFrom('verification_runs')
        .selectAll()
        .where('team_id', '=', teamId)
        .orderBy('ran_at', 'asc')
        .execute();

      const newOutcome = this.deriveOutcomeState(checks, allRuns);

      await trx
        .updateTable('teams')
        .set({ outcome_state: newOutcome })
        .where('id', '=', teamId)
        .execute();
    });

    return newRuns;
  }

  deriveOutcomeState(checks: any[], runs: any[]): OutcomeState {
    const fullFixChecks = checks.filter((c) => c.check_type === 'full_fix');

    // If there are no full fix checks, it cannot be resolved. (Should be a data error).
    if (fullFixChecks.length === 0) return 'in_progress';

    const latestByCheck = new Map<string, any>();
    for (const run of runs) {
      latestByCheck.set(run.verification_check_id, run);
    }

    let allPassed = true;
    for (const check of fullFixChecks) {
      const latestRun = latestByCheck.get(check.id);
      if (!latestRun || latestRun.result !== 'pass') {
        allPassed = false;
        break;
      }
    }

    // Never return 'unresolved' from here, it's set on session expiry
    return allPassed ? 'resolved' : 'in_progress';
  }
}
