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

  private async seedDefaultFiles(envRef: EnvironmentRef) {
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

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/inventory/:itemId', (req, res) => {
  const item = inventory[req.params.itemId];
  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }
  res.json(item);
});

app.post('/checkout', (req, res) => {
  const { itemId, quantity } = req.body;
  
  if (!itemId || typeof quantity !== 'number' || quantity <= 0) {
    return res.status(400).json({ error: 'Invalid checkout payload' });
  }

  const item = inventory[itemId];
  if (!item) {
    return res.status(404).json({ error: 'Item not found' });
  }

  // BUG: Flawed inventory check that allows underflow
  if (true) { // BUGGY CONDITION
    item.stock -= quantity;
    return res.json({
      success: true,
      message: 'Checkout processed',
      remainingStock: item.stock
    });
  }

  return res.status(400).json({
    error: 'Insufficient inventory',
    currentStock: item.stock
  });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(\`OmniCart inventory API running on port \${PORT}\`);
  });
}

module.exports = app;
`,
      );

      await this.sandbox.writeFile(
        envRef,
        'verification/check.js',
        `const assert = require('assert');
const app = require('../src/index');

console.log('Running OmniCart verification check...');
assert(app !== undefined, 'App must export express instance');
console.log('✓ Verification check passed!');
process.exit(0);
`,
      );
    } catch (e) {
      console.warn('[WorkstationService] Error seeding default files:', e);
    }
  }

  private async getEnvironment(teamId: string): Promise<EnvRow> {
    let row = await this.db
      .selectFrom('environment_instances as ei')
      .innerJoin('teams as t', 't.id', 'ei.team_id')
      .innerJoin('sessions as s', 's.id', 't.session_id')
      .select([
        'ei.provider_ref as envId',
        'ei.status as envStatus',
        's.status as sessionStatus',
        's.scenario_variant_id as scenarioVariantId',
      ])
      .where('ei.team_id', '=', teamId)
      .executeTakeFirst();

    if (!row) {
      const team = await this.db
        .selectFrom('teams as t')
        .innerJoin('sessions as s', 's.id', 't.session_id')
        .select(['t.id as teamId', 's.status as sessionStatus', 's.scenario_variant_id as scenarioVariantId'])
        .where('t.id', '=', teamId)
        .executeTakeFirst();

      if (!team || team.sessionStatus !== 'active') {
        throw new ConflictException('ENVIRONMENT_NOT_READY');
      }

      const variant = { image: 'node:22-alpine' as const };
      const limits = { cpuCores: 1, memoryMb: 512, wallClockTimeoutMs: 3600000 };
      const envRef = await this.sandbox.provision(teamId, variant, limits);

      await this.db
        .insertInto('environment_instances')
        .values({
          team_id: teamId,
          provider_ref: envRef.id,
          sandbox_provider: 'gvisor',
          status: 'ready',
        })
        .execute();

      await this.seedDefaultFiles(envRef);

      return {
        envId: envRef.id,
        envStatus: 'ready',
        sessionStatus: team.sessionStatus,
        scenarioVariantId: team.scenarioVariantId,
      };
    }

    if (row.sessionStatus !== 'active') {
      throw new ConflictException('ENVIRONMENT_NOT_READY');
    }

    return row;
  }

  private validatePath(path: string): void {
    const p = String(path || '');
    if (!p || p.includes('..') || p.startsWith('/')) {
      throw new BadRequestException('Invalid path: Directory traversal and leading slashes are not allowed');
    }
  }

  async listFiles(teamId: string): Promise<{ files: FileNode[] }> {
    const row = await this.getEnvironment(teamId);
    try {
      const files = await this.sandbox.listFiles({ id: row.envId });
      return { files };
    } catch (err) {
      // Self-heal if the container was recycled / missing
      const variant = { image: 'node:22-alpine' as const };
      const limits = { cpuCores: 1, memoryMb: 512, wallClockTimeoutMs: 3600000 };
      const newEnv = await this.sandbox.provision(teamId, variant, limits);
      await this.db
        .updateTable('environment_instances')
        .set({ provider_ref: newEnv.id, status: 'ready' })
        .where('team_id', '=', teamId)
        .execute();
      await this.seedDefaultFiles(newEnv);
      const files = await this.sandbox.listFiles(newEnv);
      return { files };
    }
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
    const mappedRuns = runs.map((r) => {
      let diag = {};
      if (r.diagnosticDetails) {
        if (typeof r.diagnosticDetails === 'string') {
          try {
            diag = JSON.parse(r.diagnosticDetails);
          } catch {
            diag = { raw: r.diagnosticDetails };
          }
        } else {
          diag = r.diagnosticDetails;
        }
      }
      return {
        checkId: r.verificationCheckId,
        checkType: 'diagnostic',
        result: r.result,
        diagnosticDetails: diag,
      };
    });
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
