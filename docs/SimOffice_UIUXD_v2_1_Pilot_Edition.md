# SimOffice — UI/UX Design Document (UIUXD)

## Pilot Edition

| | |
|---|---|
| **Document type** | UI/UX Design Document — requirement-level screen and interaction specification for the full client (React App Shell + Babylon.js 3D World). Downstream of the PRD, SAD, API Spec, and DBD (all Pilot Editions); this is the document PRD§22 names as the destination for UI/UX decisions explicitly deferred out of the PRD, and the document SAD§12 assumes exists when it describes the client's two-layer split. |
| **Version** | 2.1 (verification pass against every source-document citation — see §18) |
| **Owner** | [Your Name / Team] |
| **Status** | Ready to drive Figma production work for Phase 0. Phase 1+ screens are catalogued but not detailed to build-ready depth (§12). |
| **Inputs** | PRD v3.1, SAD v1.3, API Spec v1.1, DBD v1.1 (Pilot Editions) |

> **What changed in v2.1 (full changelog in §18):** a systematic cross-check of every PRD/SAD/API/DBD citation in this document against the actual source documents — not a rewrite. Found and fixed one wrong citation (SCR-03 cited a PRD section that doesn't cover what it claimed) and two real gaps where a designed screen state had no supporting API contract behind it (SCR-06's character-creation branch and its "session full" state) — both gaps were fixed at the source, in API Specification v1.1, not worked around here. Load-bearing claims — most importantly §8's "Reveal Fix" quote from PRD§13.3 — were checked and confirmed accurate.
>
> **What changed in v2.0 (full changelog in §17):** v1.0 was a screen *inventory* — a flat list of screens and which endpoint each one calls. It did not specify field-level content, explicit UI states, accessibility requirements per screen, or traceability rigorous enough to hand to a designer without follow-up questions — and it left PRD§13.3's explicitly-deferred "reveal fix" UI decision unresolved. v2.0 restructures around requirement-level screen specifications (§6), resolves that deferred decision (§8), adds a persona-to-screen mapping (§4), a full traceability matrix (§9), and consolidated accessibility (§10) and content-tone (§11) sections, matching the documentation standard set by the PRD/SAD/API Spec/DBD.

---

## Table of Contents

