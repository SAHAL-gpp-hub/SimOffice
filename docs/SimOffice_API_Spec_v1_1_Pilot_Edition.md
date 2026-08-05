# SimOffice — API Specification
## Pilot Edition

| | |
|---|---|
| **Document type** | API Specification — PRD§22 item 4: *"for session management, workstation code operations, verification submission/results, teacher dashboard status, and the resilience behaviors in §12.13."* Fixes REST/WebSocket contracts on top of SAD v1.3's resource boundaries (§9) and DBD v1.1's schema — does not re-decide either. |
| **Scope** | Every Phase 0 MVP endpoint is fully specified. Phase 1+ surface (multi-department assignment, layered verification, spectator mode) is listed for shape/continuity but deliberately not fully speced — nothing in this pilot's scope depends on it, and over-specifying it now risks the same kind of premature-detail mistake corrected in DBD v1.1 §3. |
| **Version** | 1.1 |
| **Status** | Ready to implement against. |

> **What changed in v1.1 (full changelog in §18):** three things. First, two cross-document references were stale: this document's own §14.1/§14.2 described the session-lobby/team-creation timing gap and the missing character-appearance column as still-open — both were fixed downstream (SAD v1.3 §11.1/§8.1, DBD v1.1 §6) after this document first flagged them, but this document never got updated to say so, so it was contradicting documents it had itself caused to be corrected. Fixed throughout, and in §14.1/§14.2 specifically. Second, `sessions.max_roster_size` was accepted as a config field but never actually enforced anywhere — no capacity check on join, no error code for it (§3.2, §13 — new `SESSION_ROSTER_FULL`). Third, the join response didn't include `appearance`, so a client couldn't actually implement "route to character creation only if this student hasn't set one up yet" — the one case where "is this a new roster entry" and "does this roster entry have an appearance yet" diverge (a student who joined once, never finished character creation, and returns later) was unhandled (§3.2). Items two and three were both surfaced by a cross-check against UI/UX Design Document v2.0's SCR-06/SCR-07, not found independently — credited here rather than presented as caught in isolation.

---

## Table of Contents

