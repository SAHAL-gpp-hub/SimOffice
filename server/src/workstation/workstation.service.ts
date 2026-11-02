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
  effectiveTeamId: string;
}

@Injectable()
export class WorkstationService {
  constructor(
    private readonly db: DbService,
    @Inject(SANDBOX_PROVIDER) private readonly sandbox: SandboxProvider,
    private readonly verificationService: VerificationService,
  ) {}

  private async seedDefaultFiles(envRef: EnvironmentRef, scenarioVariantId?: string, department?: string) {
    try {
      const isFrontend =
        department === 'frontend' ||
        scenarioVariantId?.includes('frontend') ||
        scenarioVariantId?.includes('storefront');

      if (isFrontend) {
        await this.sandbox.writeFile(
          envRef,
          'package.json',
          JSON.stringify(
            {
              name: 'omnicart-storefront-ui',
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
          'src/stores/cartStore.js',
          `class CartStore {
  constructor(initialItems = []) {
    this.items = [...initialItems];
    this.coupon = null;
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notify() {
    for (const listener of this.listeners) {
      listener(this.getState());
    }
  }

  getState() {
    return { items: this.items, coupon: this.coupon };
  }

  addItem(newItem) {
    if (!newItem || !newItem.id) return;
    const existingIndex = this.items.findIndex(i => i.id === newItem.id);
    if (existingIndex >= 0) {
      this.items[existingIndex].quantity = (this.items[existingIndex].quantity || 1) + (newItem.quantity || 1);
    } else {
      // ⚠️ BUG: Direct array mutation violates React state tracking
      this.items.push({ ...newItem, quantity: newItem.quantity || 1 });
    }
    this.notify();
  }

  setCoupon(coupon) {
    this.coupon = coupon;
    this.notify();
  }
}

module.exports = { createCartStore: (items) => new CartStore(items) };
`,
        );

        await this.sandbox.writeFile(
          envRef,
          'src/utils/pricing.js',
          `function calculateSubtotal(items) {
  if (!Array.isArray(items)) return 0;
  return items.reduce((acc, item) => acc + (item.price || 0) * (item.quantity || 1), 0);
}

function applyCoupon(subtotal, discountPercent) {
  if (typeof subtotal !== 'number' || isNaN(subtotal) || subtotal < 0) return 0;
  if (!discountPercent || discountPercent <= 0) return subtotal;
  const validPercent = Math.min(100, Math.max(0, discountPercent));
  // ⚠️ BUG: Float calculation error without rounding to 2-decimal currency cents
  return subtotal - (subtotal * (validPercent / 100));
}

module.exports = { calculateSubtotal, applyCoupon };
`,
        );

        await this.sandbox.writeFile(
          envRef,
          'src/components/CartDrawer.js',
          `const { calculateSubtotal, applyCoupon } = require('../utils/pricing');

class CartDrawerController {
  constructor(cartStore) {
    this.cartStore = cartStore;
    this.cachedTotal = 0;
    this.renderCount = 0;
  }

  computeTotal() {
    this.renderCount++;
    const state = this.cartStore.getState();
    const subtotal = calculateSubtotal(state.items);
    const discount = state.coupon ? (state.coupon.discountPercent || 0) : 0;
    this.cachedTotal = applyCoupon(subtotal, discount);
    return this.cachedTotal;
  }

  isCheckoutEnabled() {
    const total = this.computeTotal();
    return typeof total === 'number' && !isNaN(total) && total > 0;
  }
}

module.exports = { CartDrawerController };
`,
        );

        await this.sandbox.writeFile(
          envRef,
          'src/index.js',
          `const { createCartStore } = require('./stores/cartStore');
const { CartDrawerController } = require('./components/CartDrawer');
const { calculateSubtotal, applyCoupon } = require('./utils/pricing');

const store = createCartStore([
  { id: 'PROD-101', name: 'Ergonomic Mechanical Keyboard', price: 129.99, quantity: 1 },
]);

const drawer = new CartDrawerController(store);

console.log('[OmniCart Storefront] Frontend Cart Service Active.');
module.exports = { store, drawer, calculateSubtotal, applyCoupon };
`,
        );

        await this.sandbox.writeFile(
          envRef,
          'verification/check.js',
          `const assert = require('assert');
const { createCartStore } = require('../src/stores/cartStore');
const { CartDrawerController } = require('../src/components/CartDrawer');
const { applyCoupon } = require('../src/utils/pricing');

console.log('Running OmniCart Storefront verification suite...');

// Check 1: Immutable array updates
const store = createCartStore([{ id: 'P1', price: 10 }]);
const origRef = store.getState().items;
store.addItem({ id: 'P2', price: 20 });
assert.notStrictEqual(origRef, store.getState().items, 'FAIL: Items array must be cloned immutably, not mutated in-place');
console.log('  ✓ Check 1 passed: State immutability preserved.');

// Check 2: Monetary float precision
const total = applyCoupon(29.99, 15);
assert.strictEqual(total, 25.49, 'FAIL: Expected $29.99 with 15% discount to equal $25.49');
console.log('  ✓ Check 2 passed: Accurate monetary float rounding verified.');

// Check 3: Render loop stability
const drawer = new CartDrawerController(store);
for (let i = 0; i < 5; i++) {
  const dTotal = drawer.computeTotal();
  assert.strictEqual(dTotal, 25.49);
}
assert.strictEqual(drawer.isCheckoutEnabled(), true, 'Checkout should be enabled');
console.log('  ✓ Check 3 passed: CartDrawer render lifecycle stable.');

console.log('\\n==================================================');
console.log('✓ ALL OMNICART STOREFRONT CHECKS PASSED SUCCESSFULLY!');
console.log('==================================================');
process.exit(0);
`,
        );
        return;
      }

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

  private async getEnvironment(teamId: string, department: string = 'backend'): Promise<EnvRow> {
    let effectiveTeamId = teamId;
    let targetVariantId: string | undefined;

    if (department === 'frontend') {
      const baseTeam = await this.db
        .selectFrom('teams')
        .select(['session_id'])
        .where('id', '=', teamId)
        .executeTakeFirst();

      if (baseTeam) {
        const feDept = await this.db
          .selectFrom('departments')
          .select('id')
          .where('code', '=', 'frontend')
          .executeTakeFirst();

        if (feDept) {
          let feTeam = await this.db
            .selectFrom('teams')
            .select('id')
            .where('session_id', '=', baseTeam.session_id)
            .where('department_id', '=', feDept.id)
            .executeTakeFirst();

          if (!feTeam) {
            feTeam = await this.db
              .insertInto('teams')
              .values({
                session_id: baseTeam.session_id,
                department_id: feDept.id,
                label: 'frontend Team',
                outcome_state: 'in_progress',
              })
              .returning('id')
              .executeTakeFirstOrThrow();
          }
          effectiveTeamId = feTeam.id;
          targetVariantId = 'fe000000-0000-0000-0000-000000000002';
        }
      }
    }

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
      .where('ei.team_id', '=', effectiveTeamId)
      .executeTakeFirst();

    if (!row) {
      const team = await this.db
        .selectFrom('teams as t')
        .innerJoin('sessions as s', 's.id', 't.session_id')
        .select(['t.id as teamId', 's.status as sessionStatus', 's.scenario_variant_id as scenarioVariantId'])
        .where('t.id', '=', effectiveTeamId)
        .executeTakeFirst();

      if (!team || team.sessionStatus !== 'active') {
        throw new ConflictException('ENVIRONMENT_NOT_READY');
      }

      const variant = { image: 'node:22-alpine' as const };
      const limits = { cpuCores: 1, memoryMb: 512, wallClockTimeoutMs: 3600000 };
      const envRef = await this.sandbox.provision(effectiveTeamId, variant, limits);

      await this.db
        .insertInto('environment_instances')
        .values({
          team_id: effectiveTeamId,
          provider_ref: envRef.id,
          sandbox_provider: 'gvisor',
          status: 'ready',
          resource_limits: JSON.stringify(limits),
        })
        .execute();

      const variantIdToSeed = targetVariantId || (department === 'frontend' ? 'frontend' : team.scenarioVariantId);
      await this.seedDefaultFiles(envRef, variantIdToSeed, department);

      return {
        envId: envRef.id,
        envStatus: 'ready',
        sessionStatus: team.sessionStatus,
        scenarioVariantId: targetVariantId || team.scenarioVariantId,
        effectiveTeamId,
      };
    }

    if (row.sessionStatus !== 'active') {
      throw new ConflictException('ENVIRONMENT_NOT_READY');
    }

    return {
      ...row,
      scenarioVariantId: targetVariantId || row.scenarioVariantId,
      effectiveTeamId,
    };
  }

  private validatePath(path: string): void {
    const p = String(path || '');
    if (!p || p.includes('..') || p.startsWith('/')) {
      throw new BadRequestException('Invalid path: Directory traversal and leading slashes are not allowed');
    }
  }

  async listFiles(teamId: string, department: string = 'backend'): Promise<{ files: FileNode[] }> {
    const row = await this.getEnvironment(teamId, department);
    try {
      const files = await this.sandbox.listFiles({ id: row.envId });
      return { files };
    } catch (err) {
      // Self-heal if the container was recycled / missing
      const variant = { image: 'node:22-alpine' as const };
      const limits = { cpuCores: 1, memoryMb: 512, wallClockTimeoutMs: 3600000 };
      const newEnv = await this.sandbox.provision(row.effectiveTeamId, variant, limits);
      await this.db
        .updateTable('environment_instances')
        .set({ provider_ref: newEnv.id, status: 'ready' })
        .where('team_id', '=', row.effectiveTeamId)
        .execute();
      await this.seedDefaultFiles(newEnv, row.scenarioVariantId, department);
      const files = await this.sandbox.listFiles(newEnv);
      return { files };
    }
  }

  async readFile(teamId: string, path: string, department: string = 'backend'): Promise<{ path: string; content: string }> {
    this.validatePath(path);
    const row = await this.getEnvironment(teamId, department);
    const content = await this.sandbox.readFile({ id: row.envId }, path);
    return { path, content };
  }

  async writeFile(
    teamId: string,
    path: string,
    content: string,
    user: { id: string; sessionId: string },
    department: string = 'backend',
  ): Promise<{ saved: boolean; savedAt: string }> {
    this.validatePath(path);
    // 1MB limit check
    if (Buffer.byteLength(content, 'utf8') > 1024 * 1024) {
      throw new PayloadTooLargeException('File content exceeds 1MB limit');
    }

    const row = await this.getEnvironment(teamId, department);
    await this.sandbox.writeFile({ id: row.envId }, path, content);

    await this.db
      .insertInto('contribution_events')
      .values({
        session_id: user.sessionId,
        team_id: row.effectiveTeamId,
        roster_entry_id: user.id,
        event_type: 'code_edit_saved',
        metadata: JSON.stringify({ path }),
      })
      .execute();

    return { saved: true, savedAt: new Date().toISOString() };
  }

  async runCheck(teamId: string, user: { id: string; sessionId: string }, department: string = 'backend'): Promise<any> {
    const row = await this.getEnvironment(teamId, department);

    await this.db
      .insertInto('contribution_events')
      .values({
        session_id: user.sessionId,
        team_id: row.effectiveTeamId,
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

  async submitVerification(teamId: string, user: { id: string }, department: string = 'backend'): Promise<any> {
    const row = await this.getEnvironment(teamId, department);

    const env: EnvironmentRef = { id: row.envId };
    const runs = await this.verificationService.submitVerification(
      env,
      row.effectiveTeamId,
      row.scenarioVariantId,
      user.id,
    );

    // After submitVerification completes, we must fetch the new outcome state for the team
    const teamRow = await this.db
      .selectFrom('teams')
      .select('outcome_state')
      .where('id', '=', row.effectiveTeamId)
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
