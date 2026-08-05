# SimOffice — Technical Design Document (TDD)
## Pilot Edition

| | |
|---|---|
| **Document type** | Technical Design Document — bridges SAD v1.3's architecture (topology, boundaries, message-level sequences) and API Specification v1.1's contracts (request/response shapes) down to actual implementation-level design: concrete `app-server` module/service breakdown, core algorithms with validated pseudocode, and the handful of decisions SAD v1.3 §19 explicitly left open for exactly this document to resolve. |
| **Scope** | Implementation design for the pilot's `app-server` (NestJS + Colyseus, one process, TSSD v2.1) and, more lightly, the `client` app. Does not re-derive requirements (PRD v3.1), re-decide technology (TSSD v2.1), re-draw component boundaries (SAD v1.3), re-design the schema (DBD v1.1), or re-specify contracts (API Specification v1.1) — all five are fixed inputs here. |
| **Version** | 1.1 |
| **Status** | Ready to implement against. Every algorithm and code sketch in this document has been type-checked against a real TypeScript compiler, not merely hand-written (§12 — Validation Performed). |

> **What changed in v1.1 (full changelog in [Section 16](#16-changelog)):** narrowed `PlayerState.animState` from `string` to GDD §3.3's `AnimState` union.

> **A note on scope, since "Technical Design Document" wasn't a term this project's document suite had used yet:** PRD§22's downstream-document list doesn't name a "Technical Design Document" under that exact title — the closest items are #2 (Security & Isolation Design, substantially covered by SAD §7) and #7 (Sequence Diagrams, covered by SAD §11). This document is written as the conventional next rung in an SDLC document chain below an architecture document: the module/class/algorithm-level design that turns "these components exist and talk to each other this way" (SAD) and "here's the exact contract" (API Spec) into "here's exactly how each piece is built." If this isn't the document you meant, say so and I'll redo it — but this interpretation is stated up front rather than guessed at silently.
>
> **Two items from SAD v1.3 §19's open list are resolved here**, since they're genuinely implementation decisions, not architecture ones: item 4 (verification harness ephemeral-context mechanics — §6 below) and item 5 (abandoned-session inactivity window — §7.2 below). Item 7 (ResourceLimits' exact starting numbers) is correctly *not* resolved here — it depends on real hardware and real student code, not on a design decision this document can make.
>
> **One small wording inconsistency in API Specification v1.1 §3.2 surfaced and is fixed by adoption, not by re-editing that document:** its prose described the roster passcode format as "two dictionary words + 2 digits" but its own example, `WOLF-42`, is one word + 2 digits. §3.3 below adopts the single-word format the example actually shows. Flagged in §13 as a one-line wording fix API Spec v1.1 could pick up later — not substantive enough to warrant a version bump on its own.

---

## Table of Contents

1. [Purpose & Inputs](#1-purpose--inputs)
2. [Module & Service Architecture](#2-module--service-architecture)
3. [Core Algorithms](#3-core-algorithms)
4. [Session Lifecycle — State Machine Implementation](#4-session-lifecycle--state-machine-implementation)
5. [Real-Time Room Implementation (Colyseus)](#5-real-time-room-implementation-colyseus)
6. [Sandbox Provider Implementation](#6-sandbox-provider-implementation)
7. [Scheduled Jobs](#7-scheduled-jobs)
8. [Auth & Token Implementation](#8-auth--token-implementation)
9. [Frontend Module Design](#9-frontend-module-design)
10. [Error Handling & Retry Policy Detail](#10-error-handling--retry-policy-detail)
11. [Validation Performed](#11-validation-performed)
12. [Open Items & Cross-Document Notes](#12-open-items--cross-document-notes)
13. [Traceability Matrix](#13-traceability-matrix)
14. [Sign-off Checklist](#14-sign-off-checklist)
15. [Glossary](#15-glossary)
16. [Changelog](#16-changelog)

---

## 1. Purpose & Inputs

Fixed inputs, not re-litigated here: **PRD v3.1** (requirements), **SAD v1.3** (topology, trust-zone design, sequence diagrams), **TSSD v2.1** (NestJS + Colyseus on one `app-server` process, PostgreSQL 17.x, React + Babylon.js client), **DBD v1.1** (schema), **API Specification v1.1** (REST/WebSocket contracts). Where implementing those contracts required an algorithm, a class design, or a decision none of the five fully pinned down, this document supplies it — and says explicitly when it's making a new decision versus just detailing an existing one.

---

## 2. Module & Service Architecture

SAD v1.3 §18's repository structure sketched module names representatively, not exhaustively. This reconciles that sketch against API Specification v1.1's actual endpoint groups into a complete module list.

| Module | Owns | Key services | Traceability |
|---|---|---|---|
| `AuthModule` | Teacher login, JWT issuance/verification, `TeacherGuard`/`RosterGuard` | `AuthService`, `TokenService` | API Spec §3.1, §2.3 |
| `ClassesModule` | Class CRUD, roster listing | `ClassesService` | API Spec §4.1–§4.2, §4.4 |
| `RosterModule` | `roster_entries` lifecycle: join (lookup-or-create), character customization, deletion requests | `RosterService`, `PasscodeService` | API Spec §3.2–§3.3, §11.1; DBD §3.1, §3.5 |
| `ContentLibraryModule` | Scenario/variant browsing | `ScenarioService` | API Spec §6 |
| `SessionsModule` | Session create/edit/clone/start/end/announcements, team creation, scenario-variant resolution | `SessionsService`, `ScenarioSelectionService`, `SessionStateMachine` | API Spec §5; §3, §4 of this document |
| `EnvironmentsModule` | Workstation file ops, informal check, formal verification | `EnvironmentsService`, `VerificationService` | API Spec §7 |
| `SandboxModule` | `SandboxProvider` interface + `E2BProvider`/`GVisorProvider` | — | SAD §7.1; §6 of this document |
| `ContributionTrackingModule` | Writes to `contribution_events`; debouncing | `ContributionEventService`, `ContributionEventBuffer` | DBD §9; §3.4/§9 of this document — no REST controller of its own, injected into `EnvironmentsModule` and `RoomsModule` |
| `ReportingModule` | Teacher dashboard, hints, debrief (both roles) | `DashboardService`, `DebriefService` | API Spec §8–§9 — paired because both read DBD's `team_debrief_summary`/`student_contribution_summary` views (DBD §10) |
| `RoomsModule` | Colyseus room definitions, gateway wiring | `TeamRoom` | SAD §8; §5 of this document |
| `RetentionModule` | Scheduled anonymization + abandoned-session sweep | `RetentionJob`, `AbandonedSessionSweepJob` | DBD §8; §7 of this document |

**Cross-cutting, not modules of their own:** a global `HttpExceptionFilter` maps every thrown domain error (`InvalidRosterPasscodeError`, `NoEligibleVariantError`, `InvalidStateTransitionError`, etc. — §3–§4 below) to API Specification v1.1 §2.4's error envelope and the correct status code from §13's table, so individual services throw typed domain errors and never construct the HTTP response shape themselves. Request validation (`400 VALIDATION_ERROR`) is handled by DTOs with `class-validator`, checked by a global `ValidationPipe` before a controller method body ever runs.

**`TeamsModule` was deliberately not created as its own module.** Every team-scoped action in API Specification v1.1 (`§5.1`'s team creation, `§8.2`'s hint, `§9.1`'s per-team debrief rows) is either a side effect of a `SessionsModule` action or a read against a view — there is no independent "manage a team" resource surface at Phase 0 scale (single_department mode creates exactly one team per session, automatically). `team_id`-scoped authorization (API Spec §2.3's claim check) is implemented as a shared guard used by `EnvironmentsModule` and `RoomsModule`, not as a module boundary.

---

## 3. Core Algorithms

Every algorithm below was referenced in prose by at least one prior document (DBD, SAD, or API Spec) but none reduced it to an actual, checkable procedure. All are type-checked (§11).

### 3.1 Scenario/variant selection with no-repeat check

Implements API Specification v1.1 §5.1 option B and PRD§11.5.3.

```typescript
export async function resolveScenarioVariant(
  repo: ScenarioVariantRepository,
  classId: string,
  input:
    | { mode: 'explicit'; scenarioVariantId: string }
    | { mode: 'random'; scenarioId: string; difficulty: Difficulty; category: Category },
): Promise<ScenarioVariant> {
  if (input.mode === 'explicit') {
    const variant = await repo.findExplicit(input.scenarioVariantId);
    if (!variant) throw new Error('NOT_FOUND');
    // Explicit selection is NOT checked against the sessions table — a teacher
    // choosing a specific variant may deliberately intend a repeat (e.g. a
    // retake). The no-repeat guarantee applies specifically to the "system
    // picks for me" path, matching PRD§11.5.3's exact wording.
    return variant;
  }

  const [candidates, usedIds] = await Promise.all([
    repo.findCandidates(input.scenarioId, input.difficulty, input.category),
    repo.findUsedVariantIds(classId),
  ]);

  const eligible = candidates.filter((c) => !usedIds.has(c.id));
  if (eligible.length === 0) throw new NoEligibleVariantError();

  // Uniform random pick — not weighted by recency or difficulty spread. Nothing
  // in PRD requires a smarter policy at Phase 0's one-scenario content scale.
  return eligible[Math.floor(Math.random() * eligible.length)];
}
```

### 3.2 Roster join (lookup-or-create)

Implements API Specification v1.1 §3.2 and DBD v1.1 §3.1's persistent-identity fix.

```typescript
export async function joinOrCreateRosterEntry(
  repo: RosterEntryRepository,
  hasher: PasscodeHasher,
  generator: PasscodeGenerator,
  classId: string,
  displayName: string,
  providedPasscode: string | undefined,
): Promise<JoinResult> {
  if (providedPasscode) {
    const hash = await hasher.hash(providedPasscode);
    const existing = await repo.findByClassAndPasscodeHash(classId, hash);
    if (!existing) throw new InvalidRosterPasscodeError();
    await repo.updateDisplayNameAndLastSeen(existing.id, displayName);
    return { rosterEntry: existing, rosterPasscode: providedPasscode, created: false };
  }

  // No passcode => always a new roster entry. Covers both a genuine first-time
  // student and a student deliberately starting fresh after losing a passcode —
  // API Spec v1.1 §3.2's explicit design choice, not an oversight here.
  const newPasscode = generator.generate();
  const hash = await hasher.hash(newPasscode);
  const created = await repo.create(classId, displayName, hash);
  return { rosterEntry: created, rosterPasscode: newPasscode, created: true };
}
```

`PasscodeHasher` wraps `bcrypt` (cost factor 10 — pilot-appropriate; this is a low-stakes, non-financial credential guarding classroom identity, not a bank login, so bcrypt's default work factor is sufficient without needing Argon2id's extra tuning surface).

### 3.3 Passcode generation

New design decision in this document — API Spec v1.1 §3.2 gave the example (`WOLF-42`) but not the generation mechanism.

```typescript
const WORD_LIST = ['WOLF', 'HAWK', 'BEAR', 'LYNX', /* ...64 total */] as const;
// Deliberately excludes homophones and words sharing a first syllable, so a
// student reading it aloud or copying it by hand doesn't introduce silent errors.

export function generateCandidate(): string {
  const word = WORD_LIST[Math.floor(Math.random() * WORD_LIST.length)];
  const digits = String(Math.floor(Math.random() * 100)).padStart(2, '0');
  return `${word}-${digits}`;
}

export async function generateUniquePasscode(
  checker: PasscodeExistsChecker,
  classId: string,
  maxAttempts = 5,
): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const candidate = generateCandidate();
    if (!(await checker.existsInClass(classId, candidate))) return candidate;
  }
  // 5 failed attempts against a 6,400-combination space scoped to one class is a
  // strong signal something else is broken (e.g. the checker always returns
  // true) — fails loudly rather than silently returning a colliding code.
  throw new Error('PASSCODE_GENERATION_EXHAUSTED');
}
```

**Collision math, honestly stated:** 64 words × 100 digit-pairs = 6,400 combinations, scoped per class. For a 60-student class, first-attempt collision probability is roughly 1-in-4 by the birthday-paradox approximation — non-trivial, which is exactly why generation is a retry loop and not a single generate-and-hope call, not because collisions are rare enough to ignore.

### 3.4 Verification submission & outcome derivation

Implements API Specification v1.1 §7.5 and DBD v1.1 §3.3's fix.

```typescript
export async function submitVerification(
  provider: SandboxProvider,
  checkRepo: VerificationCheckRepository,
  runWriter: VerificationRunWriter,
  outcomeWriter: TeamOutcomeWriter,
  broadcaster: RoomBroadcaster,
  env: EnvironmentRef,
  teamId: string,
  scenarioVariantId: string,
  triggeredByRosterEntryId: string,
): Promise<VerificationRunRecord[]> {
  const checks = await checkRepo.findByScenarioVariant(scenarioVariantId);
  const runs: VerificationRunRecord[] = [];

  // Sequential, not parallel — checks share one environment instance (SAD §8.1's
  // 1:1 team:sandbox mapping), and concurrent verification calls against the
  // same sandbox risk resource contention against the same ResourceLimits
  // ceiling (SAD §7.4) and muddy which check a resource_limit_exceeded belongs
  // to. Broadcasting per-check as each completes (not batched) is what actually
  // delivers per-check responsiveness — sequential execution costs a slightly
  // slower final aggregate, not a slower perceived first result.
  for (const check of checks) {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('VERIFICATION_TIMEOUT')), 30000)
    );
    const result = await Promise.race([
      provider.runVerification(env, check.harnessRef),
      timeout
    ]);
    const run = await runWriter.insert({ teamId, verificationCheckId: check.id, triggeredByRosterEntryId, result: result.result });
    broadcaster.broadcastVerificationResult(teamId, run, check.checkType);
    runs.push(run);
  }

  const outcome = deriveOutcomeState(checks, runs);
  await outcomeWriter.setOutcomeState(teamId, outcome);
  return runs;
}

// DBD v1.1 §3.3: outcome reflects full_fix-type checks specifically — a
// diagnostic check passing never resolves a team on its own. Generalizes
// correctly to Phase 2's layered incidents (multiple full_fix checks, one per
// issue_ordinal) without changing: resolved means every full_fix check passed.
export function deriveOutcomeState(checks: VerificationCheck[], runs: VerificationRunRecord[]): OutcomeState {
  const fullFixCheckIds = checks.filter((c) => c.checkType === 'full_fix').map((c) => c.id);
  if (fullFixCheckIds.length === 0) return 'in_progress'; // content-authoring error; should never reach here past the review gate (PRD§11.5.2)

  const latestByCheck = new Map<string, VerificationRunRecord>();
  for (const run of runs) latestByCheck.set(run.verificationCheckId, run);

  const allPassed = fullFixCheckIds.every((id) => latestByCheck.get(id)?.result === 'pass');
  return allPassed ? 'resolved' : 'in_progress';
  // 'unresolved' is never set here — only at session end (API Spec v1.1 §5.7),
  // the one place PRD§13.3 requires distinguishing "still working" from "session
  // ended without a fix." Setting it on a mid-session failed attempt would
  // incorrectly foreclose a team still actively working.
}
```

### 3.5 Root-cause / fix attribution

New content in this document — DBD v1.1 §9 and API Specification v1.1 §7.3 both referenced "computed retrospectively by correlating timestamps" without specifying how. Deliberately **not** stored as a column anywhere (no `fixing_edit_id` FK in DBD) — this is a read-time computation over `contribution_events` + `verification_runs`, consistent with DBD's views-over-stored-aggregates preference (DBD §10).

```typescript
export function computeFixAttribution(
  passingRun: VerificationRunRecord,
  precedingEdits: CodeEditEvent[], // pre-filtered: same team, occurredAt <= passingRun.ranAt
): FixAttribution | null {
  if (passingRun.result !== 'pass') return null;
  if (precedingEdits.length === 0) return { rosterEntryId: '', attributedEdits: [], confidence: 'no_edits_found' };

  const sortedByTime = [...precedingEdits].sort((a, b) => a.occurredAt.getTime() - b.occurredAt.getTime());
  const lastEditBeforePass = sortedByTime[sortedByTime.length - 1];
  const distinctEditors = new Set(precedingEdits.map((e) => e.rosterEntryId));

  return {
    rosterEntryId: lastEditBeforePass.rosterEntryId,
    attributedEdits: sortedByTime,
    confidence: distinctEditors.size === 1 ? 'single_editor' : 'last_editor_before_pass',
  };
}
```

The `confidence` field matters for how the debrief presents this — PRD§12.9 frames contribution as a supportive signal, not a forensic claim, so a `last_editor_before_pass` result (several students touched the file; one happened to save last) should render as "contributed to the fix," while `single_editor` can render more directly.

---

## 4. Session Lifecycle — State Machine Implementation

SAD v1.3 §10's diagram specifies valid states and edges; this specifies exactly what triggers each edge and what must be true for it to fire — what `SessionsService` actually needs.

```typescript
export function applySessionTransition(current: SessionStatus, trigger: SessionTrigger): TransitionResult {
  switch (trigger.type) {
    case 'START':
      // Team/room already exist from CREATE (API Spec v1.1 §5.1's lobby-timing
      // fix) — START only kicks off environment provisioning.
      if (current !== 'created') throw new InvalidStateTransitionError(current, trigger.type);
      return { nextStatus: 'provisioning' };

    case 'ENVIRONMENTS_READY':
      if (current !== 'provisioning') throw new InvalidStateTransitionError(current, trigger.type);
      return { nextStatus: 'active' };

    case 'TIME_LIMIT_REACHED':
      if (current !== 'active') throw new InvalidStateTransitionError(current, trigger.type);
      return { nextStatus: 'ended', endReason: 'time_limit_reached' };

    case 'TEACHER_ENDS_EARLY':
      // Deliberately allowed from 'created' and 'provisioning' too, not just
      // 'active' — a teacher who starts a session and immediately regrets it
      // needs a way out before environments are even ready. This generalizes
      // SAD v1.3 §11.5's active-only diagram without contradicting it: every one
      // of these paths still routes through the same teardown handler.
      if (!['created', 'provisioning', 'active'].includes(current)) throw new InvalidStateTransitionError(current, trigger.type);
      return { nextStatus: 'ended', endReason: 'teacher_ended_early' };

    case 'ALL_TEAMS_RESOLVED':
      if (current !== 'active') throw new InvalidStateTransitionError(current, trigger.type);
      return { nextStatus: 'ended', endReason: 'all_teams_resolved' };

    case 'ABANDONED_TIMEOUT':
      // Fires only from 'active' — a lobby nobody ever starts is a cheaper,
      // separately-handled case (§7.2): no environments were ever provisioned,
      // so nothing expensive is idling.
      if (current !== 'active') throw new InvalidStateTransitionError(current, trigger.type);
      return { nextStatus: 'ended', endReason: 'abandoned_timeout' };

    case 'DEBRIEF_ACKNOWLEDGED':
      if (current !== 'ended') throw new InvalidStateTransitionError(current, trigger.type);
      return { nextStatus: 'debriefed' };

    case 'TEARDOWN_COMPLETE':
      // Reachable from 'ended' directly, not only 'debriefed' — teardown fires
      // unconditionally at end (API Spec v1.1 §5.7's guarantee), independent of
      // whether anyone ever opens the debrief screen.
      if (!['ended', 'debriefed'].includes(current)) throw new InvalidStateTransitionError(current, trigger.type);
      return { nextStatus: 'torn_down' };

    case 'CREATE':
      throw new InvalidStateTransitionError(current, trigger.type); // produces the initial row; never a transition target
  }
}
```

A failed guard throws `InvalidStateTransitionError`, which the global exception filter (§2) maps directly to API Specification v1.1 §13's `409 INVALID_STATE_TRANSITION` — the service layer never has to know about HTTP status codes.

---

## 5. Real-Time Room Implementation (Colyseus)

SAD v1.3 §8.2's `TeamRoomState`/`PlayerState` schema is reused verbatim; this adds the message-handler-level detail neither SAD nor API Spec fully pseudocoded.

```typescript
export class TeamRoom extends Room<TeamRoomState> {
  private desks: DeskRegistry;
  private events: ContributionEventWriter;

  onCreate(): void {
    this.setState(new TeamRoomState());

    this.onMessage<{ deskId: string }>('sitAtDesk', (client, { deskId }) => this.handleSitAtDesk(client, deskId));
    this.onMessage('standUp', (client) => this.handleStandUp(client));

    this.onMessage<{ channel: string; message: string }>('sendChat', (client, payload) => {
      const player = this.state.players.get(client.sessionId);
      if (!player) return;
      void this.events.writeChatMessage(player.rosterEntryId, payload.channel, payload.message);
      this.broadcast('chatPosted', { rosterEntryId: player.rosterEntryId, ...payload });
    });

    // sendPing / useEmote follow the identical shape: look up player, write the
    // matching DBD §9 contribution event, broadcast. Omitted here for brevity —
    // structurally identical to sendChat above.
  }

  // API Spec v1.1 §10.3: "first valid call wins." Implemented as a synchronous
  // check-then-set against an in-memory desk registry — a single Colyseus room's
  // message handlers run one at a time on one event-loop turn each, so there is
  // no async gap between checking occupancy and claiming the desk for a second
  // client's message to interleave into. This is what makes "first wins"
  // actually deterministic, not a race that happens to usually work.
  private handleSitAtDesk(client: Client, deskId: string): void {
    const player = this.state.players.get(client.sessionId);
    if (!player || !player.connected) return;

    const occupant = this.desks.occupiedDesks.get(deskId);
    if (occupant && occupant !== player.rosterEntryId) {
      this.sendError(client, 'DESK_OCCUPIED', { nearestFreeDeskId: this.desks.nearestFreeDesk(deskId) });
      return;
    }

    if (player.deskId) this.desks.occupiedDesks.delete(player.deskId);
    this.desks.occupiedDesks.set(deskId, player.rosterEntryId);
    player.deskId = deskId;
    player.seated = true;
    void this.events.writeDeskSeated(player.rosterEntryId, deskId);
  }

  onLeave(client: Client, consented: boolean): void {
    const player = this.state.players.get(client.sessionId);
    if (!player) return;
    player.connected = false; // API Spec v1.1 §10.5: desk NOT freed on an
    // unintentional drop — only on explicit standUp or a consented leave — so a
    // reconnecting student finds their workstation exactly as they left it.
    if (consented) {
      void this.events.writeSessionLeft(player.rosterEntryId);
      if (player.seated) this.desks.occupiedDesks.delete(player.deskId);
    }
  }
}
```

**Room lifecycle tied to the v1.3 lobby-timing fix:** `onCreate` runs at session creation (SAD v1.3 §11.1), before any environment exists. `TeamRoomState` carries an internal `environmentReady` flag (not schema-synced as a field — it changes exactly once per session and is reflected client-side as a workstation-enabled/disabled visual state instead, avoiding per-field sync overhead for something that isn't actually a per-tick-changing value). `sitAtDesk` succeeds during the lobby phase (the desk claim itself is just presence), but the workstation *content* (file read/write, run-check, submit-verification — `EnvironmentsModule`, not `RoomsModule`) independently checks environment readiness via API Specification v1.1's `409 ENVIRONMENT_NOT_READY`, which is a REST-layer check, not a room-layer one.

---

## 6. Sandbox Provider Implementation

**Resolves SAD v1.3 §19 open item 4.** SAD §7.3 described two plausible mechanisms per provider, connected by "or" — correct for an architecture document, which stops at "these are the plausible shapes." This is where "and here's the one we're building" gets decided.

### 6.1 `E2BProvider`

**Decision: a second, separate E2B sandbox session** for `runVerification`, not a scoped exec call within the student's existing session.

**Reasoning:** E2B's session boundary is also its filesystem boundary. A scoped exec call within the *same* session shares that session's filesystem handle, reintroducing exactly the shared-context risk the injection-over-mount principle (SAD §7.2) exists to eliminate. A second session costs a few hundred milliseconds of extra startup latency per verification call versus an in-session exec — an explicit, accepted tradeoff for keeping the trust-zone boundary a real session boundary, not a same-process scoping convention a future refactor could accidentally weaken.

```
runVerification(env, harnessRef):
  1. snapshot the student's /workspace from env's existing session
  2. open a brand-new E2B sandbox session (fresh sessionId, not derived from env's)
  3. copy the snapshot + the harness into the new session
  4. execute the harness inside the new session
  5. destroy the new session unconditionally (try/finally — including on error)
  6. return the result; the new session's identity is never exposed to the student-facing API
```

### 6.2 `GVisorProvider`

**Decision: a second, short-lived container**, launched by `sandbox-orchestrator` (never `app-server` directly — SAD §13's Docker-socket privilege isolation), sharing a **read-only** bind mount of a filesystem-level snapshot of `/workspace`.

**Reasoning:** a fresh container gets its own `runsc`-enforced kernel-level isolation boundary — the same boundary already protecting the student's own environment from the host — rather than reusing any part of the student's running container's namespace. Read-only, specifically: the harness must never be able to mutate the student's actual `/workspace`, only observe a point-in-time copy. The snapshot is filesystem-level, not a live mount, so the harness can't race a concurrent student edit mid-run.

```
runVerification(env, harnessRef):
  1. request sandbox-orchestrator to snapshot the student's /workspace volume
  2. sandbox-orchestrator launches a fresh runsc container: snapshot mounted
     read-only, harness copied in fresh each run (never baked into a reused
     image, so a harness content update doesn't require an image rebuild)
  3. container runs the harness against the read-only snapshot
  4. sandbox-orchestrator destroys the container unconditionally
  5. result relayed to app-server over the internal API (SAD §4) — app-server
     never touches the Docker socket for this, per §13's privilege-isolation rule
```

---

## 7. Scheduled Jobs

Both jobs run via `@nestjs/schedule`'s cron decorators inside the single `app-server` process (TSSD v2.1) — no cross-instance coordination needed at pilot scale, which is simpler than the general case and worth stating explicitly as a pilot-scale simplification, not an oversight.

### 7.1 Retention job

Implements DBD v1.1 §8.1's `anonymize_expired_contribution_events` function as a scheduled caller, not a change to that function itself.

```typescript
@Cron('0 3 * * *') // 03:00 server time, daily — low-traffic hour for a
// classroom-hours pilot deployment
async runRetentionSweep(): Promise<void> {
  const affected = await this.db.query('SELECT anonymize_expired_contribution_events($1)', [this.retentionDays]);
  this.logger.log(`Retention sweep anonymized ${affected} contribution_events rows`);
}
```

### 7.2 Abandoned-session sweep — resolves SAD v1.3 §19 open item 5

**Decision: 20 minutes of no room activity, checked every 5 minutes, applies only to `active` sessions.**

**Reasoning:** a session sitting `active` for 20 straight minutes with zero room activity across every team's room (no chat, no movement, no desk interaction, no verification attempt) most plausibly means the class period ended or everyone left — not that students are in a silent, motionless 20-minute deep-focus state in a live multiplayer classroom exercise, which PRD's own framing (collaborative, chat-driven, PRD§12.6) makes implausible as sustained normal behavior. 20 minutes is long enough not to fire during a legitimately quiet stretch (reading a long log file, thinking through a bug) but short enough that environments aren't left provisioned for an entire unattended class period, wasting the single VPS's resources for no one (TSSD v2.1 §5.1's cost-consciousness).

```typescript
@Cron('*/5 * * * *')
async sweepAbandonedSessions(): Promise<void> {
  const activeSessions = await this.sessionsRepo.findByStatus('active');
  for (const session of activeSessions) {
    const lastActivity = this.roomActivityTracker.getLastActivityAt(session.id); // in-memory, per RoomsModule
    const referenceTime = lastActivity ?? session.activatedAt ?? session.createdAt;
    if (Date.now() - referenceTime.getTime() > 20 * 60 * 1000) {
      await this.sessionsService.endSession(session.id, 'abandoned_timeout'); // routes through the same
      // teardown handler as a teacher-initiated end (API Spec v1.1 §5.7) — no
      // separate teardown code path for this case.
    }
  }
}
```

`lastActivityAt` is updated by `RoomsModule` on every `onMessage`/`onJoin` across every room — an in-memory `Map<sessionId, Date>` is sufficient at pilot scale (single process, no restart-survival requirement for this specific tracker, since a process restart mid-abandonment just means the 20-minute window restarts too, an acceptable edge case).

**A lobby nobody ever starts is not handled by this job.** A session sitting in `created`/`provisioning` indefinitely has no provisioned environment consuming resources — there's nothing expensive to reclaim, so it's left alone rather than adding a second timeout policy for a case that doesn't cost anything while idle.

---

## 8. Auth & Token Implementation

Both token types (API Specification v1.1 §2.3) are HS256-signed JWTs, sharing one signing secret from `.env` (SAD v1.3 §13's secrets-handling note) — HS256 rather than RS256 because there is exactly one token issuer and one verifier (`app-server` itself, one process), so asymmetric signing buys nothing at this scale and only adds key-management surface.

| Claim | Teacher token | Roster token |
|---|---|---|
| `sub` | `accountId` | `rosterEntryId` |
| `role` | `"teacher"` | `"student"` |
| `sessionId` | — | present |
| `teamId` | — | present |
| `exp` | long-lived (API Spec §2.3) | short-lived, session-scoped |

`TeacherGuard` and `RosterGuard` (NestJS guards, one per role) verify the signature, check `role`, and — for `RosterGuard` on any `EnvironmentsModule`/`RoomsModule` route — additionally check the token's `teamId` claim against the resource's owning team (API Spec §2.3's per-team isolation enforced at the API layer). A guard failure throws NestJS's standard `UnauthorizedException`/`ForbiddenException`, mapped by the global exception filter to `401 UNAUTHENTICATED`/`403 FORBIDDEN`.

---

## 9. Frontend Module Design

**New decision in this document: `Zustand` for the small amount of state that isn't already owned elsewhere**, not React Context, not Redux. Never decided by TSSD v2.1 (which fixed React as the framework but not a state management approach) or SAD v1.3 §12 (which described the React-shell/Babylon-engine split but not internal state management).

**Reasoning:** most state in this client doesn't need a dedicated state-management layer at all — Colyseus's `colyseus.js` client already provides an observable, auto-syncing mirror of `TeamRoomState`/`PlayerState` (SAD §8.2) the moment a room is joined, and Babylon.js scene state (camera, meshes, animation) lives in Babylon's own scene graph, not in application state. What's left over — which screen the React shell is on (login/join/lobby/debrief), the in-progress character-creation form, transient UI flags like "is the workstation overlay open" — is a genuinely small surface. React Context re-renders every consumer on every change, which is a poor fit even for small, frequently-updated UI flags (the workstation overlay toggling shouldn't re-render the whole shell tree); Redux's boilerplate is disproportionate to this small a surface. Zustand gives selective subscription (only the components that read a given slice re-render) with close to zero setup cost — an appropriately lightweight choice matching this whole document suite's repeated "don't reach for infrastructure heavier than the pilot's actual scale needs" pattern.

| Module (`apps/client/src/`) | Owns | State source |
|---|---|---|
| `shell/` | Login, join, character creation, dashboard, debrief (React) | Zustand (UI/navigation state) + REST API responses (React Query or plain fetch + local state — not fixed further here, a low-risk implementation detail) |
| `engine/entry/` | Babylon.js exterior scene, entry camera path (GDD§4.2), access panel DOM anchor, door animations (AWDD§5.3) | `AppState` machine (see below) |
| `engine/scene/` | Babylon.js world, avatar movement/physics | Babylon scene graph |
| `engine/multiplayer/` | `colyseus.js` client, room connection, state-sync subscriptions | Colyseus's own observable state (SAD§8.2) |
| `engine/workstation/` | The diegetic code-editor overlay (SAD §12's "deliberately blurred" layer) | Zustand (open/closed, active file) + REST calls to `EnvironmentsModule` endpoints |
| `api/` | Typed REST client matching API Specification v1.1 | — |
| `input/` | The single input-mapping layer (SAD §12, PRD§9.6 accessibility) | — |

### 9.1 Two-Phase Engine Initialization (new in v1.2)

The Babylon.js engine initializes in two distinct phases, never as a single monolithic startup, to support the pre-auth exterior scene (PRD§10.4, AWDD§4.0).

**Phase 1 — `initEntryScene()` (at page load, before auth):**
- Creates the Babylon.js engine on the full-viewport canvas.
- Loads the exterior asset bundle (AWDD§4.0): facade, entrance doors, access panel terminal housing, signage, interior-light-spill plane.
- Positions the scripted entry camera at GDD§4.2's start position (15–20m in front of the entrance).
- Starts the render loop.
- Registers `AppState` subscriber to react to auth-success and auth-failure signals from the React Shell.
- **Does not load Lobby or Backend Room assets.** Those stream during Phase 2, concurrently with the entry camera fly-through.

**Phase 2 — `initGameWorld()` (triggered on `Auth-success`):**
- Triggered by the `AppState` machine's `Auth-success` event while Phase 1's render loop is still running.
- Begins loading Lobby and Backend Room assets in the background.
- Simultaneously starts the entry camera fly-through (GDD§4.2: 2s, straight-Z advance, ease-in-out).
- On fly-through completion, spawns the player character at the Lobby spawn point (AWDD§4.1) and switches from the scripted entry camera to the GDD§4 spring-arm follow camera.
- Joins the Colyseus room.
- The exterior scene assets are **retained** in the engine's asset cache (not unloaded) for potential backward navigation; they are not re-loaded on the next visit to the entrance.

**AppState machine:**

```typescript
type AppState =
  | { phase: 'entry-scene' }     // Phase 1: exterior rendered, no auth yet
  | { phase: 'authenticating' }  // User submitted form; await server response
  | { phase: 'world-loading' }   // Auth-success; fly-through running; Lobby/BERoom streaming
  | { phase: 'in-lobby' }        // Fly-through complete; character spawned; follow camera active
  | { phase: 'auth-failed'; reason: string }; // Server rejected; form re-enabled
```

**State transitions:**

| From | Event | To | Engine action |
|---|---|---|---|
| `entry-scene` | Form submitted | `authenticating` | Disable form, begin `Authenticating` LED pulse (AWDD§5.4), crack doors (~20% open, AWDD§5.3) |
| `authenticating` | Server returns 200 | `world-loading` | Call `initGameWorld()`: start fly-through (GDD§4.2), stream Lobby assets, open doors fully |
| `authenticating` | Server returns 4xx/5xx | `auth-failed` | Close doors, red LED flash (AWDD§5.4), re-enable form, surface error message in access panel |
| `auth-failed` | User edits form | `entry-scene` | Reset LED to steady glow |
| `world-loading` | Fly-through completes | `in-lobby` | Spawn character, switch to GDD§4 follow camera, dismiss access panel DOM element |

**Reduced-motion path:** If `prefers-reduced-motion: reduce` or if the device is detected as Tier 0 sustaining <30fps during Phase 1's render loop, the `world-loading → in-lobby` transition skips `initGameWorld()`'s fly-through: doors snap open, `AppState` jumps directly to `in-lobby` from `authenticating`'s success branch, character spawns at Lobby position, follow camera initializes at GDD§4.2's end position. The `initGameWorld()` function accepts a `{ skipFlythrough: boolean }` option to support this cleanly without branching in the state machine itself.

**WebGL unavailable fallback:** If WebGL is unavailable, `initEntryScene()` detects this before creating the Babylon.js engine and sets a `webglUnavailable: true` flag in Zustand. The React Shell renders a static-image fallback (a `<img>` of the building exterior) instead of the canvas, and the access panel form renders as a plain 2D card. `initGameWorld()` is never called. No 3D world is loaded; the auth flow still completes; the user is delivered to a 2D fallback UI (PRD§10.4's WebGL fallback requirement).

---

## 10. Error Handling & Retry Policy Detail

Adds concrete numbers to SAD v1.3 §14's patterns, which described the mechanisms without pinning specific retry counts or backoff.

**Sandbox Provider provisioning retry** (implements API Specification v1.1 §5.4's "retried once server-side"):

```typescript
const attempts = [0, 2000]; // immediate attempt, then one retry after a fixed 2s delay
```

Fixed delay, not exponential — there's at most one retry, so there's no sequence to back off exponentially *along*; a short fixed delay is enough to ride out a transient provider hiccup (a brief API rate-limit, a container runtime momentarily busy) without meaningfully lengthening a teacher's wait on session start. Every team's environment provisions independently and concurrently (`Promise.all` over teams, each with its own retry) — one team's failure after its own retry does not block or roll back another team's successful provisioning, matching API Spec §5.4's "partial failure... reported per-team" at the implementation level.

**Contribution event debouncing** (implements DBD v1.1 §9's volume note and API Specification v1.1 §7.3, neither of which specified a mechanism): server-side, not client-trusted — a client is easy to bypass (a modified frontend, or simply a bug), and the volume concern is specifically about what lands in Postgres, which only a server-side guarantee ensures regardless of client behavior.

```typescript
class ContributionEventBuffer {
  private pending = new Map<string, PendingEdit>(); // keyed by rosterEntryId:filePath —
  // editing two files concurrently doesn't suppress either one's event; rapid
  // saves to the *same* file collapse into one write.
  private readonly maxWait = 8000;

  constructor(private readonly writer: ContributionEventWriter) {}

  recordEdit(rosterEntryId: string, environmentInstanceId: string, filePath: string): void {
    const key = `${rosterEntryId}:${filePath}`;
    const existing = this.pending.get(key);
    const now = Date.now();
    const firstActivity = existing ? existing.firstActivity : now;

    if (existing) {
      clearTimeout(existing.timer);
      if (now - firstActivity >= this.maxWait) {
        this.pending.delete(key);
        void this.writer.insertCodeEditEvent(rosterEntryId, environmentInstanceId, filePath);
        return;
      }
    }

    const timer = setTimeout(() => {
      this.pending.delete(key);
      void this.writer.insertCodeEditEvent(rosterEntryId, environmentInstanceId, filePath);
    }, 4000); // a few seconds — long enough to collapse an autosave-per-keystroke
    // pattern into one event per real pause in typing, short enough not to lose
    // meaningful granularity within PRD§8.2's few-second Beginner-tier check cycle
    this.pending.set(key, { rosterEntryId, environmentInstanceId, filePath, timer, firstActivity });
  }

  // Called from the session-end teardown path (API Spec v1.1 §5.7) so a save
  // just before session end isn't silently dropped by a timer that never fires
  // because the process is about to discard this buffer.
  flushAll(): void { /* clears every pending timer and writes immediately */ }
}
```

---

## 11. Validation Performed

Every code sketch in §3–§6 above was written as real TypeScript (nine files, ~450 lines) and type-checked with `tsc --noEmit` under `strict: true`, `experimentalDecorators: true` — the same decorator configuration a real NestJS/Colyseus project actually requires, not a loose approximation. This caught real issues before they reached this document:

1. **Colyseus's `@type()` schema decorators require `experimentalDecorators: true`** — the first validation pass, run under TypeScript's newer standard-decorators mode (the default), failed with 15 genuine type errors on every `@type(...)` annotation. This wasn't a trivial fix-the-typo catch — it's the exact kind of tsconfig detail that silently breaks a Colyseus schema class if a project's TypeScript config doesn't set it, confirmed here rather than assumed.
2. **Every exported function signature, thrown-error type, and interface across the nine files type-checks against a shared `types.ts`** mirroring DBD v1.1's actual columns — meaning the pseudocode's data shapes are consistent with the real schema, not just internally self-consistent.
3. **The session state machine's `switch` statement is exhaustive** against `SessionTrigger`'s full union (checked by `strict` mode's exhaustiveness behavior on discriminated unions) — every trigger type has a handled case; none was silently missed.
4. The Colyseus room design was checked against local stubs mirroring the real `colyseus`/`@colyseus/schema` package shapes (not the real packages themselves, to avoid a full dependency install for a design document) — sufficient to confirm the room's internal logic (message handler wiring, state mutation, the desk-conflict synchronous check-then-set) is structurally sound; the actual implementation still needs to compile against the real packages at build time, same as any other design-stage sketch.

---

## 12. Open Items & Cross-Document Notes

1. **API Specification v1.1 §3.2 wording fix** (front-matter): "two dictionary words + 2 digits" should read "one dictionary word + 2 digits" to match its own `WOLF-42` example, which §3.3 above adopts as the actual format. A one-line prose fix, not a contract change — nothing consuming that endpoint would build anything different from the corrected wording than from the example alone.
2. **`@nestjs/schedule`'s single-process cron model** (§7) is a pilot-scale simplification — if `app-server` is ever horizontally scaled (SAD v1.3 §17's Production seam), both scheduled jobs need a leader-election or distributed-lock mechanism to avoid double execution across instances. Not needed at pilot scale (one process); flagged so it isn't silently forgotten when that seam is exercised.
3. **`EnvironmentsModule`'s `409 ENVIRONMENT_NOT_READY` check and `RoomsModule`'s `environmentReady` flag are two separate mechanisms answering the same question** (is the environment usable yet) — deliberately not unified into one shared source of truth in this pass, since they're read by two different layers (a REST guard vs. a room-state field) that would otherwise need a shared cache invalidation story. Low-risk to leave as two independently-correct checks at pilot scale; worth revisiting if they're ever observed to disagree in practice.
4. **Frontend API-response caching/data-fetching library** (§9 table) is explicitly left unfixed — React Query is a reasonable, common default, but nothing in this pilot's scale makes plain `fetch` + local state clearly wrong either. Lower-stakes than the state-management decision (§9), which does need a real answer up front because it affects component structure broadly; this one can be decided during implementation without architectural consequence.

---

## 13. Traceability Matrix

| Requirement / prior decision | Where resolved in this document |
|---|---|
| PRD§11.5.3 — no repeated incident | §3.1 |
| PRD§15.1/DBD§3.1 — persistent roster identity mechanism | §3.2, §3.3 |
| PRD§8.3/DBD§3.3 — partial credit, outcome derivation | §3.4 |
| PRD§12.9 — contribution/attribution | §3.5, §10 |
| SAD§10 — session lifecycle | §4 |
| API Spec§10.3 — desk-conflict resolution | §5 |
| API Spec§5.1 — lobby-timing fix, room/environment lifecycle split | §5's lifecycle note |
| **SAD§19 item 4** — verification ephemeral-context mechanics | **§6 — resolved** |
| **SAD§19 item 5** — abandoned-session inactivity window | **§7.2 — resolved** |
| SAD§19 item 7 — ResourceLimits exact values | Correctly still open — depends on real hardware/student code, not a design decision |
| API Spec§2.3 — token claims, per-team isolation | §8 |
| TSSD v2.1 — React framework fixed, state management not | §9 — resolved (Zustand) |
| API Spec§5.4 — provisioning retry | §10 |
| DBD§9 — contribution event volume note | §10 |
| PRD§10.4, GDD§4.2, AWDD§4.0, SAD§12 — two-phase engine init, pre-auth exterior scene | §9.1 — resolved (`AppState` machine, `initEntryScene` / `initGameWorld`) |

---

## 14. Sign-off Checklist

- [ ] Nine validation files (§11) migrated into the real `apps/server` project structure against the actual `colyseus`, `@colyseus/schema`, and `@nestjs/*` packages — this document's local stubs and dependency-free types were a design-time check, not a substitute for compiling against the real packages.
- [ ] `experimentalDecorators`/`emitDecoratorMetadata` confirmed set in the real project's `tsconfig.json` before any `@type()`-decorated schema class is written (§11 item 1).
- [ ] Word list (§3.3) reviewed by a second person for any missed homophone/confusable pairs before shipping — a design-time list, not exhaustively vetted here.
- [x] API Specification v1.1 §3.2's wording corrected per §12 item 1, whenever that document is next touched.
- [ ] 20-minute abandoned-session threshold (§7.2) revisited after real pilot sessions provide actual usage data — stated as a reasoned starting number, not a measured one.
- [ ] `engine/entry/` module: confirm that the `AppState` machine's `world-loading → in-lobby` transition positions the GDD§4 follow camera at GDD§4.2's fly-through end position exactly (not an approximation), so the player sees no position jump at the spawn-camera handoff. (GDD§14 sign-off item mirrors this.)

---

## 15. Glossary

- **Ephemeral verification context** — the second, isolated execution context (a fresh E2B session or a fresh `runsc` container, §6) created solely to run the verification harness against a snapshot of a team's workspace, then destroyed.
- **Fix attribution** — the retrospective, read-time computation (§3.5) identifying which student's edit(s) most plausibly produced a passing verification run; never stored, always computed on read.
- **Debounce buffer** — the server-side mechanism (§10) collapsing rapid repeated saves to the same file into one `contribution_events` write.

---

## 16. Changelog

**v1.1**
- Narrowed `PlayerState.animState` from `string` to GDD §3.3's `AnimState` union.
- Fixed D2: API Specification v1.0 → v1.1, per cross-doc audit [date].
- Fixed D9: `scenario_usage_log` deprecated; query `sessions` directly, per cross-doc audit [date].
- Fixed D10: Rewrote SAD §10's lifecycle diagram and prose to the 6-state chain, per cross-doc audit [date].
- Fixed D16: Checked off TDD §14's passcode-wording checklist item, per cross-doc audit [date].

**v1.2 — two-phase engine initialization (new §9.1, extended §9 module table, §13, §14, §16).** Adds `engine/entry/` module and the two-phase Babylon.js initialization design (PRD v3.2 §10.4, GDD v1.1 §4.2, AWDD v1.1 §4.0). Key changes: §9 module table extended with `engine/entry/`; §9.1 specifies `initEntryScene()` (page-load, exterior scene, scripted camera at start position), `initGameWorld()` (auth-success, fly-through + Lobby asset stream + character spawn + follow-camera handoff), `AppState` type (5 states), full state-transition table with engine actions per transition, reduced-motion path (`skipFlythrough` option), and WebGL-unavailable fallback (static image + 2D auth form, no 3D world); §13 traceability row added for PRD§10.4/GDD§4.2/AWDD§4.0/SAD§12 resolution; §14 sign-off item added for spawn-camera handoff position alignment.

**v1.0 — first version.** New document type in this project's suite (front-matter explains the interpretation taken). Resolves SAD v1.3 §19's open items 4 (verification ephemeral-context mechanics) and 5 (abandoned-session inactivity window); makes one previously-undecided call (frontend state management: Zustand); and flags one small wording inconsistency in API Specification v1.1 §3.2 for future correction.