1. [Purpose & Inputs](#1-purpose--inputs)
2. [Relationship to Other Documents](#2-relationship-to-other-documents)
3. [Design Principles](#3-design-principles)
4. [Personas → Primary Screens](#4-personas--primary-screens)
5. [UI Layer Model & Screen Taxonomy](#5-ui-layer-model--screen-taxonomy)
6. [Screen Specifications — Phase 0](#6-screen-specifications--phase-0)
7. [End-to-End Journeys → Screen Sequences](#7-end-to-end-journeys--screen-sequences)
8. [Resolving a PRD-Deferred UI Decision: the "Reveal Fix" Control](#8-resolving-a-prd-deferred-ui-decision-the-reveal-fix-control)
9. [Requirements Traceability Matrix](#9-requirements-traceability-matrix)
10. [Accessibility Requirements (Consolidated)](#10-accessibility-requirements-consolidated)
11. [Content & Tone Guidelines](#11-content--tone-guidelines)
12. [Phase 1+ Screens (Parked)](#12-phase-1-screens-parked)
13. [Open UI/UX Decisions](#13-open-uiux-decisions)
14. [Glossary](#14-glossary)
15. [Figma File Structure](#15-figma-file-structure)
16. [Sign-off Checklist](#16-sign-off-checklist)
17. [Changelog v1.0 → v2.0](#17-changelog-v10--v20)
18. [Changelog v2.0 → v2.1](#18-changelog-v20--v21)

---

## 1. Purpose & Inputs

This document specifies every screen, HUD overlay, and interaction state a person can encounter in SimOffice's Phase 0 (MVP) client, at a level of detail sufficient to build a Figma file without follow-up questions to engineering: what each screen contains, what data populates it, what states it can be in, and which PRD requirement, API endpoint, and DBD entity each element traces back to.

It is explicitly **not** a visual style guide — colors, type scale, spacing tokens, and component styling are a separate design-system artifact this document assumes will exist alongside it. What this document fixes is *content, structure, state, and behavior*; visual treatment is free to vary as long as it satisfies the requirements stated here.

**Inputs**, and what each contributes:
- **PRD v3.1** — the source of every requirement cited below (§ references throughout this document are PRD sections unless otherwise marked SAD/API/DBD).
- **SAD v1.3 §12** — fixes the two-layer client model (React Shell vs. Babylon.js World) and the hybrid nature of the workstation editor, which this document's screen taxonomy (§5) is built around.
- **API Spec v1.1** — fixes exact request/response shapes; every screen's data needs are traced to a specific endpoint so no screen is designed against a field that doesn't exist in the contract.
- **DBD v1.1** — fixes entity/enum vocabularies (`outcome_state`, `check_type`, etc.) used verbatim in screen copy so the UI never invents a status label the backend can't produce.

---

## 2. Relationship to Other Documents

| Document | What it fixes | What this document adds on top |
|---|---|---|
| PRD v3.1 | Requirements, personas, journeys, phasing | Turns each requirement into a concrete screen, field, and state |
| SAD v1.3 | Client architecture (Shell vs. 3D, trust zones, sequence diagrams) | Turns "the workstation is a hybrid overlay" into the actual states that overlay must support |
| API Spec v1.1 | Request/response contracts, error codes | Maps every screen element to the exact endpoint and field that populates or submits it |
| DBD v1.1 | Entities, enums, retention rules | Screen copy uses these enum values verbatim (§11) so UI and database never drift |

---

## 3. Design Principles

These are not aesthetic preferences — each is a direct restatement of a PRD requirement, included here because it constrains screen-level decisions throughout §6 and should not need to be re-derived per screen.

| # | Principle | Source | What it rules out |
|---|---|---|---|
| P1 | Nothing important happens behind a hidden menu only one person can see — object state changes are visible to everyone in the room | §10.2 | Any in-world panel that silently updates without a shared, visible state change |
| P2 | In-world interactions use contextual prompts, never browser-style popups/modals | §10.2, SAD§12 | Modal dialogs inside the 3D world; the workstation overlay must feel anchored, not popped up |
| P3 | Every mouse/pointer-reachable action must also be keyboard-reachable through the same input-mapping layer | §9.6, SAD§12 | Any control designed "mouse-first" with keyboard as an afterthought |
| P4 | Failure/timeout outcomes are presented non-punitively — partial progress is always distinguishable from total failure | §13.3, §12.11 | A bare "FAILED" state anywhere in the product |
| P5 | Audio cues always have a captioned/visual equivalent | §16.5, §10.2 | Any alarm, chime, or notification that is audio-only |
| P6 | A resource-limit failure is a defined, visible outcome — never a silent hang or an ambiguous timeout | §8.6 | Generic "loading forever" states where a check has actually been terminated |
| P7 | Progress saves automatically; there is no explicit "save" action a student can forget | §10.2 | Save buttons on the workstation editor |
| P8 | Reconnecting/late-joining students see the world as it currently stands, never a reset | §12.13, §13.4 | Any "welcome, fresh start" framing for a returning or late student |

---

## 4. Personas → Primary Screens

Reusing PRD§6's four personas, mapped to the screens each one actually touches. This is the check against over- or under-building a screen relative to who uses it.

### Persona 1 — Mentor Priya (Teacher)
Primary screens: Login (SCR-01), Class & Roster (SCR-02/03), Session Setup (SCR-04), Lobby Control (SCR-05), Live Dashboard (SCR-15), Teacher Debrief (SCR-19). Priya never touches the 3D world's student-facing HUD except optionally as a spectating presence (Phase 2, §12) — Phase 0 gives her a Shell-only workflow end to end.

### Persona 2 — Student Rahul (Team Contributor)
Primary screens: Join Session (SCR-06), Character Creation (SCR-07), Onboarding HUD (SCR-08), in-world HUD set (SCR-09–13), Workstation Editor (SCR-14), Student Debrief (SCR-20). Rahul never sees a teacher-only screen.

### Persona 3 — Content Author Dev
No client screens in Phase 0 — PRD§11.5.5 states authoring is a manual, code-repo-based process with no bespoke authoring UI in early phases. Flagged here only so this document doesn't silently omit a persona; Dev's tooling is out of this document's scope by design, not by oversight.

### Persona 4 — IT/Procurement Admin Alex
No client screens — Alex's concerns (device baseline, data handling) are answered by documentation (this suite) and a sales/procurement conversation, not a UI surface, consistent with PRD§6's description of Alex as a blocking-but-non-using stakeholder.

---

## 5. UI Layer Model & Screen Taxonomy

Per SAD§12, the client is three layers that compose, not three separate apps. Every screen in §6 is tagged with one of four layer types:

- **`[3D/Entry]`** *(new in v2.2, PRD§10.4)* — the pre-auth Babylon.js scene. The building exterior renders on a full-viewport canvas at page load. The React App Shell's access panel form (SCR-00) floats as a DOM overlay. Design the access panel as a floating card whose visual form is defined here; design the 3D environment it sits in front of in AWDD §4.0. In Figma, design the access panel card alone (the card is the designable surface; the 3D background is not a Figma artifact).
- **`[Shell]`** — a standard 2D screen rendered by the React App Shell. Design these as ordinary desktop-web frames in Figma.
- **`[3D/HUD]`** — an overlay rendered on top of the live Babylon.js scene. Figma cannot represent the 3D scene itself; design only the flat overlay layer (panels, prompts, icons, text), full-bleed, transparent-background frames.
- **`[Hybrid]`** — the one deliberate exception (SAD§12): real DOM content (the workstation code editor) that is position-anchored to the 3D scene and must never behave like a modal. Only one screen in this product carries this tag (SCR-14).

### 5.1 Responsive Design Specifications

- **Target minimum resolution:** 1280×720. The 3D canvas and hybrid code editor require this minimum screen real estate to function effectively.
- **Platform:** Desktop-web only for Phase 0.
- **Out of scope:** Mobile and tablet form factors are explicitly out of scope for Phase 0.

---

## 6. Screen Specifications — Phase 0

*Note: Some components have their own SCR-ID but are rendered as modals or inline panels within a parent screen (e.g., SCR-16, 17, 18 within SCR-15; SCR-22 within SCR-14). The Figma grouping in §15 reflects this visual container hierarchy.*

Each specification follows the same structure: **Actor**, **Preconditions**, **Layout Regions**, **Elements & Fields**, **States**, **Behavior Notes**, **Data & API Mapping**, **Accessibility**, **Traceability**.

---

### SCR-00 — Building Exterior / Access Panel `[3D/Entry]` *(new in v2.2)*

**Actor:** Teacher and Student. **Preconditions:** None (the application's first-rendered state on page load).

**Layout regions:** Full-viewport Babylon.js canvas (the building exterior), floating access panel card (DOM overlay centered/lower-center in the viewport, positioned in front of the entrance to align with the access panel terminal housing prop, AWDD §5.4).

**Elements & Fields:** The panel card has two content variants — both use the same physical environment; the role is determined client-side before the server is contacted:

| | Teacher variant | Student variant |
|---|---|---|
| Panel header | "Administration Access" | "Join Session" |
| Panel sub-header | "Staff Login" | None |
| Fields | Email/username, Password | Join code (6-character, uppercase, API§3.2) |
| Submit button label | "Log In" | "Enter" |
| Footer link | "Forgot password?" | "Don't have a code? Ask your teacher." |

*How the client determines which variant to render:* The URL determines the variant. `/teacher` renders the teacher variant; all other paths (root `/`) render the student variant. This keeps the two auth flows at distinct URLs without requiring any user selection or server call before the form is shown.

**States:**

| State | Visual description |
|---|---|
| `Idle` | Doors closed, panel LED steady glow (AWDD §5.4). Form is enabled. Entry camera at start position. |
| `Authenticating` | Doors cracked (~20% open, AWDD §5.3). Panel LED slow-pulse accent. Form fields disabled, submit shows spinner. |
| `Auth-success` | Doors open fully (0.5s ease-in-out, AWDD §5.3). Panel dismissed. Entry camera fly-through begins (GDD§4.2, 2s). |
| `Auth-failure` | Doors snap closed. Panel LED brief red flash (0.5s). Form re-enabled. Error message rendered inside the panel card below the submit button. |
| `Reduced-motion` | Doors jump to open/closed state with no animation. Camera cuts directly to Lobby spawn position. Entry-scene ambient animations paused. |
| `WebGL-unavailable` | 3D canvas replaced by a static `<img>` of the building exterior. Panel renders as a standalone 2D card centered in the viewport. No animation. |

**Behavior notes:**
- The panel is always a **floating card** — it must not span the full viewport width. Suggested card width: 400–440px. Visually premium: glass-like background (backdrop blur, slight transparency against the 3D scene), subtle border, SimOffice logo at the top of the card.
- The panel is composited over the live 3D canvas. In Figma, design the card on a transparent-background frame; the 3D environment is not mocked in Figma.
- Error copy for `Auth-failure`: *"Incorrect email or password."* (teacher) / *"Code not found or session has ended."* (student). Follow §11's tone principles: plain, non-blaming, one action to take.
- The `Reduced-motion` state is triggered automatically — it is not a user-facing setting. Detect `prefers-reduced-motion: reduce` or Tier 0 hardware sustaining <30fps during Phase 1 render (TDD§9.1). The form itself behaves identically in this state.

**Data & API mapping:**
- Teacher variant: `POST /auth/login` (API§3.1) on submit.
- Student variant: `POST /sessions/join` (API§3.2) on submit.

**Accessibility:**
- Standard form accessibility — labeled inputs, error text associated to field via `aria-describedby`-equivalent pattern, visible focus states (P3).
- The access panel form must be fully operable without any interaction with the 3D canvas — the 3D canvas has no keyboard affordance and is `aria-hidden` from the screen reader tree while the access panel is shown.
- `Reduced-motion` and `WebGL-unavailable` fallbacks are both functional equivalents, not degraded versions — auth succeeds and the user reaches the same destination.

**Traceability:** PRD§10.4 (new in v3.2) · SAD§12 (three-layer model) · TDD§9.1 (`AppState` machine) · GDD§4.2 (entry camera) · AWDD§4.0/§5.3/§5.4 (exterior, doors, panel housing) · PRD§16.5 (accessibility — reduced-motion), · API§3.1 (teacher login) · API§3.2 (student join).

---

### SCR-01 — Login `[Shell]` *(composited over `[3D/Entry]` canvas — see SCR-00)*

**Actor:** Teacher only. Students never log in (§4, Persona 2).
**Preconditions:** None (app entry point).

*Note: SCR-01 is the teacher variant of the SCR-00 access panel. It is not a separate screen — it is the teacher-role content rendered inside the SCR-00 panel card. Specified separately here only for clarity of traceability and actor-scoping.*

**Layout regions:** Header/logo, credential form, submit action, error region.

**Elements & Fields:**
| Field | Type | Validation |
|---|---|---|
| Email/username | text input | required, format-checked client-side |
| Password | password input | required |
| Submit | button | disabled until both fields non-empty |

**States:** Default · Loading (submit pressed, awaiting response) · Invalid-credentials error · Network error.

**Behavior notes:** No student-facing variant of this screen exists in Phase 0 — do not design a "student login" state; students authenticate implicitly via SCR-06.

**Data & API mapping:** `POST /auth/login` (API§3.1).

**Accessibility:** Standard form accessibility — labeled inputs, error text associated to field via `aria-describedby`-equivalent pattern, visible focus states (P3).

**Traceability:** PRD§11.1 (account provisioning) · API§3.1.

---

### SCR-02 — Class List `[Shell]`

**Actor:** Teacher. **Preconditions:** Authenticated (SCR-01 complete).

**Layout regions:** Class list/table, "Create class" action, per-class entry point into SCR-03 and SCR-04.

**Elements & Fields:** Class name, section label, roster count (summary only — detail lives in SCR-03), "New Session" quick action per class.

**States:** Default (has classes) · Empty (no classes yet — first-run state, distinct from a loading state) · Loading.

**Data & API mapping:** `GET /classes` (API§4.2), `POST /classes` (API§4.1), `PATCH /classes/{classId}` (API§4.3) for rename/edit.

**Traceability:** PRD§12.1 (session tied to a class/section) · API§4.1–4.3.

---

### SCR-03 — Roster Management `[Shell]`

**Actor:** Teacher. **Preconditions:** A class exists (SCR-02).

**Layout regions:** Roster table (name, join status), remove-student action.

**Elements & Fields:** Student display name, "remove from roster" per row (confirm-before-destructive, since DBD§8 treats this as a lifecycle action, not a hard delete — removal deactivates, per DBD§2.6's soft-lifecycle convention).

**States:** Default · Empty (no students yet — expected at term start, since a roster entry is only ever created reactively when a student first joins a session by passcode, not pre-populated by the teacher — PRD§15.2's class-scoped roster model, made concrete by DBD§3.1's persistent-identity design and the join behavior in API§3.2) · Confirm-removal dialog.

**Data & API mapping:** `GET /classes/{classId}/roster` (API§4.4), `DELETE /classes/{classId}/roster/{rosterEntryId}` (API§3.3).

**Traceability:** PRD§11.1, §15.2 (roster is class-scoped, persistent — DBD§3.1) · API§4.4, §3.3.

---

### SCR-04 — Session Setup `[Shell]`

**Actor:** Teacher. **Preconditions:** A class exists.

**Layout regions:** Scenario selector (card/list, filterable), configuration form, save/draft actions.

**Elements & Fields:**
| Field | Type | Phase 0 behavior |
|---|---|---|
| Scenario | card selector | Exactly one scenario, one issue variant exists (§11.5.4) — **design as a filterable list now** (domain/difficulty/departmental-shape facets per §12.4), but Phase 0 renders a single, pre-selectable card. Do not hard-code a single-item layout that has to be rebuilt for Phase 1. |
| Difficulty | dropdown | Populated but effectively fixed to the one Phase 0 variant's tier |
| Issue category | dropdown | Same as above |
| Department mode | toggle: Single Department / Multi-Department | Multi-Department visibly present but **disabled with a "Phase 1" tag** — do not hide it; PRD§12.3 makes this a first-class future toggle, not a hidden flag |
| Time limit (minutes) | number input | required, min/max per institution policy (not fixed by PRD — leave configurable) |
| Max roster size | number input | required |

**States:** Default (empty draft) · Scenario selected · Validation error (missing required field) · `409 NO_ELIGIBLE_VARIANT` (no unused scenario variant left for this class — needs plain-language copy, e.g. *"Every scenario variant available has already been used with this class. Contact your content team, or try a different class."* — see §11) · Saved-as-draft confirmation.

**Behavior notes:** "Clone as template" (SCR-19) lands a teacher on this screen pre-filled from a prior session, per API§5.3 — design the pre-filled state explicitly, not just the blank one.

**Data & API mapping:** `GET /scenarios` (API§6.1), `GET /scenarios/{id}` (API§6.2), `POST /sessions` (API§5.1), `PATCH /sessions/{id}` (API§5.2), `POST /sessions/{id}/clone` (API§5.3).

**Traceability:** PRD§12.1, §12.4, §12.5, §11.5.4 · API§5.1–5.3, §6.1–6.2.

---

### SCR-05 — Lobby Control `[Shell]`

**Actor:** Teacher. **Preconditions:** Session created (`status = created`, API§5.1).

**Layout regions:** Join code (large, copy-to-clipboard), live roster panel (fills as students join), Start Session action.

**Elements & Fields:** Join code display, roster list with join timestamps, student count vs. `maxRosterSize`, Start button.

**States:** Default (waiting for students) · Provisioning (Start pressed — `status: created → provisioning`, API§5.4; this is a real, sometimes-multi-second wait, not instantaneous — design a distinct loading state, not a button spinner) · Active (session started, hands off to SCR-15) · `502 PROVISIONING_FAILED` including the **partial-failure shape** (`details.teamResults` — per-team results; Phase 0 has one team, but the response shape already supports more, so design for a per-team result list, not a single pass/fail).

**Behavior notes:** Per API§5.1's fix, the join code and room are live the moment the session is *created*, not only at Start — students can enter the lobby, move, chat, and customize characters before the workstation is usable (§10.3). Reflect that: the roster panel is live during the "Default" state, before Start is pressed.

**Data & API mapping:** `PATCH /sessions/{id}` (API§5.2), `POST /sessions/{id}/start` (API§5.4), `GET /sessions/{id}` (API§5.5).

**Traceability:** PRD§13.1 steps 3–5, §12.1 · API§5.1, §5.4–5.5.

---

### SCR-06 — Join Session `[Shell]` *(composited over `[3D/Entry]` canvas — see SCR-00)*

**Actor:** Student. **Preconditions:** None (app entry point for students).

*Note: SCR-06 is the student variant of the SCR-00 access panel. It is not a separate screen — it is the student-role content rendered inside the SCR-00 panel card. Specified separately here only for clarity of traceability and actor-scoping.*

**Layout regions:** Single join-code field, submit action, error region.

**Elements & Fields:** Join code (6-character, uppercase alphanumeric, per API§3.2), Join button.

**States:** Default · Loading · Invalid/expired code · `409 SESSION_ROSTER_FULL` (`maxRosterSize` reached — applies only to a new student; a returning student with an existing `team_memberships` row is never locked out by a cap that filled after they first joined, per API§3.2's v1.1 fix) · Session already ended.

**Behavior notes:** On success, branch on whether the response's `appearance` field (API§3.2, added in v1.1 specifically to make this branch possible) is empty: empty → first-time-or-never-finished student → SCR-07; non-empty → directly into the 3D world (P8, §12.13). Do **not** branch on the `200`/`201` status code alone — a student who joined once, disconnected before finishing character creation, and returns later would get `200` (found by passcode) despite never having set an appearance, and would be incorrectly routed past character creation.

**Data & API mapping:** `POST /sessions/join` (API§3.2).

**Traceability:** PRD§12.1, §13.1 step 3 · API§3.2.

---

### SCR-07 — Character Creation `[Shell → 3D]`

**Actor:** Student, first session only. **Preconditions:** Successful join (SCR-06), no existing `appearance`.

**Layout regions:** Preview (character render), color/pattern selector, name tag field, confirm action.

**Elements & Fields:** Body color/pattern (swatch grid — MVP scope only, per §9.2: no hat/outfit/accessories yet — **do not design those tabs into Phase 0's layout as active options**; leave a clearly labeled reserved area if you want the layout to survive Phase 1's expansion, but don't ship dead controls), Display name (text input, required, profanity/length-validated — validation rule not fixed by PRD; flag as an open item, §13).

**States:** Default · Saving · Error (name validation failure).

**Data & API mapping:** `PATCH /roster-entries/{rosterEntryId}/character` (API§11.1).

**Traceability:** PRD§9.2, §12.2, §13.2 step 1 · API§11.1 · DBD§3.5 (`roster_entries.appearance` JSONB).

---

### SCR-08 — Onboarding Course HUD `[3D/HUD]`

**Actor:** Student, first session only. **Preconditions:** Character created (SCR-07).

**Layout regions:** Contextual prompt overlay (reused component, see SCR-09), progress indicator (optional — not required by PRD, flagged as designer's discretion).

**Elements & Fields:** Movement/interaction prompts, each with a **keyboard-input label**, not only a pointer/click icon (P3, §9.6).

**States:** Per-obstacle prompt state (approaching / active / completed). No failure state — §9.6 requires every traversal challenge be completable without precision timing; there is no "you failed the obstacle" state to design.

**Data & API mapping:** None (client-local tutorial state; no backend call).

**Accessibility:** This is the highest-stakes accessibility screen in the product — §9.6 flags accessibility here as a **design requirement not yet solved**, requiring a dedicated accessibility design spike before this screen is considered final. Do not treat this screen's Figma pass as complete without that spike's sign-off.

**Traceability:** PRD§9.4, §9.6 (accessibility spike requirement) · SAD§12 (input-mapping layer).

---

### SCR-09 — Contextual Interaction Prompt (reusable component) `[3D/HUD]`

**Actor:** Student. **Preconditions:** Character within interaction range of any object.

**Elements & Fields:** Icon/label pair, keyboard-key label (P3), object-name text.

**States:** Hidden (out of range) · Visible (in range) · Active (interacting).

**Behavior notes:** This is a **component**, not a standalone screen — every other in-world interaction (desk, notice board, elevator in Phase 1) reuses it. Design it once, on the HUD component page, and instance it everywhere else in this document that says "contextual prompt."

**Traceability:** PRD§10.2 (P2) — "never a browser-style popup."

---

### SCR-10 — Notice Board / Mission Briefing Panel `[3D/HUD]`

**Actor:** Student, Teacher. **Preconditions:** Session active; briefing text posted (API§5.4 posts `briefing_text` on start).

**Layout regions:** Passive glance state (visible from a distance) and full-focus state (on interact).

**Elements & Fields:** Briefing text (symptom-only, never the cause — §10.3), timestamp of latest update, visual "new content" cue.

**States:** Default (initial briefing) · Updated (teacher pushed an announcement mid-session, API§5.6 — chime + highlight flash, **with a captioned/visual equivalent**, P5) · Full-focus (interacted).

**Data & API mapping:** `POST /sessions/{id}/announcements` (API§5.6) — note this is **not persisted**; the panel only ever reflects the current live broadcast, so there is no "history" state to design (API§5.6's explicit simplification).

**Traceability:** PRD§10.2, §12.7, §10.3 · API§5.6.

---

### SCR-11 — Desk / Workstation Status Indicators `[3D/HUD]`

**Actor:** Student, Teacher (ambient, always visible). **Preconditions:** Session active.

**Elements & Fields:** Per-desk state icon: empty / occupied / actively-working (P1 — must be visible to everyone in the room, not just the seated student).

**States:** Empty · Occupied-idle · Actively-working · (Phase 0: no "away/disconnected" visual distinct from occupied — see SCR-24 for the actual disconnect state, which modifies this indicator).

**Behavior notes:** Conflict handling (§10.2, §12.13): if two students attempt the same desk simultaneously, resolution is deterministic (first valid interaction wins); the second student does **not** see an error — they see a redirect prompt toward the nearest free desk (design this as a prompt variant, not an error toast).

**Data & API mapping:** Read from live Colyseus room state (SAD§8.2), surfaced identically on SCR-15's roster list.

**Traceability:** PRD§10.2 (desk conflict handling), §12.8 · API§8.1 (same underlying `seated`/`deskId` fields).

---

### SCR-12 — Chat Panel `[3D/HUD]`

**Actor:** Student. **Preconditions:** In the 3D world.

**Layout regions:** Channel tabs (Department / Company-wide), message list, input field.

**States:** Default (collapsed/minimized) · Expanded · Unread-indicator.

**Behavior notes:** Non-modal — must not block movement or camera control while open (P2).

**Data & API mapping:** WebSocket / Colyseus room methods (API§10.3).

**Traceability:** PRD§12.6.

---

### SCR-13 — Ping Indicator `[3D/HUD]`

**Actor:** Student. **Preconditions:** In the 3D world.

**Elements & Fields:** Flag/marker icon at the pinged location, brief on-screen confirmation to the pinging student.

**States:** Idle · Pinged (visible to teammates for a bounded duration — duration not fixed by PRD, flagged §13).

**Traceability:** PRD§12.6.

---

### SCR-14 — Workstation Code Editor Overlay `[Hybrid]`

**Actor:** Student. **Preconditions:** Character seated at a desk (SCR-11 → Occupied).

This is the highest-complexity screen in the product — SAD§12 calls it out as the one place the Shell/3D layers deliberately blur. Treat it as a first-class deliverable, not a generic code-editor template.

**Layout regions:** File tree (left), code viewer/editor (center), action bar (Run Check / Submit for Verification), result panel (bottom or overlay-on-demand).

**Elements & Fields:**
| Element | Detail |
|---|---|
| File tree | Scoped to the student's department slice only (§8.2) — Backend files only in Phase 0, since only Backend exists. Do not design a multi-department tree; it doesn't apply until Phase 1. |
| Code viewer/editor | Read + edit, single active file at a time (not fixed by PRD whether multi-tab editing is required — flagged §13) |
| Run Check button | Informal, student-triggerable, ungraded (§8.2, API§7.4) |
| Submit for Verification button | Formal, graded, tamper-resistant (§8.3, §8.5, API§7.5) |
| Save indicator | "Saved" / "Saving…" — **no explicit save button** (P7); saves are debounced client-side (API§7.3) |

**States:**
- **Loading / not ready** — `409 ENVIRONMENT_NOT_READY` (environment still provisioning or session still in lobby, §5.1/§10.3). Needs in-world-appropriate framing (e.g., "Your workstation is booting up"), not a generic spinner — PRD§8.2 sets a felt-responsiveness expectation this state should respect.
- **Default (editing)** — file tree + editor active.
- **Run-check result** — pass/fail + output text (API§7.4). **Must be visually distinct from formal verification results** — these are informal and don't affect `outcome_state` (API§7.4's explicit note); conflating them in the UI would misrepresent progress to the student.
- **Submit-verification — in progress, streaming per check** — results arrive **one check at a time**, not batched (API§7.5: "broadcast... as soon as it completes... not batched until all checks finish"). Design a per-check status list (e.g., "Full fix check: ⏳ → ✅") so the UI reflects this streaming behavior rather than blocking on the slowest check.
- **Submit-verification — resource-limit-exceeded on one check** — a **normal, defined value** inside the results list (API§7.5: `resource_limit_exceeded` is a value inside `runs[].result`, not an HTTP error), per §8.6's "defined, visible outcome, not a silent hang" requirement (P6). Do not design this as an error state — design it as one more possible per-check result, styled distinctly from pass/fail but not as a system failure.
- **Stand up / leave** — confirms auto-save state, returns to free-roam (P7).

**Data & API mapping:** `GET /environments/{id}/files` (API§7.1), `GET /environments/{id}/files/{path}` (API§7.2), `PUT /environments/{id}/files/{path}` (API§7.3), `POST /environments/{id}/run-check` (API§7.4), `POST /environments/{id}/submit-verification` (API§7.5).

**Accessibility:** Full keyboard operability for file-tree navigation and editor use (P3) — this is a real code editor, not a read-only viewer, so standard code-editor keyboard patterns apply.

**Traceability:** PRD§8.2, §8.3, §8.5, §8.6 · SAD§12, §7 (trust-zone architecture), §11.2 (sequence diagram) · API§7.1–7.5.

---

### SCR-15 — Live Dashboard `[Shell]`

**Actor:** Teacher. **Preconditions:** Session active.

Per §12.10, MVP scope is explicitly *"a straightforward roster/status list. No 3D staging."* — do not design the Phase 2 holo-table or spectator camera here; see §12 (Phase 1+ parking).

**Layout regions:** Per-team summary card, per-student roster row, action bar (Send Hint, Push Announcement, End Session).

**Elements & Fields:**
| Field | Source |
|---|---|
| `outcomeState` (`in_progress` / `resolved` / `unresolved`) | API§8.1, DBD `teams.outcome_state` |
| `fullFixChecksPassed` / `fullFixChecksTotal` | API§8.1 |
| `diagnosticChecksPassed` | API§8.1 |
| Per-student: display name, `connected`, `seated`, `deskId` | API§8.1 |

**States:** Default (live, polling/subscribed) · Empty team (no students assigned yet, Phase 0 edge case if a session is started with zero joiners — flagged §13) · Post-hint confirmation · Post-announcement confirmation · End-session confirmation dialog (see behavior notes).

**Behavior notes:** Must specify a visual indicator for disconnected students in the 2D roster view (e.g., a grayed-out row with an 'offline' badge/icon). The End Session confirmation **must state plainly that any team still `in_progress` will receive a non-punitive `unresolved` outcome**, not a failure (P4, §13.3) — this is copy content this document fixes (§11), not left to a designer's discretion, because PRD§13.3's tone requirement is load-bearing here.

**Data & API mapping:** `GET /sessions/{id}/dashboard` (API§8.1), `POST /sessions/{id}/teams/{teamId}/hint` (API§8.2), `POST /sessions/{id}/announcements` (API§5.6), `POST /sessions/{id}/end` (API§5.7).

**Traceability:** PRD§12.10, §12.13, §13.5 · API§8.1–8.2, §5.6–5.7.

---

### SCR-16 — Send Hint `[Shell]` (modal/inline within SCR-15)

**Actor:** Teacher. **Elements & Fields:** Target team (pre-selected from SCR-15 context), message text (free text). **States:** Default · Sent confirmation (ephemeral — API§8.2 is not persisted, so there's no "hint history" to display, matching SCR-10's announcement behavior). **Data & API mapping:** API§8.2. **Traceability:** PRD§12.10.

---

### SCR-17 — Push Announcement `[Shell]` (modal/inline within SCR-15)

**Actor:** Teacher. **Elements & Fields:** Target (specific team or all teams — `teamId: null` per API§5.6), message text. **States:** Default · Sent confirmation. **Data & API mapping:** API§5.6. **Traceability:** PRD§12.7.

---

### SCR-18 — End Session Confirmation `[Shell]` (modal within SCR-15)

**Actor:** Teacher. **Elements & Fields:** Summary of current team states (how many resolved / unresolved / in-progress), explicit non-punitive framing copy (§11), confirm/cancel actions. **States:** Default · Confirmed → transitions to SCR-19. **Data & API mapping:** API§5.7 — note the **teardown guarantee**: the endpoint does not return success until every environment instance reaches `torn_down` or a failure is explicitly reported (§16.4) — design a brief "ending session…" wait state, not an instant transition, since this call can take a moment. **Traceability:** PRD§12.13, §13.5, §16.4.

---

### SCR-19 — Teacher Debrief `[Shell]`

**Actor:** Teacher. **Preconditions:** Session ended.

**Layout regions:** Per-team debrief card, export action.

**Elements & Fields per team card:** `outcomeState`, `fullFixChecksPassed`/`Total`, `diagnosticChecksPassed`, `firstPassAt` (null if unresolved). Per §13.3/API§9.1: the client renders "found the right file, didn't reach the full fix" specifically when `diagnosticChecksPassed > 0 && fullFixChecksPassed == 0` — **this rendering rule lives in this document and the frontend, not the API** (API§9.1's own note), so state this explicitly as a UI requirement, not an assumption a designer has to infer.

**States:** Resolved-team card · Unresolved-team card (non-punitive framing, P4 — see §8 for the Reveal Fix control this state also hosts) · In-progress-at-end-of-data edge case (should not occur post-end per DBD§3.4's terminal-value rule, but design defensively) · Export-in-progress · Export-complete.

**Data & API mapping:** `GET /sessions/{id}/debrief` (API§9.1).

**Traceability:** PRD§12.11, §13.3, §13.5 · API§9.1 · §8 of this document (Reveal Fix).

---

### SCR-20 — Student Personal Debrief `[Shell]`

**Actor:** Student. **Preconditions:** Session ended.

**Layout regions:** Contribution summary, learning takeaway, badges (Phase 1+, empty-state in Phase 0).

**Elements & Fields:** Attribution signals per §12.9 — root-cause/fix attribution, verification-trigger attribution, communication (chat/ping) contribution — sourced from `student_contribution_summary` (DBD§10 view, API§9.2). Must render meaningfully even for an unresolved team (§13.3 step 5 — partial diagnostic progress and communication activity are real signal, not withheld because the team didn't finish).

**States:** Resolved-team member view · Unresolved-team member view (same non-punitive tone as SCR-19, P4) · Badge slot (empty in Phase 0 — design the slot, populate later).

**Data & API mapping:** `GET /sessions/{id}/debrief/me` (API§9.2 — "me"-scoped, no ID parameter, by design, so there's no cross-student data-leak surface to design around).

**Traceability:** PRD§12.11, §13.3 step 5, §12.9 · API§9.2 · DBD§10 (`student_contribution_summary`).

---

### SCR-21 — Verification Confirmation Moment `[3D/HUD]`

**Actor:** Student. **Preconditions:** A `submit-verification` check result of `pass` arrives.

**Elements & Fields:** Confirmation chime (with captioned equivalent, P5), in-world prop state change (e.g., alarm prop settling to calm — described narratively in PRD§10.2 for Phase 2's SOC; in Phase 0 this maps to whatever prop exists in the Backend room).

**States:** Per-check pass moment (fires per check as it streams in, per API§7.5 — not a single end-of-batch celebration).

**Traceability:** PRD§13.2 step 5, §10.2 · API§7.5.

---

### SCR-22 — Resource-Limit-Exceeded State `[Hybrid, within SCR-14]`

Already specified as a state of SCR-14; listed separately here only because it also has a dashboard-visible counterpart (SCR-15 should reflect a team whose check hit its ceiling, not just pass/fail counts — flagged as an open item, §13, since API§8.1's response shape doesn't currently surface this distinctly).

**Traceability:** PRD§8.6 · API§7.4–7.5.

---

### SCR-23 — Session-Ended / Torn-Down State `[Shell/3D]`

**Actor:** Student. **Preconditions:** A student attempts to interact with a workstation or the world after the session has ended and environments are torn down.

**Elements & Fields:** Plain-language message that the session has ended, link/prompt toward the debrief (SCR-20).

**Traceability:** PRD§16.4, §12.13.

---

### SCR-24 — Disconnect / Reconnecting State `[3D/HUD]`

**Actor:** Student (as observed by teammates), Teacher. **Preconditions:** A student's connection drops mid-session.

**Elements & Fields:** A subtle avatar-state change (e.g., dimmed/"stepped away" visual) — **explicitly not** the desk being freed for someone else while the student is mid-edit (§12.13). On reconnect: character reappears where left off, in-progress edits intact.

**States:** Connected · Disconnected/"stepped away" · Reconnecting · Reconnected.

**Behavior notes:** This must not read as a jarring modal or error (P2) — it's an ambient, in-world state change, consistent with P1's "visible to everyone in the room."

**Data & API mapping:** WebSocket disconnect/reconnect handling (API§10.5, SAD§8.3).

**Traceability:** PRD§12.13, §13.4 step 3 · API§10.5.

---

### SCR-25 — Late-Join Entry State `[Shell → 3D]`

**Actor:** Student joining after session start. **Preconditions:** Join via SCR-06 after `status = active`.

**Elements & Fields:** A "here's what's already happened" framing — current mission briefing content, existing team chat history — rather than an empty/fresh world (P8, §13.4).

**Behavior notes:** The student is placed on their team's **existing** environment instance, not a fresh one (§13.4 step 2) — this has no separate visual "loading a shared environment" state distinct from SCR-14's normal loading state, but the copy on that loading state should not imply anything is being freshly created for them.

**Traceability:** PRD§13.4 · API§3.2 (join), §7.1 (files reflect existing state).

---

### SCR-26 — Generic Error / Auth-Failure States (reusable component) `[Shell]`

**Actor:** Both. **Preconditions:** Any failed action.

**Elements & Fields:** Single reusable error-toast/banner component, driven by the API's consistent error envelope (API§2.4) — error code, human-readable message.

**States:** Enumerated per API§13's error code reference — do not design one-off messages per screen; every screen in this document reuses this component for its error states unless a screen-specific note above says otherwise (e.g., SCR-04's `409 NO_ELIGIBLE_VARIANT` gets bespoke copy per §11, but the *container* is this same component).

**Accessibility:** Require `role="alert"` or `aria-live="assertive"` for all ephemeral error toasts and banners so screen readers announce them without requiring focus changes.

**Traceability:** API§2.4–2.5, §13.

---

## 7. End-to-End Journeys → Screen Sequences

Mapping PRD§13's named journeys onto this document's screen IDs, so a reviewer can walk a full journey against concrete screens.

**§13.1 — Teacher running a lab session:** SCR-00 (teacher variant) → SCR-02 → SCR-04 → SCR-05 (share code, watch roster fill, Start) → SCR-15 (monitor, SCR-16 hint) → SCR-18 (end) → SCR-19.

**§13.2 — Student joining a live incident:** SCR-00 (student variant) → SCR-07 → SCR-08 → (world entry) SCR-11/SCR-10 → SCR-14 (seated, edit, run-check, submit-verification) → SCR-21 (confirmation) → SCR-20.

**§13.3 — Team doesn't solve it in time:** SCR-15 shows `unresolved` outcome mid-session or at natural time-limit → SCR-19 (teacher's non-punitive card, with Reveal Fix control, §8) → SCR-20 (student's non-punitive personal card).

**§13.4 — Joining late / reconnecting:** SCR-06 → SCR-25 (late-join framing) → normal world/SCR-14 flow; separately, SCR-24 (disconnect) → SCR-24 (reconnected) mid-session.

**§13.5 — Ending a session early with unresolved teams:** SCR-15 → SCR-18 (confirmation stating unresolved teams will get non-punitive framing) → SCR-19 (both resolved and unresolved team cards present in the same debrief).

---

## 8. Resolving a PRD-Deferred UI Decision: the "Reveal Fix" Control

PRD§13.3 step 4 states: *"The teacher can optionally reveal the actual fix/root cause to the team as a teaching moment (a deliberate, teacher-triggered action — not automatic) — flagged here as a required capability of the debrief screen, with the actual UI treatment to be defined in the UI/UX design document."* This is the document PRD§13.3 is referring to — the decision is resolved here, not left open.

**Decision:** A **"Reveal Fix" button** is added to each unresolved-team card on the **Teacher Debrief screen (SCR-19)** only — not on the Student Debrief (SCR-20), and not available before the session ends.

- **Placement:** Inside the unresolved-team card, visually secondary to the card's primary non-punitive summary (P4) — it should read as an optional teaching tool the teacher reaches for, not as part of the team's default result.
- **Behavior:** A confirmation step ("Reveal the fix to this team? They'll see it on their personal debrief.") precedes the action, since it's explicitly teacher-triggered and irreversible per session.
- **Downstream effect:** once triggered, the revealed fix/root-cause content appears on the affected students' **Student Debrief (SCR-20)**, added as a new optional section on that screen — design SCR-20 with a conditional "What actually caused this" section that is absent unless the teacher has triggered the reveal.
- **Scope note:** this is a Phase 0-required capability per PRD§13.3, so it belongs in the initial Figma pass, not the Phase 1+ parking page (§12).

**API/data note:** no endpoint for this action exists yet in API Spec v1.1 — flagged as a **gap this document surfaces for the API Spec's next revision**, not something resolvable within this document alone. The debrief response (API§9.1) would need either a fix-content field gated by a new `POST`-style reveal action, or the fix content included but client-hidden until revealed (the former is preferable, since client-side-only gating would let a determined student inspect network traffic and see the fix before the teacher reveals it — a real, if minor, integrity gap worth avoiding given §8.5's existing tamper-resistance posture elsewhere in the product).

---

## 9. Requirements Traceability Matrix

| Screen ID | Screen | PRD § | API endpoint(s) | DBD entity/view |
|---|---|---|---|---|
| SCR-00 | Building Exterior / Access Panel | §10.4, §16.5 | 3.1 (teacher), 3.2 (student) | `accounts`, `sessions`, `roster_entries` |
| SCR-01 | Login (teacher variant of SCR-00) | §11.1 | 3.1 | `accounts` |
| SCR-02 | Class List | §12.1 | 4.1–4.3 | `classes` |
| SCR-03 | Roster Management | §11.1, §15.2 | 4.4, 3.3 | `roster_entries` |
| SCR-04 | Session Setup | §12.1, §12.4, §12.5, §11.5.4 | 5.1–5.3, 6.1–6.2 | `scenarios`, `scenario_variants`, `sessions` |
| SCR-05 | Lobby Control | §13.1, §12.1 | 5.1, 5.4–5.5 | `sessions`, `teams` |
| SCR-06 | Join Session (student variant of SCR-00) | §12.1, §13.1 | 3.2 | `roster_entries`, `team_memberships` |
| SCR-07 | Character Creation | §9.2, §12.2 | 11.1 | `roster_entries.appearance` |
| SCR-08 | Onboarding HUD | §9.4, §9.6 | — | — |
| SCR-09 | Contextual Prompt | §10.2 | — | — |
| SCR-10 | Notice Board | §10.2, §12.7, §10.3 | 5.6 | — |
| SCR-11 | Desk Status | §10.2, §12.8 | 8.1 | (room state, not persisted) |
| SCR-12 | Chat Panel | §12.6 | 10.3 | — |
| SCR-13 | Ping Indicator | §12.6 | 10.3 | — |
| SCR-14 | Workstation Editor | §8.2, §8.3, §8.5, §8.6 | 7.1–7.5 | `environment_instances`, `verification_checks`, `verification_runs`, `contribution_events` |
| SCR-15 | Live Dashboard | §12.10, §12.13 | 8.1 | `teams`, `team_memberships` |
| SCR-16 | Send Hint | §12.10 | 8.2 | — |
| SCR-17 | Push Announcement | §12.7 | 5.6 | — |
| SCR-18 | End Session Confirm | §12.13, §13.5, §16.4 | 5.7 | `sessions`, `environment_instances` |
| SCR-19 | Teacher Debrief | §12.11, §13.3, §13.5 | 9.1 | `team_debrief_summary` view |
| SCR-20 | Student Debrief | §12.11, §13.3, §12.9 | 9.2 | `student_contribution_summary` view |
| SCR-21 | Verification Confirmation | §13.2, §10.2 | 7.5 | `verification_runs` |
| SCR-22 | Resource-Limit State | §8.6 | 7.4–7.5 | `verification_runs` |
| SCR-23 | Session-Ended State | §16.4, §12.13 | 5.7 | `sessions`, `environment_instances` |
| SCR-24 | Disconnect/Reconnect | §12.13, §13.4 | 10.5 | — |
| SCR-25 | Late-Join State | §13.4 | 3.2, 7.1 | `team_memberships` |
| SCR-26 | Generic Error | — | 2.4–2.5, 13 | — |

---

## 10. Accessibility Requirements (Consolidated)

Restated here from §3 (P3, P5) and §9.6, gathered in one place because accessibility review should not require re-reading every screen spec individually:

1. **Keyboard-only completion** is required for every path a student *must* take (§9.6) — onboarding (SCR-08) is the highest-risk screen and requires a dedicated accessibility design spike before final sign-off, not validated only after full build.
2. **Every audio cue has a captioned/visual equivalent** (§16.5) — applies to SCR-10's update chime, SCR-21's confirmation chime, and any Phase 1+ alarm props (§12). Per §16.5's exact wording, this equivalent belongs **on the relevant in-world object itself, not as a separate overlay** — e.g. SCR-21's prop state change *is* the visual equivalent for its chime, not an additional banner elsewhere on screen.
3. **Every pointer-reachable action is keyboard-reachable through the shared input-mapping layer** (SAD§12) — applies globally, most concretely to SCR-14's editor and SCR-09's contextual prompts.
4. **Standard form accessibility** (labeled inputs, associated error text, visible focus states) applies to every `[Shell]` screen (SCR-01 through SCR-07, SCR-15 through SCR-20).
5. **Dynamic toast/error banners** must use `role="alert"` or `aria-live="assertive"` to ensure screen readers announce them without requiring focus changes.

---

## 11. Content & Tone Guidelines

- **Non-punitive framing is a hard requirement, not a copy preference** (P4, §13.3). Any unresolved-team state (SCR-15, SCR-19, SCR-20) must show what *was* found before saying what wasn't — never lead with failure language, never use the word "failed" as a standalone status label. Use the DBD's actual enum value (`unresolved`) as the underlying state, but never surface that raw string to the user as the *only* framing — always pair it with the diagnostic-progress context described in §6 (SCR-19).
- **In-world text (notice board, briefings) describes symptoms, never causes** (§10.3) — this is a game-design/pedagogy rule, not just a writing-style note; violating it in copy undermines the diagnostic challenge that is the product's core mechanic.
- **Use DBD enum values verbatim in underlying state, translated to plain language for display** — e.g., `outcome_state: unresolved` → display "Still investigating at session end," not the raw enum, and not an invented synonym that drifts from what other documents call this state.
- **Error copy for `409 NO_ELIGIBLE_VARIANT` (SCR-04)** and similar pilot-scale-specific errors should acknowledge the underlying cause in plain language (e.g., content library exhaustion) rather than a generic "something went wrong" — these are expected, documented conditions (§11.5.4), not bugs. The same applies to SCR-06's `409 SESSION_ROSTER_FULL` — plain language ("This session's roster is full") not a generic error.

---

## 12. Phase 1+ Screens (Parked)

Catalogued for continuity, not detailed to build-ready depth — do not let these block Phase 0 Figma work.

| ID | Screen | Phase | Source |
|---|---|---|---|
| SCR-27 | Multi-department team assignment (manual/self-select/auto-balanced) | 1 | §12.3 |
| SCR-28 | Elevator / floor navigation | 1 | §10.1, §10.2 |
| SCR-29 | Frontend Studio / DevOps Control Room / QA Lab (additional department rooms) | 1 | §10.1 |
| SCR-30 | Scoreboard wall | 1 | §10.2 |
| SCR-31 | Conference Room shared whiteboard | 1/2 | §10.2 |
| SCR-32 | Custom sub-team grouping | 1 | §12.3 |
| SCR-33 | SOC (Security Operations Center) | 2 | §10.1 |
| SCR-34 | Mentor's Office holo-table dashboard | 2 | §12.10 |
| SCR-35 | Spectator mode camera | 2 | §9.5, §12.10 |
| SCR-36 | Session timeline/replay debrief | 2 | §12.10 |
| SCR-37 | Voice chat UI | 3 | §12.6 |
| SCR-38 | Full cosmetic customization (hats, outfits, accessories) | 1/3 | §9.2 |
| SCR-39 | Badge/achievement system | 1 | §18 |
| SCR-40 | Layered-incident multi-check debrief ("found 2 of 3") | 2 | §8.3 |

---

## 13. Open UI/UX Decisions

Items this document could not fully resolve without a decision outside its scope — tracked here rather than silently guessed at, consistent with how the PRD/SAD/API Spec track their own open items.

1. **Display-name validation rule** (SCR-07) — length/profanity policy not fixed by PRD; needs a product decision.
2. **Multi-tab editing in the workstation editor** (SCR-14) — whether students can have more than one file open at once is not specified by PRD or API Spec.
3. **Ping duration/visibility window** (SCR-13) — not fixed by PRD.
4. **Dashboard visibility of a resource-limit-exceeded team** (SCR-15/SCR-22) — API§8.1's dashboard response doesn't currently surface this distinctly from a normal in-progress team; needs either an API Spec addition or an explicit decision to omit it from the teacher's live view (only visible in-session to the student, not the teacher).
5. **Reveal Fix endpoint** (§8) — no API exists yet; flagged for the API Spec's next revision.
6. **Zero-joiner session edge case** (SCR-15) — a session started with no students; not addressed by any source document.

---

## 14. Glossary

Reuses PRD§21 and DBD terminology verbatim; only UI-specific additions are listed here.

- **Shell** — the React App Shell layer (SAD§12).
- **HUD** — Heads-Up Display; the overlay layer rendered on top of the Babylon.js 3D scene.
- **Hybrid screen** — SCR-14 only; DOM content position-anchored to the 3D scene, architecturally distinct from both Shell and HUD (SAD§12).
- **Contextual prompt** — the reusable in-world interaction affordance defined in SCR-09, used by every object interaction in the product.

---

## 15. Figma File Structure

Suggested **Pages**, one per major section above, so the file mirrors this document 1:1:

1. `00 — Cover & Flow Map` — the §7 journey diagrams, rendered visually.
2. `01 — Auth & Account` — SCR-00 (all states: Idle, Authenticating, Auth-success, Auth-failure, Reduced-motion, WebGL-unavailable), SCR-01, SCR-06.
3. `02 — Teacher: Setup` — SCR-02 through SCR-05.
4. `03 — Teacher: Live Session` — SCR-15 through SCR-18.
5. `04 — Student: Onboarding & World Entry` — SCR-07, SCR-08.
6. `05 — In-World HUD Components` — SCR-09 through SCR-13 as a reusable component set.
7. `06 — Workstation` — SCR-14 and its states (SCR-22 lives here as a state, not a separate frame).
8. `07 — Debrief` — SCR-19, SCR-20, including the Reveal Fix control (§8).
9. `08 — System States` — SCR-21, SCR-23 through SCR-26.
10. `09 — Phase 1+ (Parked)` — §12 table, one placeholder frame per row.

Frame naming convention: `[ScreenID].[State]` — e.g., `SCR-14.ResourceLimitExceeded`, `SCR-19.Unresolved`.

---

## 16. Sign-off Checklist

- [ ] Every screen in §6 has all states from its table represented as a Figma frame.
- [ ] SCR-00's six states (Idle, Authenticating, Auth-success, Auth-failure, Reduced-motion, WebGL-unavailable) are all represented as Figma frames in Page `01 — Auth & Account`.
- [ ] §8's Reveal Fix control is present on SCR-19 and its downstream effect is present on SCR-20.
- [ ] §10's accessibility spike for SCR-08 has been scheduled/completed before SCR-08 is marked final.
- [ ] §13's open items have either been resolved or explicitly deferred with an owner.
- [ ] §9's traceability matrix has been spot-checked against the actual Figma frames (no orphaned requirement, no undocumented frame).

---

## 17. Changelog v1.0 → v2.0

- Restructured from a flat screen inventory into requirement-level screen specifications (Actor / Preconditions / Layout / Elements / States / Behavior / Data mapping / Accessibility / Traceability per screen), matching the PRD/SAD/API Spec/DBD documentation standard.
- Added §3 Design Principles, deriving eight numbered principles (P1–P8) directly from PRD requirements, referenced throughout §6 instead of re-explained per screen.
- Added §4 Personas → Primary Screens, closing the gap that v1.0 never connected screens back to PRD§6's named personas.
- Added §8, explicitly resolving PRD§13.3's UI decision deferred to this document (the "Reveal Fix" control) — v1.0 had listed this only as a bullet inside the debrief screen's description without resolving it, which did not actually satisfy what the PRD asked this document to do.
- Added §9 full requirements traceability matrix (screen ↔ PRD § ↔ API endpoint ↔ DBD entity), replacing v1.0's inline, inconsistent citations.
- Added §10 (consolidated accessibility) and §11 (content/tone guidelines), previously scattered inline without a canonical location.
- Added §13 Open UI/UX Decisions, surfacing six items v1.0 silently left undecided instead of flagging.
- Added §16 Sign-off Checklist and this changelog, matching the sign-off/changelog convention used by PRD v3.1 and SAD v1.3.
- Renumbered screens with stable IDs (SCR-01…SCR-26 for Phase 0, SCR-27+ for Phase 1+) so future revisions and the traceability matrix have a stable reference key, replacing v1.0's un-numbered table rows.

---

## 18. Changelog v2.0 → v2.1

Everything below surfaced from a systematic cross-check of every PRD/SAD/API/DBD citation in this document against the actual source documents — not a rewrite, a verification pass.

- **Fixed a wrong citation (SCR-03):** the claim that a roster starts empty because entries are created reactively at first session-join, not pre-populated, cited "PRD§3.1" — PRD §3 is Product Vision and says nothing about roster entries. Corrected to cite PRD§15.2 (class-scoped roster) and DBD§3.1/API§3.2 (the actual reactive-creation design), which is what the claim was really describing.
- **Fixed SCR-06's character-creation branching logic**, which was previously unimplementable: it described branching on "whether this roster_entry already has an appearance set," but API Spec v1.0's join response didn't return `appearance` at all. Raised as a real gap against the API Spec, which has since added the field (API Spec v1.1 §3.2) specifically to make this branch possible — SCR-06 updated to describe the corrected, now-implementable behavior, including the specific edge case (a student who never finished character creation) that branching on `created` alone would have gotten wrong.
- **Added the `409 SESSION_ROSTER_FULL` state to SCR-06**, which previously designed a "session full" state with no backing error code — `maxRosterSize` was accepted by the API but never enforced. Raised against the API Spec, which now enforces it and returns this code (API Spec v1.1 §3.2, §13); SCR-06 and §11's content guidelines updated to match.
- **Tightened §10 item 2's accessibility wording** to match PRD§16.5's actual requirement — the visual/caption equivalent for an audio cue belongs on the in-world object itself, not as a separate overlay; the previous wording didn't carry that specific constraint.
- Every other PRD/SAD/API/DBD citation in this document was checked against its source and confirmed accurate, including the load-bearing §8 "Reveal Fix" quote, which is verbatim from PRD§13.3 step 4.
- `Inputs` (header table) and every other in-document reference updated from API Spec v1.0 to v1.1, reflecting the two fixes above and every other v1.1 change (see API Specification v1.1's own changelog) — this document now correctly points to the version it actually depends on.
- §8's Reveal Fix endpoint gap remains genuinely open — it was not addressed by API Spec v1.1 (that revision's changes were unrelated, both surfaced by this same cross-check pass) — still flagged for a future API Spec revision, not resolved here or there yet.

---

## 19. Changelog v2.1 → v2.2

This revision adds SCR-00 (Building Exterior / Access Panel) as the application's first-rendered state, aligning UIUXD with PRD v3.2 §10.4, SAD v1.4 §12, TDD v1.2 §9.1, GDD v1.1 §4.2, and AWDD v1.1 §4.0. No API contracts, data models, or backend architecture changed.

| Area | Change |
|---|---|
| §5 | Extended the UI layer taxonomy from three types to four, adding **`[3D/Entry]`** for the pre-auth Babylon.js canvas. Updated the opening sentence to reference SAD§12's three-layer model. |
| §6 (new SCR-00) | New screen specification: **SCR-00 — Building Exterior / Access Panel** `[3D/Entry]`. Specifies the access panel card in teacher and student variants, six named states (Idle / Authenticating / Auth-success / Auth-failure / Reduced-motion / WebGL-unavailable), panel visual design requirements, role-determination via URL, and accessibility requirements for the overlaid form. |
| SCR-01 | Added `[3D/Entry]` canvas note and a cross-reference to SCR-00 clarifying that SCR-01 is the teacher-role content variant of the SCR-00 panel, not a separate screen. |
| SCR-06 | Added `[3D/Entry]` canvas note and a cross-reference to SCR-00 clarifying that SCR-06 is the student-role content variant of the SCR-00 panel, not a separate screen. |
| §7 | Updated §13.1 and §13.2 journey sequences to begin with SCR-00 (teacher variant and student variant respectively) rather than SCR-01 and SCR-06. |
| §9 | Added SCR-00 as the first row in the requirements traceability matrix. Updated SCR-01 and SCR-06 row labels to note they are role variants of SCR-00. |
| §15 | Updated Page 2 (`01 — Auth & Account`) to include SCR-00 and its six states alongside SCR-01 and SCR-06. |
| §16 | Added a sign-off checklist item for SCR-00's six Figma states. |