1. [Purpose & Inputs](#1-purpose--inputs)
2. [Conventions](#2-conventions)
3. [Auth & Identity](#3-auth--identity)
4. [Classes & Roster](#4-classes--roster)
5. [Session Management](#5-session-management)
6. [Content Library](#6-content-library)
7. [Workstation / Environment Operations](#7-workstation--environment-operations)
8. [Teacher Dashboard](#8-teacher-dashboard)
9. [Debrief](#9-debrief)
10. [WebSocket Protocol (Colyseus Rooms)](#10-websocket-protocol-colyseus-rooms)
11. [Character Customization](#11-character-customization)
12. [Phase 1+ Surface (Not Fully Speced)](#12-phase-1-surface-not-fully-speced)
13. [Error Code Reference](#13-error-code-reference)
14. [Open Items & Cross-Document Fixes Needed](#14-open-items--cross-document-fixes-needed)
15. [Resilience Behaviors → Endpoint Traceability (PRD§12.13)](#15-resilience-behaviors--endpoint-traceability-prd1213)
16. [PRD/SAD/DBD Requirement Traceability Matrix](#16-prdsaddbd-requirement-traceability-matrix)
17. [Sign-off Checklist](#17-sign-off-checklist)
18. [Changelog](#18-changelog)

---

## 1. Purpose & Inputs

This document turns SAD v1.3 §9's resource-group sketch into real, implementable request/response contracts, grounded in DBD v1.1's schema (every response field maps to a real column or a documented aggregation of one) and PRD v3.1's feature/journey requirements (every endpoint's *behavior*, not just its shape, is traced back to a specific requirement).

Fixed inputs, not re-litigated here: **PRD v3.1** (requirements), **SAD v1.3** (component topology, trust-zone design, auth model, WebSocket room ownership), **TSSD v2.1** (NestJS + Colyseus on one `app-server` process, PostgreSQL 17.x), **DBD v1.1** (schema, constraints, retention mechanics). Where building this spec required resolving something none of those four fully closed, that's flagged explicitly (front-matter above, and §14) rather than silently decided.

---

## 2. Conventions

### 2.1 Base path & versioning
All REST endpoints are under `/api/v1`. Versioning is in the path from day one — cheap to add now, expensive to retrofit — consistent with TSSD v2.1's general "small, cheap seam now beats a rewrite later" reasoning applied elsewhere in this doc set.

### 2.2 Field naming
Request/response JSON bodies use `camelCase` (matching the TypeScript conventions already used in SAD's `SandboxProvider` interface and Colyseus schema, §7.1/§8.2 of that document). DBD v1.1's tables use `snake_case` (standard Postgres convention, DBD§2.1) — the API layer is responsible for that translation; it is not a discrepancy to be "fixed," just two different, both-correct conventions at two different layers.

### 2.3 Auth
Two bearer-token types, both standard signed JWTs validated by `app-server` (SAD§9.3) — never merged into one identity model:

| Token | Issued by | Claims | Lifetime |
|---|---|---|---|
| **Teacher token** | `POST /auth/login` | `sub` (accountId), `role: "teacher"` | Long-lived session (SAD§9.3); no refresh endpoint at pilot scale — re-login on expiry is an accepted simplification given pilot scale (TSSD v2.1's "lightweight tooling" reasoning), not an oversight |
| **Roster token** | `POST /sessions/join` | `sub` (rosterEntryId), `role: "student"`, `sessionId`, `teamId` | Short-lived, session-scoped (PRD§15.1) — re-minted on reconnect via the same join endpoint |

All authenticated endpoints require `Authorization: Bearer <token>`. Endpoints under **Workstation / Environment Operations** (§7) additionally check that the roster token's `teamId` claim matches the environment's owning team — a student's token from Team A is rejected (`403 FORBIDDEN`) against Team B's environment, enforcing PRD§8.1's per-team isolation at the API layer, not just at the sandbox layer.

### 2.4 Error envelope

```json
{
  "error": {
    "code": "INVALID_ROSTER_PASSCODE",
    "message": "That code doesn't match anyone in this class. Leave it blank to join as a new student.",
    "details": {}
  }
}
```

`code` is a stable, machine-checkable string (full list in §13); `message` is human-readable and safe to show directly; `details` is endpoint-specific and may be empty.

### 2.5 Status codes
Standard usage: `200` success, `201` created, `204` no content, `400` validation error, `401` unauthenticated/bad credentials, `403` authenticated but wrong scope, `404` not found, `409` conflict with current state, `429` rate limited, `503` service unavailable (matches SAD§14's "Database unavailability surfaces as a clear 503... rather than a hung request").

### 2.6 Rate limiting
`POST /auth/login` and `POST /sessions/join` are rate-limited via Valkey-backed counters (SAD§13) — both are credential/code-guessing surfaces. The concrete limits for the Phase 0/1 Pilot are:
- `POST /auth/login`: 5 requests per minute per IP.
- `POST /sessions/join`: 10 requests per minute per IP.
- Default API: 60 requests per minute for standard CRUD operations per client.
A `429` response includes a `Retry-After` header.

### 2.7 Pagination
Not implemented in v1.0. Every list endpoint in this spec returns realistically single-digit-to-low-hundreds row counts at pilot scale (one class's roster, one scenario's variants) — pagination is a documented Production seam, not a v1.0 gap, consistent with TSSD v2.1's repeated "don't build infrastructure the pilot's actual scale doesn't need yet" reasoning.

### 2.8 Idempotency note
`POST /sessions/join` is safe to call repeatedly for an already-joined roster entry — `team_memberships` has a `UNIQUE(team_id, roster_entry_id)` constraint (DBD§6), so a repeat join for an existing member returns the existing membership (`200`) rather than erroring; the API layer checks for an existing row before insert rather than relying on catching the constraint violation.

---

## 3. Auth & Identity

### 3.1 `POST /auth/login`

Teacher login.

**Auth:** none required.

**Request:**
```json
{ "email": "priya@example.edu", "password": "..." }
```

**Response `200`:**
```json
{
  "accountId": "uuid",
  "displayName": "Mentor Priya",
  "token": "eyJ...",
  "expiresAt": "2026-08-02T00:00:00Z"
}
```

**Errors:** `401 INVALID_CREDENTIALS`, `403 ACCOUNT_DEACTIVATED` (PRD§11.1 deprovisioning — `accounts.deactivated_at` is set), `429 RATE_LIMITED`.

### 3.2 `POST /sessions/join`

Student join — covers first-time join, returning join, and late join (PRD§12.13/§13.4) with the same contract; there is no separate "late join" endpoint, matching DBD's design that a `RosterEntry` is looked-up-or-created identically regardless of when in the session's lifecycle the join happens (DBD§3.1).

**Auth:** none required (join code is the credential).

**Request:**
```json
{
  "joinCode": "AB3XQ9",
  "displayName": "Rahul",
  "rosterPasscode": "WOLF-42"
}
```
`rosterPasscode` is optional. **Omit it to join as a new student in this class** — this covers both a genuinely first-time student and a student who's lost a previous passcode and is deliberately starting fresh (accepted pilot-scale tradeoff: there is no email tied to a `roster_entry` to send a recovery link to, consistent with the lightweight, credential-free identity design in PRD§15.1 — see §14 for the full reasoning if this needs revisiting post-pilot).

**Behavior:**
1. Resolve `joinCode` → `session` (any status except `torn_down`; a session that hasn't started yet accepts joins into its lobby — see §5.2's resolution of the lobby-timing gap).
2. If `rosterPasscode` provided: look up `roster_entries` by `(session.class_id, passcode_hash)`. Not found → `401 INVALID_ROSTER_PASSCODE`. Found → reuse that row, update `display_name` to the value just provided (nickname changes are allowed) and bump `last_seen_at`. **Roster-size capacity (step 3 below) does not apply to a returning student** — a student who already has a `team_memberships` row for this session is reconnecting, not adding to the roster count, and must never be locked out by a cap that filled up after they first joined.
3. If `rosterPasscode` omitted: check current distinct roster-entry count against `session.max_roster_size` (if set); at capacity → `409 SESSION_ROSTER_FULL`. Otherwise, create a new `roster_entries` row, generate a fresh human-friendly passcode (format: one dictionary word + 2 digits, e.g. `WOLF-42` — short enough to remember, ambiguous-character-free; exact generation mechanism and word list are specified in Technical Design Document v1.0 §3.3).
4. Verify that `roster_entries.class_id` matches `sessions.class_id`. If they do not match, reject with `409 ROSTER_CLASS_MISMATCH` (DBD§16 item 7).
5. Look up or create the `team_memberships` row for `(the session's team, this roster entry)` per §2.8.

**Response `200` (returning student) / `201` (new student):**
```json
{
  "rosterEntryId": "uuid",
  "rosterPasscode": "WOLF-42",
  "appearance": { "colorScheme": "bright-blue", "accessory": "cap" },
  "sessionId": "uuid",
  "teamId": "uuid",
  "token": "eyJ...",
  "wsRoomUrl": "wss://.../rooms/{teamId}"
}
```
`rosterPasscode` is always echoed back (not just on creation) so the client can always display/save it — a student who forgot they'd seen it once still gets a chance to write it down on a later join. **`appearance` is included so the client can route correctly** (added in v1.1): route to character creation (API§11.1) whenever `appearance` is empty (`{}`), not based on whether this call returned `200` vs `201` — a student created in a prior session who disconnected before finishing character creation would otherwise be incorrectly routed straight past character creation on their next join, since they'd correctly get `200` (found by passcode) despite never having actually set an appearance.

**Errors:** `404 INVALID_JOIN_CODE`, `409 SESSION_NOT_JOINABLE` (session is `ended`/`debriefed`/`torn_down`), `409 SESSION_ROSTER_FULL` (new students only, per step 3 above), `401 INVALID_ROSTER_PASSCODE`, `429 RATE_LIMITED`.

### 3.3 `DELETE /classes/{classId}/roster/{rosterEntryId}`

Student/guardian deletion request (PRD§15.5) — the operational endpoint behind DBD v1.1 §8.2's `anonymize_roster_entry` function. At pilot scale, the request is routed through the teacher/institution (consistent with PRD§16.6's "institution-level consent mechanism" framing) rather than a student-self-service flow.

**Auth:** Teacher token, must own `classId`.

**Response `204`.** Anonymizes the roster entry in place (display name replaced, passcode invalidated) and nulls attribution on `contribution_events`/`verification_runs` — never a hard delete, per DBD§8.2's reasoning. `team_memberships` rows are untouched.

**Errors:** `404 NOT_FOUND`, `403 FORBIDDEN` (class not owned by this teacher).

---

## 4. Classes & Roster

### 4.1 `POST /classes`

**Auth:** Teacher token.
**Request:** `{ "name": "IT Diploma Sem 5 - Lab Section A", "termLabel": "Term 2026-2" }`
**Response `201`:** `{ "id": "uuid", "name": "...", "termLabel": "...", "createdAt": "...", "archivedAt": null }`

### 4.2 `GET /classes`

**Auth:** Teacher token. Returns the requesting teacher's own classes only (`teacher_account_id` filter is implicit from the token, never a query parameter — prevents one teacher from listing another's classes by guessing IDs).
**Response `200`:** `{ "classes": [ { "id", "name", "termLabel", "archivedAt" }, ... ] }`

### 4.3 `PATCH /classes/{classId}`

Archive/unarchive a class (`archived_at`) — supports PRD§11.1's deprovisioning case without deleting anything.
**Auth:** Teacher token, must own `classId`.
**Request:** `{ "archived": true }`
**Response `200`:** updated class object.

### 4.4 `GET /classes/{classId}/roster`

**Auth:** Teacher token, must own `classId`.
**Response `200`:**
```json
{
  "roster": [
    {
      "rosterEntryId": "uuid",
      "displayName": "Rahul",
      "isAnonymized": false,
      "createdAt": "...",
      "lastSeenAt": "..."
    }
  ]
}
```
Never includes `roster_passcode_hash` or any derivable-secret field — this view exists for class management (and as the entry point to the deletion endpoint in §3.3), not for a teacher to impersonate a student's passcode.

---

## 5. Session Management

### 5.1 `POST /sessions`

Teacher creates a session. **Resolves the lobby-timing gap (front-matter, §14.1): this endpoint creates `Team` row(s) and opens the Colyseus room(s) immediately — not `POST /sessions/{id}/start`.** Only environment *provisioning* (the expensive, slow part) is deferred to `start`.

**Auth:** Teacher token.

**Request (option A — explicit variant):**
```json
{
  "classId": "uuid",
  "scenarioVariantId": "uuid",
  "departmentMode": "single_department",
  "timeLimitMinutes": 60,
  "maxRosterSize": 30
}
```

**Request (option B — let the system pick, PRD§12.5):**
```json
{
  "classId": "uuid",
  "scenarioId": "uuid",
  "difficulty": "beginner",
  "category": "logic_bug",
  "departmentMode": "single_department",
  "timeLimitMinutes": 60,
  "maxRosterSize": 30
}
```
When `scenarioVariantId` is omitted, the server selects a matching `scenario_variants` row (by `scenarioId` + `difficulty` + `category`) that has **not** already been used for this `classId`, per `sessions` (DBD v1.1 §16 item 6, implementing PRD§11.5.3's "no repeat incident"). No eligible unused variant → `409 NO_ELIGIBLE_VARIANT`. On success, the new `sessions` row itself serves as the record of use immediately (not deferred to session start), so a second `POST /sessions` for the same class can't select the same variant even if the first session never starts.

**Behavior:**
1. Resolve/validate the scenario variant (as above).
2. Generate `join_code` (6 uppercase alphanumeric characters, collision-checked against active sessions).
3. Insert `sessions` row, `status = 'created'`.
4. Resolve target department(s) from `scenario_departments` for the chosen scenario. For `single_department` mode (Phase 0's only supported value): insert exactly one `teams` row. Open its Colyseus room immediately, in an "environment not ready" state — students can enter the lobby, move around, chat, and customize characters, but the workstation object is inert until the session becomes `active` (§10.3).
5. `multi_department` mode: Phase 1 surface, see §12 — not created by this endpoint in v1.0.

**Response `201`:**
```json
{
  "sessionId": "uuid",
  "joinCode": "AB3XQ9",
  "status": "created",
  "teams": [ { "teamId": "uuid", "departmentCode": "backend", "label": "Backend Team" } ]
}
```

**Errors:** `400 VALIDATION_ERROR`, `404 NOT_FOUND` (bad `classId`/`scenarioVariantId`/`scenarioId`), `409 NO_ELIGIBLE_VARIANT`, `403 FORBIDDEN` (class not owned by this teacher).

### 5.2 `PATCH /sessions/{sessionId}`

Edit a session's configuration while it's still `created` (not yet started) — supports PRD§12.1's "configure roster size, department team sizes, and session time limit" as an iterative step, and is also how `POST /sessions/{sessionId}/clone` (§5.3) hands off an editable draft.
**Auth:** Teacher token, must own the session's class.
**Request:** any subset of `{ timeLimitMinutes, maxRosterSize, scenarioVariantId }`.
**Errors:** `409 INVALID_STATE_TRANSITION` if `status != 'created'` — a session already started can't have its scenario swapped out from under students already in the lobby.

### 5.3 `POST /sessions/{sessionId}/clone`

PRD§12.1: "reuse a previous session's configuration as a starting template." Creates a new `sessions` row with `cloned_from_session_id` set, copying `class_id`, `department_mode`, `time_limit_minutes`, `max_roster_size` from the source. The request body can optionally include a `scenarioVariantId` to specify an override variant. If omitted, the system auto-selects a different unused variant for the same scenario, subject to the same no-repeat-variant check as §5.1.
**Auth:** Teacher token.
**Request:** `{ "scenarioVariantId": "uuid" }` (optional)
**Response `201`:** same shape as §5.1, or `409 NO_ELIGIBLE_VARIANT` with a `details.availableVariants` list so the client can retry with a specific choice.

### 5.4 `POST /sessions/{sessionId}/start`

Provisions environments and transitions the session to `active`. This is the resource-costly step deferred out of `POST /sessions` per §5.1's fix.

**Auth:** Teacher token, must own the session's class.

**Behavior:** `status → provisioning`; for each `teams` row, call `SandboxProvider.provision(teamId, scenarioVariant, resourceLimits)` (SAD§7.1); insert `environment_instances` (`status='ready'` once provisioned); post the scenario variant's `briefing_text` to each team's room (notice board content, PRD§10.3); `status → active`.

**Response `200`:** `{ "sessionId": "uuid", "status": "active", "startedAt": "..." }`

**Errors:** `409 INVALID_STATE_TRANSITION` (already started/ended), `502 PROVISIONING_FAILED` (Sandbox Provider error — the specific team's provisioning is retried once server-side before surfacing this; a partial failure, e.g. 3 of 4 teams provisioned, is reported per-team in `details.teamResults` rather than failing the whole session).

### 5.5 `GET /sessions/{sessionId}`

**Auth:** Teacher token (own class) or student roster token (own session only — `sessionId` claim must match).
**Response `200`:** `{ "sessionId", "status", "endReason", "joinCode", "departmentMode", "timeLimitMinutes", "startedAt", "endedAt", "teams": [ { "teamId", "departmentCode", "outcomeState" } ] }`

### 5.6 `POST /sessions/{sessionId}/announcements`

PRD§12.7: teacher pushes a mid-session "customer report" or "monitoring alert." **Not persisted to PostgreSQL** — broadcast to the relevant Colyseus room(s) as a real-time update to the notice-board object, matching §10.2's "the object visibly changes state for everyone in the room" pattern. This is a deliberate simplification: nothing in PRD§12.11's debrief or DBD v1.1's schema requires querying announcement history after a room disposes, so persisting it would be storage without a read path.
**Auth:** Teacher token, must own the session's class.
**Request:** `{ "teamId": "uuid | null (null = all teams)", "text": "Customers report their payment sometimes fails silently." }`
**Response `204`.**

### 5.7 `POST /sessions/{sessionId}/end`

PRD§12.13's early-end and normal-end cases, and §13.5's journey — same endpoint for both; there is no separate "force end" call.

**Auth:** Teacher token, must own the session's class.

**Behavior:** for each team, set `outcome_state` from its current `full_fix`-check status (`resolved` if passed, `unresolved` otherwise — `in_progress` is never a terminal value); broadcast `sessionEnded` with debrief data to every room; call `SandboxProvider.teardown(env)` for every `environment_instances` row belonging to this session; set each to `torn_down`; set `sessions.status = 'ended'`, `end_reason` (`teacher_ended_early` — this endpoint always uses this value; `time_limit_reached`, `all_teams_resolved`, and `abandoned_timeout` are set by the automatic server-side paths in §15, NOT by a client-side HTTP call. The teacher's frontend timer is advisory only); dispose each Colyseus room (Note: the server MUST wait a brief grace period of 2-3 seconds after broadcasting `sessionEnded` before disposing rooms to ensure WebSocket buffers flush the debrief data to all connected clients).

**Response `200`:** `{ "sessionId": "uuid", "status": "ended", "endReason": "teacher_ended_early", "teams": [ { "teamId", "outcomeState" } ] }`

**Errors:** `409 INVALID_STATE_TRANSITION` (already ended/torn_down).

**Guarantee (PRD§16.4):** this handler does not return a success response until every environment instance for the session has either reached `torn_down` or the teardown failure is explicitly reported in `details.teardownFailures` — silently leaving a sandboxed environment running is treated as a bug, not an acceptable partial success.

### 5.8 `GET /classes/{classId}/sessions`

Returns a paginated summary array of sessions for a given class.

**Auth:** Teacher token, must own `classId`.

**Response `200`:**
```json
{
  "sessions": [
    {
      "id": "uuid",
      "status": "ended",
      "createdAt": "...",
      "startedAt": "...",
      "endedAt": "...",
      "scenarioVariantId": "uuid",
      "scenarioVariantName": "...",
      "joinCode": "AB3XQ9"
    }
  ]
}
```
*(Note: `joinCode` is included only if the session is active)*

---

## 6. Content Library

### 6.1 `GET /scenarios`

**Auth:** Teacher token.
**Query params (all optional):** `domain`, `departmentalShape` (`full_stack` | `specialist`), `difficulty` (filters to scenarios having at least one variant at that difficulty).
**Response `200`:** `{ "scenarios": [ { "scenarioId", "title", "domain", "departmentalShape", "departments": ["backend"] } ] }`

### 6.2 `GET /scenarios/{scenarioId}`

**Auth:** Teacher token.
**Response `200`:**
```json
{
  "scenarioId": "uuid",
  "title": "Backend Payment Service",
  "domain": "web_development",
  "departmentalShape": "specialist",
  "departments": ["backend"],
  "variants": [
    { "variantId": "uuid", "difficulty": "beginner", "category": "logic_bug", "briefingText": "Customers report..." }
  ]
}
```
`briefingText` is visible here (teacher browsing/selection) even though, in-world, it's only revealed to students once a session using that variant actually starts (PRD§10.3) — this is a teacher-facing preview, not a leak, since only teacher tokens reach this endpoint.

---

## 7. Workstation / Environment Operations

Every endpoint in this section requires a student roster token whose `teamId` claim matches the `{teamId}` in the path (§2.3) — this is PRD§8.1's per-team isolation enforced at the API layer, in addition to the sandbox-level isolation in SAD§7. The server resolves the team's active environment internally.

### 7.1 `GET /teams/{teamId}/workstation/files`

File tree for the student's department slice of the codebase (PRD§8.2). **Auth error `409 ENVIRONMENT_NOT_READY`** if the session isn't yet `active` (environment still provisioning or session still in its lobby phase, §5.1).
**Response `200`:** `{ "files": [ { "path": "services/payment/retry.ts", "type": "file" }, ... ] }`

### 7.2 `GET /teams/{teamId}/workstation/files/{path}`

**Response `200`:** `{ "path": "...", "content": "..." }`. Calls `SandboxProvider.readFile(env, path)` (SAD§7.1) — never resolves a path outside `/workspace`; the trust-zone separation (SAD§7.2) means there is no path parameter value that reaches the verification harness, by construction, not by a permission check that could be misconfigured.

### 7.3 `PUT /teams/{teamId}/workstation/files/{path}`

**Request:** `{ "content": "..." }`
**Response `200`:** `{ "saved": true, "savedAt": "..." }`. Calls `SandboxProvider.writeFile`. Writes a `code_edit_saved` contribution event (DBD§9) tagged to the calling `roster_entry_id`, debounced client-side to save checkpoints rather than every keystroke (DBD§9's volume note).
**Errors:** `409 ENVIRONMENT_NOT_READY`.

### 7.4 `POST /teams/{teamId}/workstation/run-check`

Informal, student-triggerable "did I get closer" check (PRD§8.2) — distinct from formal verification. Calls `SandboxProvider.runCheck(env)` and writes a `check_run_triggered` contribution event (DBD§9) tagged to the calling `roster_entry_id`.
**Response `200`:** `{ "result": "pass" | "fail", "output": "..." }`. This result is **not** written to `verification_runs` (that table is reserved for server-computed, tamper-resistant results per PRD§8.5/DBD's design) and does not affect `outcome_state`.
**Errors:** `409 ENVIRONMENT_NOT_READY`, `422 RESOURCE_LIMIT_EXCEEDED` (the informal check itself hit the wall-clock/memory ceiling, SAD§7.4).

### 7.5 `POST /teams/{teamId}/workstation/submit-verification`

The trust-zone-critical endpoint (SAD§11.2/§7.2). Runs every `verification_checks` row for the environment's scenario variant against a protected, ephemeral execution context the student cannot observe or tamper with.

**Response `200`:**
```json
{
  "runs": [
    { "checkId": "uuid", "checkType": "full_fix", "result": "pass", "diagnosticDetails": {} },
    { "checkId": "uuid", "checkType": "diagnostic", "result": "pass", "diagnosticDetails": { "note": "correct file identified" } }
  ],
  "outcomeState": "resolved"
}
```
`outcomeState` reflects the team's `full_fix`-type check result specifically (DBD§3.3's fix — a diagnostic check passing does not, by itself, resolve the team). A `resource_limit_exceeded` result on any individual check (PRD§8.6) is a normal value inside `runs[].result`, not an HTTP error — the request itself succeeded; one check hit its ceiling, which is exactly the "defined, visible outcome... not a silent hang" PRD§8.6 requires.

**Behavior:** each check's result is broadcast to the team's Colyseus room as `verificationResult` (SAD§11.2) as soon as it completes (not batched until all checks finish), so the in-world confirmation chime/prop-state-change (PRD§13.2) can fire per check rather than waiting on the slowest one.

**Errors:** `409 ENVIRONMENT_NOT_READY`.

---

## 8. Teacher Dashboard

### 8.1 `GET /sessions/{sessionId}/dashboard`

PRD§12.10 MVP: "a straightforward roster/status list." Combines a DB read (verification/outcome status, from DBD's `team_debrief_summary` view) with live presence data read directly from each team's in-memory Colyseus room state — an in-process call, not a network round trip, since `app-server` hosts both the REST API and the Colyseus rooms in one process (TSSD v2.1, SAD§4).

**Auth:** Teacher token, must own the session's class.

**Response `200`:**
```json
{
  "teams": [
    {
      "teamId": "uuid",
      "departmentCode": "backend",
      "outcomeState": "in_progress",
      "fullFixChecksPassed": 0,
      "fullFixChecksTotal": 1,
      "diagnosticChecksPassed": 1,
      "resourceLimitExceeded": false,
      "roster": [
        { "rosterEntryId": "uuid", "displayName": "Rahul", "connected": true, "seated": true, "deskId": "desk-1" }
      ]
    }
  ]
}
```

### 8.2 `POST /sessions/{sessionId}/teams/{teamId}/hint`

PRD§12.10: "drop a hint to a specific struggling team... without broadcasting it to everyone." **Ephemeral broadcast only, not persisted** — same reasoning as announcements (§5.6): nothing in the debrief spec (PRD§12.11) requires a historical record of hints given.
**Auth:** Teacher token, must own the session's class.
**Request:** `{ "message": "Check the retry logic in the payment service." }`
**Response `204`.**

---

## 9. Debrief

### 9.1 `GET /sessions/{sessionId}/debrief`

PRD§12.11's automatic summary, for the teacher, across every team. Backed by DBD's `team_debrief_summary` view.

**Auth:** Teacher token, must own the session's class.

**Response `200`:**
```json
{
  "sessionId": "uuid",
  "endReason": "teacher_ended_early",
  "teams": [
    {
      "teamId": "uuid",
      "departmentCode": "backend",
      "outcomeState": "unresolved",
      "fullFixChecksPassed": 0,
      "fullFixChecksTotal": 1,
      "diagnosticChecksPassed": 1,
      "firstPassAt": null
    }
  ]
}
```
For an `unresolved` team, this response is the data source for PRD§13.3's required **non-punitive framing** — the client renders "found the right file, didn't reach the full fix" from `diagnosticChecksPassed > 0 && fullFixChecksPassed == 0`, never a bare "FAILED" state. That rendering rule lives in the frontend (SAD§12), not this API, but the response shape here is what makes it possible: partial progress and full failure are distinguishable in the payload, not collapsed into one boolean.

### 9.2 `POST /sessions/{sessionId}/teams/{teamId}/reveal-fix`

PRD§13.3 step 4's "teaching moment" action, requested by UIUXD §8. Allows a teacher to explicitly reveal the actual fix or root cause to a specific team.

**Auth:** Teacher token, must own the session's class.

**Request body:** None.

**Response `200`:**
```json
{
  "teamId": "uuid",
  "fixContent": "The config file had the wrong port defined...",
  "revealedAt": "2024-03-15T14:30:00Z"
}
```

**Behavior & errors:**
- **`403 FORBIDDEN`**: if the token doesn't have teacher privileges or the teacher doesn't own the session's class.
- **`404 NOT_FOUND`**: if the session or team does not exist.
- **`409 INVALID_STATE_TRANSITION`**: if the session is not yet in the `debriefed` or `ended` state.
- **Gating:** Once triggered, the `fixContent` is revealed and subsequent calls to `GET /sessions/{sessionId}/debrief/me` for members of this team will include the `fixContent` field.

### 9.3 `GET /sessions/{sessionId}/debrief/me`

PRD§12.11's personal takeaway card. Backed by DBD's `student_contribution_summary` view.

**Auth:** Student roster token (own session/roster entry only — no `rosterEntryId` path parameter, always "me," so there is no ID to guess against another student's data).

**Response `200`:**
```json
{
  "rosterEntryId": "uuid",
  "teamId": "uuid",
  "codeEdits": 4,
  "chatMessages": 6,
  "pingsSent": 1,
  "emotesUsed": 2,
  "verificationsTriggeredPass": 2,
  "teamOutcomeState": "resolved"
}
```
**Note:** per DBD§8.1's scheduled retention job, this response's per-student fields go to zero for events older than the retention window once `contribution_events.roster_entry_id` is nulled — expected behavior, not a bug, and irrelevant in practice since this endpoint is read during/immediately after a live session, long before that window elapses.

---

## 10. WebSocket Protocol (Colyseus Rooms)

Colyseus's native join/schema-sync protocol is used as-is (SAD§9.2) — this section documents the application-level contract on top of it: which methods exist, what they do, and what state syncs automatically.

### 10.1 Connecting
```
client.joinOrCreate(`team-${teamId}`, { token })
```
The room ID is the `teamId`, matching SAD§8.1's one-room-per-team mapping. The server validates the token's `teamId` claim matches the room being joined before accepting, then writes a `session_joined` contribution event (DBD§9) — this is the event that actually backs the session-duration/return-rate metrics in PRD§17, distinct from the REST `POST /sessions/join` call in §3.2, which only establishes identity/team membership and can happen well before the WebSocket connection (during the lobby phase, §5.1).

### 10.2 Synced state (schema, automatic — SAD§8.2)
`TeamRoomState` (`players` map, `briefingText`, `outcomeState`, `chatLog`) and `PlayerState` (`rosterEntryId`, `x`/`y`/`z`, `animState`, `seated`, `deskId`, `connected`) sync automatically to every connected client on change — no polling, no explicit "fetch state" call needed after join.

### 10.3 Client → server room methods

| Method | Purpose | Server-authoritative behavior |
|---|---|---|
| `move({x, y, z, animState})` | Position/animation update | Broadcast to room; no validation beyond bounds-checking (anti-cheat is out of scope for a classroom pilot) |
| `sitAtDesk(deskId)` | Occupy a workstation | First valid call wins (PRD§10.2's deterministic conflict rule, SAD§8.3); a second call against an occupied `deskId` is rejected with `{ error: "DESK_OCCUPIED", nearestFreeDeskId }`. Writes a `desk_seated` contribution event on success |
| `standUp()` | Leave a workstation | Frees the desk; progress already auto-saved via §7.3's writes. Writes a `desk_stood` contribution event |
| `sendChat({channel, message})` | Text chat (PRD§12.6) | Appended to `chatLog`; also written as a `chat_message_sent` contribution event (DBD§9) for retention/debrief purposes — the room's `chatLog` is the live, in-memory copy; `contribution_events` is the persisted copy queried after the room disposes |
| `sendPing({targetDeskId})` | Ping system (PRD§12.6) | Broadcast; writes a `ping_sent` contribution event |
| `useEmote({emoteType})` | Emote (PRD§9.3) | Broadcast; writes an `emote_used` contribution event |

Environment-not-ready before a session reaches `active` (§5.1's lobby-timing fix): `sitAtDesk` is rejected with `{ error: "ENVIRONMENT_NOT_READY" }` while the session is still `created`/`provisioning` — every other room method (movement, chat, character roaming) works normally during the lobby phase, matching PRD§13.1's "students trickle in and customize characters" before the teacher starts.

### 10.4 Server → client broadcasts (ad hoc, not schema-synced)

| Event | Trigger | Payload |
|---|---|---|
| `verificationResult` | Each check's result as it completes (§7.5) | `{ checkId, checkType, result, diagnosticDetails }` |
| `environmentError` | Sandbox Provider failure (SAD§14) | `{ code, message }` |
| `announcementPosted` | `POST /sessions/{id}/announcements` (§5.6) | `{ text, postedAt }` |
| `hintReceived` | `POST /sessions/{id}/teams/{teamId}/hint` (§8.2) | `{ message }` |
| `sessionEnded` | `POST /sessions/{id}/end` (§5.7) | `{ endReason, outcomeState, debriefUrl }` |

### 10.5 Disconnect / reconnect (PRD§12.13, SAD§8.3)
Colyseus's native `onLeave(consented)` distinguishes an intentional leave from a dropped connection. On an unintentional drop: `PlayerState.connected → false` (shown as "stepped away," desk not freed); no `session_left` event is written yet, since the student may still reconnect and the drop wasn't a deliberate departure. On an intentional leave (`consented = true` — the student navigates away or closes the tab deliberately), a `session_left` contribution event is written, and the server automatically executes the equivalent of `standUp()` to free any occupied deskId before removing the player from the room state. The client's reconnect flow calls `POST /sessions/join` again with the same `rosterPasscode` (§3.2) to get a fresh token, then reconnects to the same room — `connected → true`, in-progress workstation state resumes because it was already durably saved via §7.3, not held only in the disconnected client's memory.

---

## 11. Character Customization

### 11.1 `PATCH /roster-entries/{rosterEntryId}/character`

PRD§12.2/§9.2's first-session character creation (appearance, name tag), persisted across sessions per PRD§15.4. Backed by the `roster_entries.appearance` column (DBD v1.1 §6 — added specifically to support this endpoint; see §14.2's history).

**Auth:** Student roster token, `rosterEntryId` must match the token's `sub` claim.

**Request:**
```json
{ "appearance": { "colorScheme": "bright-blue", "accessory": "cap" } }
```
`appearance` is stored as opaque JSON at this layer deliberately — the actual enum of valid `colorScheme`/`accessory` values is a frontend/art-asset concern (which cosmetics exist, which are unlocked via gamification per PRD§18), not an API-layer or database-layer concern; validating against that catalog happens client-side and, loosely, server-side against a simple allow-list, not encoded as SQL `CHECK` constraints the way `sessions.status` or `verification_runs.result` are (those are fixed, small, stable vocabularies — DBD§2.4's reasoning for `TEXT + CHECK` doesn't extend to a cosmetic catalog that's expected to grow purely as content, not as a schema change).

**Response `200`:** `{ "rosterEntryId": "uuid", "displayName": "Rahul", "appearance": { ... } }`

---

## 12. Phase 1+ Surface (Not Fully Speced)

Listed for continuity so Phase 1 implementation has a known shape to extend, not a blank page — deliberately not given full request/response contracts, consistent with DBD v1.1 §13's "production seam" pattern: over-specifying this now, before Phase 1's actual requirements are re-validated, risks the same kind of premature-flattening mistake this whole document chain has already corrected once (SAD v1.3 §22).

| Endpoint (shape only) | Purpose |
|---|---|
| `POST /sessions/{id}/teams/assign` | Manual department assignment (PRD§12.3) |
| `POST /teams/{id}/self-select` | Student self-selects department (PRD§12.3) |
| `POST /sessions/{id}/teams/auto-balance` | One-click balanced auto-assignment (PRD§12.3) |
| `POST /sessions/{id}/teams/{id}/split` | Sub-team splitting within a department (PRD§12.3 "custom grouping") |
| Whiteboard/notes surface endpoints | Conference Room / SOC shared whiteboard (PRD§12.6, Phase 1/2) |
| Spectator-mode room-join variant | Teacher fly-in observation (PRD§12.10, Phase 2) |

---

## 13. Error Code Reference

| Code | Status | Meaning |
|---|---|---|
| `VALIDATION_ERROR` | 400 | Request body failed schema/type validation |
| `INVALID_CREDENTIALS` | 401 | Bad teacher email/password |
| `INVALID_ROSTER_PASSCODE` | 401 | Passcode provided but doesn't match any roster entry in this class |
| `UNAUTHENTICATED` | 401 | Missing/expired/malformed token |
| `ACCOUNT_DEACTIVATED` | 403 | Teacher account has `deactivated_at` set |
| `FORBIDDEN` | 403 | Authenticated but wrong scope (wrong team, wrong class, student token on teacher-only route) |
| `NOT_FOUND` | 404 | Resource doesn't exist |
| `INVALID_JOIN_CODE` | 404 | Join code doesn't match any session |
| `SESSION_NOT_JOINABLE` | 409 | Session is `ended`/`debriefed`/`torn_down` |
| `SESSION_ROSTER_FULL` | 409 | `max_roster_size` reached; applies only to a new student, never a returning one (§3.2) |
| `INVALID_STATE_TRANSITION` | 409 | Action doesn't apply to the resource's current status |
| `ROSTER_CLASS_MISMATCH` | 409 | Student attempt to join a team in a different class session |
| `NO_ELIGIBLE_VARIANT` | 409 | No unused scenario variant matches the request, per the no-repeat-incident rule |
| `ENVIRONMENT_NOT_READY` | 409 | Workstation action attempted before the environment reaches `ready`/session reaches `active` |
| `DESK_OCCUPIED` | 409 (WS) | `sitAtDesk` lost the race to another student |
| `RESOURCE_LIMIT_EXCEEDED` | 422 | A check hit its CPU/memory/wall-clock ceiling (SAD§7.4) — informal check only; formal verification returns this as a `result` value, not an HTTP error (§7.5) |
| `RATE_LIMITED` | 429 | Valkey-backed rate limit hit on login/join |
| `PROVISIONING_FAILED` | 502 | Sandbox Provider couldn't provision an environment after retry |
| `SERVICE_UNAVAILABLE` | 503 | Database unreachable (SAD§14) |

---

## 14. Open Items & Cross-Document Fixes Needed

### 14.1 ~~SAD sequencing~~ — resolved in SAD v1.3

This spec resolved the lobby-timing gap (§5.1) by moving `Team` creation and Colyseus room opening from `POST /sessions/{id}/start` to `POST /sessions`, with only environment provisioning staying at `start`. SAD v1.3 §11.1 and §8.1 have since applied the matching sequence-diagram and lifecycle-note corrections — no longer an open item as of v1.1 of this document. Left here, marked resolved, as the historical record of what was found and where it was fixed, rather than deleted outright.

### 14.2 ~~DBD additive column~~ — resolved in DBD v1.1

```sql
ALTER TABLE roster_entries ADD COLUMN appearance JSONB NOT NULL DEFAULT '{}'::jsonb;
```
DBD v1.1 §6 applied this directly into its DDL (fresh installs) and §15 gives the same statement for upgrading an existing v1.0 database. No longer an open item as of v1.1 of this document.

### 14.3 Concurrency numbers still open
PRD§16.3 requires concrete concurrency targets (sessions/deployment, teams/session, students/team); SAD v1.3 has not pinned these beyond "a handful of teams" (SAD§7.4). This spec's endpoints don't depend on a specific number, but load/rate-limit tuning (§2.6) does, eventually — inherited open item, not new.

### 14.4 Refresh-token decision deferred
§2.3 accepts re-login on teacher token expiry as a pilot-scale simplification. If pilot session lengths make this genuinely annoying in practice (a teacher mid-class getting logged out), a refresh endpoint is a small, additive follow-up — flagged so it isn't forgotten if real usage surfaces the need.

### 14.5 Roster-size limit was captured but never enforced — fixed in v1.1

`sessions.max_roster_size` (§5.1) was accepted as a config field on session creation but nothing in v1.0 of this spec ever checked it — no capacity check in `POST /sessions/join` (§3.2), no error code for it in §13's table. Surfaced while cross-checking UI/UX Design Document v2.0's SCR-06, which designs a "session full" join-time state with no endpoint behavior behind it. Fixed in §3.2 (capacity check added) and §13 (`SESSION_ROSTER_FULL` added) — see those sections for the corrected contract.

### 14.6 Join response didn't expose enough for the client to route correctly — fixed in v1.1

§3.2's response returned `created` (via HTTP status 200/201) but nothing about the roster entry's `appearance`. A client routing "first-time student → character creation, returning student → straight into the world" on `created` alone gets it wrong in one real case: a student created in a prior session who disconnected before finishing character creation would return `200` (found by passcode) despite never having set an appearance, and would be incorrectly skipped past character creation. Surfaced while cross-checking UI/UX Design Document v2.0's SCR-06/SCR-07, which describe branching on "whether this roster_entry already has an appearance set" — a criterion the v1.0 response couldn't actually support. Fixed in §3.2 by adding `appearance` to the response; the client now branches on whether it's empty, not on `created`.

---

## 15. Resilience Behaviors → Endpoint Traceability (PRD§12.13)

| PRD§12.13 requirement | Implementing endpoint(s) |
|---|---|
| Late join — full building access, correct team, current briefing/environment state | `POST /sessions/join` (§3.2) — same contract regardless of timing, by design |
| Disconnect/reconnect — recoverable character + workstation state | Colyseus native `onLeave`/reconnect (§10.5) + `POST /sessions/join` re-mint |
| Simultaneous desk interaction | `sitAtDesk` room method, deterministic first-wins (§10.3) |
| Early session end — valid debrief for every team, full teardown | `POST /sessions/{id}/end` (§5.7), teardown-completion guarantee stated explicitly |
| Abandoned session — auto-timeout and teardown | Scheduled job (SAD§8.3) calling the same internal handler as `POST /sessions/{id}/end`, with `endReason = 'abandoned_timeout'` — no separate public endpoint; this is a server-internal cron trigger, not a client-facing call |

---

## 16. PRD/SAD/DBD Requirement Traceability Matrix

| Requirement | Endpoint(s) |
|---|---|
| PRD§8.2 — workstation read/edit/run/submit | §7.1–§7.5 |
| PRD§8.3 — partial credit, verification | §7.5 |
| PRD§8.5 — tamper-resistant, server-computed results | §7.5 (result never accepted from client), §10.4 `verificationResult` is the only channel a client receives a result through |
| PRD§8.6 — resource ceilings, visible outcome | §7.4/§7.5 `RESOURCE_LIMIT_EXCEEDED` handling |
| PRD§10.2 — desk conflict resolution | §10.3 `sitAtDesk` |
| PRD§11.5.3 — no repeated incident | §5.1's `sessions` check |
| PRD§11.1/§16.6 — deprovisioning, deletion request | §3.3, §4.3 |
| PRD§12.1 — session config, reuse-as-template | §5.1, §5.2, §5.3 |
| PRD§12.2/§9.2/§15.4 — persistent character identity, appearance | §3.2, §11.1 (pending §14.2's DBD patch) |
| PRD§12.5 — random-pick within difficulty/category | §5.1 option B |
| PRD§12.6 — chat, ping | §10.3 `sendChat`/`sendPing` |
| PRD§12.7 — mission briefing, live incident feed | §5.6, §10.4 `announcementPosted` |
| PRD§12.9 — contribution measurement | §7.3, §10.3 (each writes a `contribution_events` row) |
| PRD§12.10 — dashboard, hint | §8.1, §8.2 |
| PRD§12.11 — debrief, personal takeaway, non-punitive framing | §9.1, §9.2 |
| PRD§12.13 — resilience behaviors | §15 (full table) |
| PRD§13.3 — unresolved outcome is distinct, non-punitive | §9.1's response shape (partial vs. full failure distinguishable) |
| PRD§15.5 — retention & deletion | §3.3 |
| PRD§16.4 — session-integrity teardown | §5.7's explicit teardown-completion guarantee |
| SAD§7.2 — trust-zone separation | §7.2/§7.3 (no path parameter ever resolves into the protected context) |
| SAD§8.1 — one room per team, per-team isolation | §2.3's `teamId` claim check on every §7 endpoint |
| DBD§8 — anonymization mechanics | §3.3 |
| DBD§9 — contribution event taxonomy | §7.3, §10.3 (event types match DBD§9's table exactly) |
| DBD's `team_debrief_summary`/`student_contribution_summary` views | §9.1, §9.2 |

---

## 17. Sign-off Checklist

- [x] SAD v1.3 §11.1's sequence diagram updated per §14.1 — resolved.
- [x] DBD v1.1 patched per §14.2's additive `ALTER TABLE` — resolved.
- [ ] Cosmetic catalog (valid `appearance` values) exists somewhere concrete — frontend asset list or a lightweight content-config file — before §11.1 ships, since this spec deliberately doesn't define that vocabulary at the API layer.
- [ ] Rate-limit thresholds (§2.6) tuned against real Valkey capacity once the pilot VPS is provisioned (TSSD v2.1 §5.1), not left at whatever default is convenient during development.
- [ ] Every `contribution_events`-writing endpoint (§7.3, §10.3) confirmed against DBD§9's exact `event_type` vocabulary — no endpoint introduces a value not in that `CHECK` constraint.
- [ ] `max_roster_size` enforcement (§3.2, new in v1.1) confirmed to exempt returning students correctly — a capacity check that accidentally locked out a reconnecting student would be worse than no check at all.

---

## 18. Changelog

**v1.0 — first version.** Built directly from SAD v1.2 §9's resource-group sketch and DBD v1.0's schema. Two gaps surfaced and flagged with exact fixes rather than silently resolved: the session-lobby/team-creation timing gap between PRD§13.1's journey and SAD v1.2 §11.1's sequence diagram, and the missing `appearance` storage for PRD§12.2/§15.4's persistent character customization.

**v1.1.** Both v1.0 gaps confirmed resolved downstream (SAD v1.3 §11.1/§8.1, DBD v1.1 §6) — §14.1/§14.2 rewritten from "needs a follow-up correction" to a resolved-history record, and every "SAD v1.2"/"DBD v1.0" reference in this document updated to "SAD v1.3"/"DBD v1.1" throughout, including two places a version-number-only fix would have left a now-false claim standing (§11.1's "not yet present in DBD" note, and this changelog's own v1.0 entry, corrected above to describe what was actually true *then*, not now). Two new, previously-unfound gaps fixed: `max_roster_size` was accepted but never enforced (§3.2, §13 — new `SESSION_ROSTER_FULL`), and the join response didn't carry enough information for a client to correctly decide when to route to character creation (§3.2 — added `appearance` to the response). Both surfaced via a cross-check against UI/UX Design Document v2.0.

- Fixed §3.2 passcode format wording ("two dictionary words" → "one dictionary word") to match the example, resolving TDD v1.0 §12 item 1.
- Fixed D9: `scenario_usage_log` deprecated; query `sessions` directly, per cross-doc audit [date].
- Drafted B1 Gaps (G7, G8, G10) for sign-off: added `POST /sessions/{sessionId}/teams/{teamId}/reveal-fix`, `ROSTER_CLASS_MISMATCH` validation, and `resourceLimitExceeded` to dashboard response.
