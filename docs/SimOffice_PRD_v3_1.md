# SimOffice — Product Requirements Document (PRD)

**A 3D Virtual Company for Collaborative Cybersecurity & Debugging Training**

| | |
|---|---|
| **Document type** | Product Requirements Document — requirement-level for the full product; explicitly **not** a System Architecture, Database, API, or UI/UX document (those are separate downstream deliverables — see [Section 22](#22-open-technical-decisions--downstream-documents)). |
| **Version** | 3.1 (Refined after cross-review against SAD v1.1 and TSSD v2.1, Pilot Editions) |
| **Owner** | [Your Name / Team] |
| **Status** | Ready to build against — Phase 0 pilot scope confirmed; remaining open items are process/verification steps (§23), not unresolved requirements. |

> **What changed in v3.0 (see full changelog in [Section 24](#24-changelog-v20--v30)):** Added Phase 0 exit criteria and effort sizing (§5), two missing personas (§6), tamper-resistance and execution-time requirements to the core mechanic (§8), an accessibility resolution note for movement (§9), a resolved onboarding/lobby ambiguity (§10), teacher account provisioning and numeric content targets (§11), a measurement mechanism for contribution tracking and conflict/disconnect handling (§12), failure-path and edge-case journeys (§13), an expanded data model with retention policy (§15), a Privacy & Compliance section (§16.6, new), baseline-setting process and target ranges for NFRs (§16), metric baselines (§17), two new risks — compliance and sandbox cost (§19) — and a new closing section listing exactly what is explicitly deferred to the Architecture/Backend/Design documents that follow this PRD (§22), so the next set of documents has a clean, unambiguous starting point.
>
> **What changed in v3.1 (see full changelog in [Section 25](#25-changelog-v30--v31)):** closed four gaps surfaced by reviewing the resulting SAD/TSSD against this PRD — an explicit per-environment resource-ceiling requirement so isolation covers *capacity* denial-of-service, not just network/filesystem isolation (§8.1, new §8.6); tightened §16.2 so "informal" baseline testing at pilot scale still has to produce the three actual numbers, not a subjective impression; a hard gate in §16.6 requiring the deployment's real participant age range to be confirmed and documented before any compliance shortcut is taken, rather than assumed; and a new risk entry (§19) for unbounded student-code resource consumption.

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Product Vision](#3-product-vision)
4. [Goals & Non-Goals](#4-goals--non-goals)
5. [MVP Scope, Phased Rollout & Exit Criteria](#5-mvp-scope-phased-rollout--exit-criteria)
6. [Target Users & Personas](#6-target-users--personas)
7. [Core Concept](#7-core-concept)
8. [The Core Mechanic — Workstations, Issue Injection & Verification](#8-the-core-mechanic--workstations-issue-injection--verification)
9. [The Avatar — Character System](#9-the-avatar--character-system)
10. [World & Environment Design](#10-world--environment-design)
11. [Roles, Permissions & Content Pipeline](#11-roles-permissions--content-pipeline)
12. [Detailed Feature Set](#12-detailed-feature-set)
13. [End-to-End User Journeys (Including Failure & Edge Paths)](#13-end-to-end-user-journeys-including-failure--edge-paths)
14. [Difficulty & Injected-Issue Taxonomy](#14-difficulty--injected-issue-taxonomy)
15. [Data Model & Accounts (Requirement Level)](#15-data-model--accounts-requirement-level)
16. [Non-Functional Requirements](#16-non-functional-requirements)
17. [Success Metrics & Instrumentation](#17-success-metrics--instrumentation)
18. [Gamification & Progression](#18-gamification--progression)
19. [Risks & Assumptions](#19-risks--assumptions)
20. [Out of Scope / Future Enhancements](#20-out-of-scope--future-enhancements)
21. [Glossary](#21-glossary)
22. [Open Technical Decisions & Downstream Documents](#22-open-technical-decisions--downstream-documents)
23. [Sign-off Checklist](#23-sign-off-checklist)
24. [Changelog v2.0 → v3.0](#24-changelog-v20--v30)
25. [Changelog v3.0 → v3.1](#25-changelog-v30--v31)

---

## 1. Executive Summary

SimOffice is a browser-based, multiplayer 3D simulation that recreates the experience of working inside a real software company. Students control a fully animated, physics-driven 3D character — playful and expressive in the spirit of games like *Fall Guys* — who walks, jumps, and roams a virtual office building made up of distinct departments (Frontend, Backend, DevOps, QA). A teacher acts as the "company's" engineering director: they open a session, assign a project, set a difficulty level, and deliberately plant a bug, vulnerability, or malicious script somewhere in that project's codebase. Students, organized into department-based teams, must explore the building, gather context, sit down at an in-world workstation, and collaborate in real time to detect, diagnose, and resolve the injected issue — the same way a real engineering team would respond to a live incident.

The product's core bet is that **spatial presence and playful embodiment** (a character you control, a place you walk through, teammates you can literally see beside you) make collaborative technical learning more engaging, more memorable, and closer to the reality of professional engineering culture than a flat, form-based classroom tool. This is a testable claim, not a slogan — it is tied directly to the satisfaction and engagement metrics in [Section 17](#17-success-metrics--instrumentation), and Phase 0 exists specifically to test it before further investment (§5).

The full vision described in this document is a multi-phase build, not a single release — see [Section 5](#5-mvp-scope-phased-rollout--exit-criteria) for what actually ships first, with explicit go/no-go criteria between phases.

---

## 2. Problem Statement

- Cybersecurity and debugging are usually taught through static, individual exercises: a sanitized snippet of code, a single "correct" answer, no time pressure, no teammates.
- Real engineering incidents are almost never solved alone. They involve triage, communication across roles (frontend, backend, infra), shared context, and pressure.
- Existing classroom tools (LMS quizzes, isolated coding sandboxes, slide-based lessons) don't simulate *team* dynamics or *organizational* structure, and they don't feel like a place — there's no sense of "being at work."
- Teachers have very little tooling to construct a realistic, controllable "live incident" scenario for a class, and even less ability to watch how a team behaves under pressure in real time.

**Opportunity:** build a persistent, playful, spatial "company" that a teacher can populate with a live incident, and that students inhabit together — turning a debugging exercise into a shared, embodied, memorable experience.

---

## 3. Product Vision

> Give every student a body in a shared virtual workplace, and give every teacher a control room to script that workplace's problems — so that learning to debug and secure software feels like *being part of a team*, not filling out a worksheet.

SimOffice should feel less like "educational software" and more like a lightweight multiplayer game that happens to teach real engineering and security skills. The tone is warm, a little silly, and highly social at the surface (bouncy characters, a building you can explore, emotes, cosmetics) — while the underlying task (finding and fixing a real defect under a teammate's watchful eye) is genuinely rigorous.

---

## 4. Goals & Non-Goals

### 4.1 Goals

- Make collaborative debugging and secure-coding practice feel social, spatial, and fun rather than clinical.
- Give teachers a simple way to construct a "live incident" — pick a project, pick a difficulty, pick what's broken — without needing to hand-write a new exercise every time.
- Let students *see* their teammates, their department, and the shared mission in one persistent space instead of switching between disconnected tools.
- Produce a realistic sense of organizational roles (a Frontend student genuinely only sees the frontend part of the problem at first, same for Backend/DevOps/QA) so students learn to communicate across specialities, not just code alone.
- Give teachers visibility into team behavior during a live session (who's stuck, who's collaborating, how far each team has progressed).

### 4.2 Non-Goals

- SimOffice is **not** a certified security-training or compliance product (e.g., not a substitute for formal penetration-testing certification).
- SimOffice is **not** trying to be a general-purpose game engine or metaverse platform — the world exists only to serve the learning session.
- SimOffice does not attempt to simulate arbitrary real company infrastructure; the "departments" and "incidents" are curated teaching scenarios, not open-ended real-world systems.
- No production/real-world systems are ever touched — every exercise happens inside a disposable, isolated practice environment built for the session.
- v1 is **not** attempting cross-department full-stack incidents, voice chat, or a broad scenario library — see Section 5.
- This PRD is **not** a technology or architecture decision document. It defines *what* must be true of the system; *how* it is built (engine, hosting, sandboxing technology, networking protocol) is decided in the downstream documents listed in [Section 22](#22-open-technical-decisions--downstream-documents), against the requirements fixed here.

---

## 5. MVP Scope, Phased Rollout & Exit Criteria

The full product described in this document is a large, multi-phase build. Shipping it as one release is the single biggest execution risk (see [Risks](#19-risks--assumptions)). This section defines what ships first, how big that first slice is expected to be, and — new in v3.0 — **the measurable bar each phase must clear before the next phase is funded.**

### 5.1 Phase 0 — MVP ("Prove the mechanic, prove the space")

**Goal:** validate that the core loop (walk → sit → find issue → fix → verify → debrief) is fun and pedagogically sound, with the smallest world that can carry it, and validate that the core mechanic is technically buildable within an acceptable cost and performance envelope on the target hardware baseline.

**In scope:**
- **One department only**: Backend. (Chosen because it has the clearest, most self-contained "read code → find the bug → run a check" loop, with no cross-department dependency to design around yet.)
- **One project scenario, one difficulty tier (Beginner)**, one issue category (logic bug — no security-vulnerability content yet, to avoid content-review overhead in the first release).
- **Single-department mode only** (§12.3) — the whole class in one room, no department routing/elevator logic needed yet. Sub-team splitting within a single department (running several independent copies of the same incident for comparison) is **deferred to Phase 1** — it is listed under "Single-department mode" in §12.3 as a target-state capability of that mode, but is not required for the Phase 0 build.
- Character creation, free-roam movement, sit-at-workstation, and the core interaction loop from Section 8.
- The onboarding "first day at work" tutorial course (§9.4) **is in Phase 0 scope** — first-time users need some way to learn movement/interaction controls before their first real session, and Phase 0 is exactly the release where "can students even walk/sit/use the workstation comfortably" is being tested. It can be a minimal version (a short corridor teaching move/jump/sit/interact) rather than the full elaborate course described in §9.4; the elaborate version is a Phase 1+ polish item.
- Text chat only (proximity or department-wide) — **no voice chat in MVP**.
- **Mission briefing display**: a minimal display (e.g., a simplified notice board or HUD overlay) to satisfy the briefing requirement in §7 and §12.7. The full notice board and scoreboard wall remain deferred to Phase 1.
- Manual teacher dashboard: a simple roster/status list (who's seated, who's submitted) — the full "holo-table war room" (§12.10) is deferred.
- Basic automated verification against one predefined issue per scenario (see Section 8.3), including the tamper-resistance requirement in §8.5 (new).
- Post-session debrief as a simple summary screen, not the walkable in-world timeline — **and must include the failure-path outcome** (§13.3): a defined, non-punitive screen for a team that does not resolve the issue before time runs out.
- Handling for late join, disconnect/reconnect, and simultaneous-desk conflicts (§12.13, new) — these are not deferrable; they will occur in the first real classroom session.

**Explicitly deferred to later phases:** multi-department scenarios, the elevator/floor system, SOC and Conference Room, spectator mode, gamification/cosmetics beyond a name tag, security-vulnerability and malicious-script content, layered/multi-issue incidents, scenario library beyond one project, session replay, voice chat, sub-team splitting within a department.

**Effort sizing (indicative, to be firmed up once Section 22's architecture decisions are made):** Phase 0 spans at least four distinct engineering disciplines that do not fully parallelize against a single "core mechanic" team — 3D/multiplayer client engineering, backend/session-orchestration engineering, sandboxed code-execution/security engineering, and one content author producing the single required scenario under the pipeline in §11.5. Any Phase 0 estimate produced before the Architecture Document (§22) exists should be treated as provisional; the architecture spike on the code-execution sandbox (§8.1, §19) is the item most likely to move the estimate materially in either direction and should be timeboxed and completed **before** the rest of Phase 0 is scheduled.

### 5.2 Phase 0 Exit Criteria (new in v3.0)

Phase 1 is funded only if Phase 0, run with at least one real class section, clears all of the following, measured via the instrumentation in §17:

1. **Completion:** at least 60% of teams reach a full or partial verified fix (§8.3) within the session time limit. (Threshold is a starting hypothesis for the pilot, not a permanent target — revisit after the first pilot cohort.)
2. **Technical stability:** no session-breaking desync, environment-provisioning failure, or verification-service outage in more than 10% of sessions run during the pilot.
3. **Device baseline validity:** the minimum spec set via the test plan in §16.2 is confirmed sufficient by actual classroom hardware — i.e., no pilot class is unable to run the MVP on its existing device fleet.
4. **Teacher sentiment:** post-session teacher rating (§17) is net positive, and at least one pilot teacher indicates willingness to run a second session.
5. **Student engagement signal:** average session duration and emote/chat activity (§17) indicate students are actually using the social/spatial layer, not just treating it as a slow code editor.

If criteria 1–3 (mechanic works, technically stable, runs on target hardware) are not met, Phase 1 world-building investment should **not** proceed regardless of criteria 4–5 — the spatial/social layer is only worth building out further if the core mechanic itself is proven.

### 5.3 Phase 1 — Multi-department core loop
Add Frontend, DevOps, QA rooms; the elevator/floor system; department-scoped "slices" of one project; the notice board and scoreboard wall; auto-balanced team assignment; sub-team splitting within a department (§12.3); basic gamification (XP, a handful of badges); numeric content-authoring targets per §11.5.4.

### 5.4 Phase 2 — Full incident realism
Security-vulnerability and malicious-script issue categories (with the content-review workflow from §11.5 in place first, **and** the content-liability/legal review from §19 completed specifically for the malicious-script category before any such content is authored); layered/multi-issue incidents; SOC room and cross-team huddle tools; teacher spectator mode and the holo-table dashboard; session replay/timeline debrief.

### 5.5 Phase 3 — Scale & polish
Full scenario library across the technology domains in §12.4; voice chat (with the text-equivalent accessibility requirement in §16.5 built in from day one of that feature, not retrofitted); single-department sub-team racing mode; cosmetic economy; wall of fame; institution-admin features.

### 5.6 Why this order
Backend-only, Beginner-only, single-scenario is deliberately the smallest slice that still tests the thing that's actually novel about SimOffice (embodied, spatial, socially-visible debugging) rather than the parts that are well-understood game-dev territory (avatars, movement, chat). If the core loop doesn't land against the exit criteria in §5.2, later phases should be re-evaluated before more is built.

---

## 6. Target Users & Personas

### Persona 1 — "Mentor Priya," the Teacher / Instructor
- Teaches a software engineering, secure coding, or systems course.
- Wants a way to run a hands-on lab that isn't "everyone silently solves the same worksheet."
- Needs to prepare a session quickly, choose difficulty appropriate to the class level, and be able to watch progress without micromanaging every student.
- Cares about being able to reuse and slightly vary sessions across multiple class sections.

### Persona 2 — "Student Rahul," a Team Contributor
- Comfortable with code but has limited experience debugging under pressure or in unfamiliar codebases.
- Wants to feel like part of a team, not graded in isolation.
- Responds well to game-like feedback: seeing progress, earning recognition, customizing an avatar.
- May be assigned a department that isn't their strongest skill area (e.g., a backend-leaning student placed in DevOps for the session) and needs to lean on teammates.

### Persona 3 — "Content Author Dev" (new in v3.0)
- An internal curriculum/scenario designer (or vetted partner in later phases), distinct from the Teacher role (§11.4).
- Writes a scenario as a real, small, runnable codebase: a fix baseline, one or more broken variants, and a verification check that reliably distinguishes "the real defect is fixed" from "the check was disabled or coincidentally satisfied" (§8.5).
- Is measured on throughput against the numeric targets in §11.5.4 and on review-gate pass rate (§11.5.2) — a scenario that repeatedly fails correctness review is a signal the authoring format or tooling needs improvement, not just a one-off content fix.
- Needs authoring documentation, a review-gate SLA, and (from Phase 1 onward) a "which variants have been used in which section" reuse tracker so no class sees a repeated incident (§11.5.3).

### Persona 4 — "IT/Procurement Admin Alex" (new in v3.0)
- Not a daily user of the product, but the person who approves whether SimOffice can run on the school's device fleet and network, and who signs off on data-handling practices before any class can be onboarded.
- Cares about: the minimum device spec (§16.2) matching what the school actually owns, network/firewall requirements for the multiplayer and code-execution backend, and a clear answer to "what student data is collected and how long is it kept" (§15, §16.6).
- Is a blocking stakeholder for go-to-market even though they never open the product themselves — a persona this PRD did not previously account for.

---

## 7. Core Concept

SimOffice models a fictional software company as a physical building with a shared lobby and separate department floors/rooms. Every class session is a **run**:

1. A teacher opens a new **session** (a fresh instance of the company, tied to one class/lab period).
2. The teacher picks a **project scenario** (e.g., "e-commerce checkout service," "internal chat app," "IoT device dashboard") and a **difficulty tier**.
3. The teacher selects — or lets the system randomly assign, within the chosen difficulty — one or more **injected issues**: a logic bug, a security vulnerability, or a malicious script hidden somewhere in that scenario's codebase.
4. Students join the session as characters, are sorted into department teams (Frontend / Backend / DevOps / QA), and spawn in the building's lobby.
5. A mission briefing appears (posted on an in-world notice board and the department's own monitor wall) describing the symptom of the incident from a user's perspective — never the underlying cause. Students must discover the cause themselves.
6. Students roam to their department's room, sit at a workstation to access their part of the project, and collaborate — moving between rooms, pinging teammates, and comparing notes — until the team collectively identifies and resolves the issue, or the session time limit is reached (see the failure-path journey in §13.3).
7. The session ends with a debrief: what broke, who found what, how long it took, and what could have been done differently — regardless of whether the team succeeded.

---

## 8. The Core Mechanic — Workstations, Issue Injection & Verification

This section is requirement-level, not a technical architecture document — but it is specific enough that engineering can scope a technical feasibility spike from it. The actual choice of sandboxing technology, execution infrastructure, and cost model is deferred to the Architecture Document (§22); what follows are the **behaviors that document must satisfy.**

### 8.1 What a scenario actually *is*

Each **project scenario** in the library is authored as a real, runnable, small codebase (e.g., a small web service with a frontend, backend, and a handful of tests) plus a **fix baseline** (the correct, working version) and one or more **authored issue variants** — versions of that codebase with a specific, known defect deliberately introduced by a content author, each tagged with its difficulty and category (§14).

At session start, the platform provisions one **disposable, isolated environment instance** of the chosen issue variant per team (or per department, in multi-department mode) — not a shared environment, so one team's actions never affect another's, and nothing is shared with or reachable from any real system.

**Requirement (unchanged, restated for clarity):** the isolation mechanism must guarantee no network path from a provisioned environment to any real production system, any other team's environment, or the public internet beyond what a specific scenario explicitly requires (e.g., installing declared dependencies at provisioning time). The specific technology used to guarantee this (containers, microVMs, WASM sandboxes, etc.) is an Architecture Document decision, not fixed here.

### 8.2 What a student does at the workstation

Sitting at a workstation opens that department's slice of the running environment on the in-world monitor. Concretely, this is:
- A **read/browse view** of the relevant part of the codebase (file tree + code viewer, scoped to that department's area — e.g., Backend students see backend service code, not the frontend repo).
- The ability to **edit** the code in that view.
- The ability to **run** a predefined check (a test suite, a linter, a "reproduce the symptom" script — whichever the scenario author configured) and see the result in-world, without leaving the character's seated position.
- A **submit for verification** action once the team believes they've found and fixed the issue.

This is a real, working development surface (not a static snippet), scoped down to look and feel like "my corner of the company's codebase," rendered inside the in-world monitor rather than a separate browser tab.

**Requirement (new):** a check run must return a result within a bounded time that keeps the experience feeling responsive while seated (target: single-digit seconds for a Beginner-tier check; the exact ceiling per difficulty tier is set alongside the device baseline in §16.2, since it is jointly a UX and an infrastructure-capacity decision).

### 8.3 How verification works

Each authored issue variant ships with a **verification check** written by the content author at authoring time — most commonly an automated test (or small test suite) that fails against the broken variant and passes only once the actual injected defect is fixed. This is what "automated check confirms whether the actual injected issue has been resolved (not just the code changed)" means concretely: the check targets the specific defect, so an unrelated code change won't accidentally pass it, and a correct fix that looks different from the "reference" fix still passes as long as it resolves the real defect and doesn't break the check.

- **Partial credit** (§12.9 in the original feature list) is derived from narrower diagnostic checks the author can optionally include — e.g., "did the team correctly identify which file/function the issue is in" — separate from the full-fix check.
- **Layered/multi-issue** scenarios (Phase 2+) ship one verification check per injected issue, tracked independently, so the debrief can show "found 2 of 3."

### 8.4 What content authors need to produce per scenario (input to §11.5)

For each issue variant: the broken codebase, the fix baseline, the verification check(s), the mission-briefing symptom text, and its difficulty/category tags. This is the unit of work the content pipeline (§11.5) is built around.

### 8.5 Verification integrity / tamper resistance (new in v3.0)

A real and predictable classroom behavior is a team attempting to "pass" verification by disabling, deleting, or rewriting the check itself rather than fixing the underlying defect. This must be designed against, not left as an implicit assumption:

- **Requirement:** the verification check(s) for a scenario must run against a **protected copy** the student cannot edit through the workstation's code-editing surface (§8.2) — students edit the application code; they do not have write access to the check that grades it.
- **Requirement:** the verification result must be computed server-side (or in an environment the student cannot directly observe/modify the execution of), not trusted from a client-reported result.
- This requirement directly informs the Architecture Document's sandbox design (§22) — the sandbox must support "student-editable application code" and "author-controlled, student-invisible-to-tamper verification code" as two distinct trust zones within the same provisioned environment.

### 8.6 Resource ceilings on provisioned environments (new in v3.1)

Isolation (§8.1) guarantees a team's environment can't *reach* another system. It does not by itself guarantee a team's environment can't *starve* the shared infrastructure it runs on — a runaway loop, an accidental fork bomb, or a memory leak in student-submitted code is an expected classroom occurrence in a debugging exercise, not an edge case, and at pilot scale (§22, TSSD) multiple teams' environments and the platform's own services may share one physical/virtual host.

- **Requirement:** every provisioned environment instance must run under an enforced CPU, memory, and wall-clock execution ceiling, set at provisioning time and independent of whether the underlying sandbox technology is a managed service or self-hosted (§22). A team exceeding the ceiling must have that specific environment instance contained or terminated without affecting any other team's environment or the platform's own services (session orchestration, database, real-time sync).
- **Requirement:** exceeding the ceiling is a defined, visible outcome for the affected team (e.g., the run is stopped and reported as a resource-limit failure), not a silent hang or an ambiguous timeout indistinguishable from a slow-but-legitimate check.
- This is a capacity-isolation requirement, distinct from but equally load-bearing as the network/filesystem isolation in §8.1 — the Architecture Document's sandbox design (§22) must size and enforce concrete limits, not just assert that isolation exists.

---

## 9. The Avatar — Character System

This is a headline feature of the product and central to its identity: **students are not represented by a name in a list — they are a physical, animated character in a shared 3D space.**

### 9.1 Look & feel
- Characters are stylized, rounded, toy-like figures — closer to *Fall Guys* or *Overcooked* than a realistic human avatar. This keeps the art approachable, fast to produce, and deliberately non-intimidating.
- Bouncy, slightly exaggerated physics: characters wobble on landing, squash-and-stretch when jumping, and can bump into each other and teammates in a harmless, comedic way.
- No literal likeness of real people — every character is a customizable persona, not a photo-real avatar.

### 9.2 Customization
- Body color/pattern, hat/headwear, outfit, and a small set of accessories (badge, backpack, ID lanyard themed to their department).
- A visible name tag and department-color trim above/on the character so teammates can identify each other at a glance.
- Cosmetic items are earned through participation and achievements (see [Gamification](#18-gamification--progression)) rather than being pay-gated — this is an educational product, not a monetized game. Full cosmetic economy is Phase 3 (§5.5); MVP ships with a name tag only.

### 9.3 Movement & interaction
- Free-roam movement across the building: walk, run, jump, and simple traversal (climb small steps, hop over low obstacles) to keep the world feeling playful rather than a static menu system.
- Characters can perform lightweight social **emotes** (wave, thumbs up, facepalm, "thinking" pose) to communicate quickly without breaking focus to type.
- Characters physically **sit down** at a workstation to signal "I am now working on this," which is visible to teammates and the teacher as a status cue.
- Proximity matters: being physically near a teammate's character enables lightweight interactions (a quick huddle, a shared whiteboard, proximity voice chat — see [Collaboration Tools](#12-6-collaboration--communication-tools); voice is Phase 3, text chat covers this in earlier phases).

### 9.4 Onboarding course
- First-time users pass through a short, obstacle-course-style "first day at work" tutorial area — deliberately reminiscent of a Fall-Guys-style course — that teaches movement, interaction, and basic controls in a low-stakes, fun way before their first real session. **This is in Phase 0 scope in a minimal form** — see §5.1; the full elaborate course is a later-phase polish item.

### 9.5 Teacher's presence
- The teacher can also inhabit a character and walk the building alongside students (visible, approachable presence), or switch to a **spectator/overhead mode** to observe multiple rooms at once without being physically present. Spectator mode ships in Phase 2 (§5.4); MVP's dashboard is a simple status list.

### 9.6 Accessibility resolution for movement (new in v3.0)

§16.5 requires full functionality to be reachable via keyboard alone, which is a real design constraint on a platforming-style movement model (jump/traverse obstacles is historically hard to make keyboard-equivalent to a controller/mouse experience). This is called out explicitly as a **design requirement, not yet a solved design**:

- **Requirement:** every traversal challenge in the onboarding course, and every path a student *must* take to reach a required destination (a department room, a workstation, the notice board), must be completable via keyboard-only input without requiring precision timing beyond what a standard keyboard-only platformer accessibility pattern supports (e.g., generous jump windows, no frame-perfect inputs).
- **Requirement:** an accessibility design spike (movement/traversal specifically) must be completed and reviewed before the onboarding course or building traversal is considered final, not validated only after full build.

---

## 10. World & Environment Design

### 10.1 Building layout
- **Building Exterior / Headquarters Entrance** — the first thing any user sees when they navigate to SimOffice. Before a user reaches the Lobby, they are presented with the exterior of the SimOffice headquarters building — rendered live in the browser as a 3D environment. The authentication interface appears as a floating access panel integrated into the entrance, designed to feel like requesting access to enter the building rather than filling out a web form. The exterior uses a premium, architectural visual style — modern corporate-headquarters quality — that is deliberately distinct from the playful, toy-like interior. On successful authentication, a seamless camera move carries the user through the entrance and into the Lobby, where the visual language transitions to SimOffice's signature stylized aesthetic. This crossing-the-threshold moment is intentional: *outside is premium and corporate; inside is the SimOffice simulation world.* The contrast makes entering the building meaningful. Both teachers and students enter through the same building and the same entrance; role differentiation is expressed only through the access panel content, reinforcing that everyone exists in the same persistent shared company. *(Phase 0; see §10.4 for full requirements.)*
- **Lobby / Reception** — spawn point, session info, and access point ("elevator") to department floors. Hosts the (Phase 0, minimal-form) onboarding course per §9.4. *(MVP: since there is only one department, there is no elevator/floor routing to build yet. Students pass through the lobby and onboarding course once, then spawn directly into the Backend department's room for all subsequent session entry — the lobby is a one-time onboarding space in Phase 0, not a persistent hub they return to each session. The persistent hub-and-elevator behavior begins in Phase 1 once multiple departments exist.)*
- **Department rooms** — one themed room per discipline. *(MVP ships Backend only; the other three are Phase 1.)*
  - **Frontend Studio** — bright, screen-covered walls showing live UI previews.
  - **Backend Engine Room** — server-rack aesthetic, pipe/data-flow motifs.
  - **DevOps Control Room** — dashboards, pipeline monitors, big status boards.
  - **QA Testing Lab** — checklists, test rigs, a "bug jar" motif.
- **Security Operations Center (SOC)** — a shared, cross-department room where the live incident's overall status is displayed, and where cross-team huddles naturally happen. *(Phase 2.)*
- **Conference Room** — for scheduled team stand-ups / mid-session syncs. *(Phase 1.)*
- **Mentor's Office** — the teacher's home base; a place students can walk to for help, distinct from teacher spectating. *(Phase 2, alongside the holo-table dashboard.)*

### 10.2 Interactive Objects — How They Work

Every interactive object in the building follows the same core loop, so the world always feels consistent: a character walks within range of the object, a small contextual prompt appears in-world (never a browser-style popup), interacting triggers the object's behavior, and the object visibly changes state **for everyone in the room** — nothing important happens behind a hidden menu that only one person can see. This is deliberate: it's what makes the space feel like a real, shared room instead of a lobby screen with 3D wallpaper.

- **Workstation / computer desk** — the primary interaction point. See [Section 8](#8-the-core-mechanic--workstations-issue-injection--verification) for what the workstation actually opens.
  - *Trigger:* walk up to an empty desk and interact; the character visibly sits down.
  - *Behavior:* the desk's monitor — a real object in the scene, not an overlay — lights up and becomes that student's focused workspace, showing their department's slice of the project directly on the in-world screen.
  - *Social visibility:* teammates and the teacher see the character seated, the monitor glowing, and a small "actively working" light above the desk — so who's heads-down is always obvious at a glance, without opening any panel.
  - *Leaving:* standing up returns the character to free-roam instantly; workstation session state (cursor position, open tabs) is saved automatically to that student, while code edits are synchronized to the team's shared environment.
  - *Conflict handling (new, see §12.13):* if two students attempt to sit at the same desk simultaneously, the desk resolves to a single occupant deterministically (first valid interaction wins) and the second student receives immediate in-world feedback that the desk is occupied, with a prompt toward the nearest free desk.

- **Notice board / monitor wall** — the mission-briefing surface.
  - *Trigger:* walk close enough to read it, or interact to bring it into full focus.
  - *Behavior:* shows the current incident briefing as a wall-mounted screen/poster that updates live, in place, the moment a teacher pushes a new report — no separate tab, no popup.
  - *Social visibility:* a soft chime and a brief highlight flash plays across the board when new content lands, noticeable to everyone in the room without interrupting movement or forcing a menu open, and paired with an in-world caption for the chime (see Accessibility, §16.5).

- **Scoreboard wall** — ambient progress tracking. *(Phase 1.)*
  - *Trigger:* passive — always visible from across the room, like a real office monitor wall.
  - *Behavior:* team/department progress is rendered as physical in-world visuals (e.g., filling gauge or tube-style meters mounted on the wall) rather than a flat HTML progress bar, so progress is felt spatially and can be read from a distance while walking past.

- **Server rack / status props** — the room's "vital signs." *(Phase 2, alongside the DevOps room and SOC.)*
  - *Trigger:* passive/ambient, always live in the DevOps room and the SOC.
  - *Behavior:* lights flicker and a warning-colored glow spreads across nearby props while the injected issue is still unresolved, accompanied by a subtle alarm tone (with an in-world caption alternative); everything settles to a calm, steady glow the instant the team's fix is verified. The incident's state is always physically present in the room, never hidden in a log file.

- **Meeting table (Conference Room / SOC)** — shared collaboration surface. *(Phase 1/2.)*
  - *Trigger:* two or more characters gather around it and interact together.
  - *Behavior:* a shared whiteboard rises from the table as a real 3D object teammates literally stand around, on which anyone present can sketch or jot notes visible to the whole group in real time — mirroring an actual stand-up meeting.

- **Elevator / floor panel** — spatial navigation, not a menu jump. *(Phase 1, once more than one department exists.)*
  - *Trigger:* interact with the panel inside the lobby elevator.
  - *Behavior:* the character rides a short, animated elevator transition to the chosen department floor. Movement between departments is always a physical journey through the building, preserving the sense of one continuous place rather than teleporting through a flat menu.

### 10.3 Tone of the incident
- Symptoms are told through in-world "customer reports" or "monitoring alerts" (e.g., a notice board entry reading "Users report the checkout button does nothing") — never a direct description of the underlying bug. This preserves the diagnostic challenge.

### 10.4 Building Exterior (new in v3.2)

The headquarters exterior is a first-class product space and SimOffice's opening act. It is not a loading screen or a transitional placeholder — it is the moment of arrival, and its design requirements carry the same weight as any interior space.

- **Visual identity (exterior):** The exterior uses a premium, architectural aesthetic — deliberately distinct from the interior's playful, rounded, toy-like style. Clean geometry, cool neutral palette (whites, greys, deep architectural blues), glass entrance panels, legible SimOffice branding above the entrance, and subtle professional lighting. This is intentional artistic contrast, not visual inconsistency: the exterior conveys *"I am entering a real technology company"*; crossing the threshold conveys *"I am now inside the SimOffice simulation."*
- **Visual transition at the threshold:** As the entry camera crosses the entrance, the visual language shifts from the exterior's architectural aesthetic to the interior's saturated, toy-like, storybook-lit style. This transition is the architectural expression of entering the simulation. It must be designed as a deliberate shift in material and lighting properties, not an abrupt scene swap.
- **Access panel:** A digital terminal integrated into the entrance wall beside the doors. Two content variants — both use the same physical prop and the same building environment:
  - *Teacher:* panel header reads **"Administration Access — Staff Login"**; form fields for email and password.
  - *Student:* panel header reads **"Join Session"**; form field for the 6-character join code.
- **Ambient life:** The exterior scene is alive before any user interaction — subtle ambient animations (interior light visible through glass panels, a gentle entrance-area light shift, slow signage glow cycle) establish that SimOffice is a living company, not a screensaver.
- **Entry transition:** On successful authentication, the entrance doors open and a 2-second camera advance carries the user through the entrance into the Lobby. This animation runs concurrently with post-auth world loading — it adds no measured latency to the join flow.
- **Reduced-motion requirement (§16.5):** All ambient animations and the entry camera advance must have reduced-motion fallbacks. If `prefers-reduced-motion: reduce` is set or the device cannot sustain smooth animation at baseline performance tier (§16.2), all motion is replaced with instant state changes and opacity fades. This is a hard accessibility requirement.
- **WebGL fallback:** If WebGL is unavailable, the login and join forms must function as standalone 2D screens with a static image of the building exterior as the background. The 3D entry experience is progressive enhancement — no functionality is gated on it.
- **Performance:** The exterior asset bundle must render within 3 seconds of page load on baseline (Chromebook-class) hardware and must contribute no more than 2MB to the initial scene load budget (§16.2, AWDD §4.0).

---

## 11. Roles, Permissions & Content Pipeline

### 11.1 Teacher / Mentor
- Create and configure a session (project, difficulty, injected issue(s), duration).
- Invite students via a join code or link.
- Full control over how the class is organized into departments for the session — see [Department Assignment Modes](#12-3-department--team-assignment) — including splitting the class across all departments, or running the whole class as a single department when that better fits the lesson.
- Start, pause, extend, or end a session — **including ending a session early with teams still unresolved** (§12.13); the system must produce a valid debrief in this case, not an error state.
- Observe live progress per team/department (status, not raw code by default — see [Teacher Dashboard](#12-10-teacher-dashboard--observability)).
- Send in-world announcements (new "customer report," a hint, a time-check) to the notice board.
- Review post-session results and export a debrief summary.

**Requirement (new — account provisioning):** teachers gain access via an institution-issued or self-service account (exact mechanism — school SSO integration, admin-approved signup, or code-based lightweight account — is an Architecture Document decision, §22), but the PRD-level requirement is that **no student data collection begins until a teacher account has been through whatever approval step the deployment context requires**, and that a teacher can be deprovisioned (and their sessions' data handled per §15.5) if their institutional access ends.

### 11.2 Student
- Join a session with a code, customize their character, and enter the building.
- Get assigned to (or choose, within teacher-set limits) a department team.
- Roam the world, interact with objects, and work with their department's slice of the project.
- Communicate with teammates via proximity/chat tools.
- Submit their team's fix for verification.
- View their own and their team's progress, badges, and history after the session.

### 11.3 (Future) Institution Admin
- Manage teacher accounts, rosters, and cross-section reporting. *(Out of scope for v1 — see [Future Enhancements](#20-out-of-scope--future-enhancements).)* Corresponds to Persona 4 (§6) at the procurement/approval stage even before this role is built.

### 11.4 (New role) Content Author
- Authors and maintains scenarios and issue variants per the spec in §8.4, including the tamper-resistance separation in §8.5: broken codebase, fix baseline, verification check(s) (in a protected trust zone), mission-briefing symptom text, difficulty/category tags.
- Distinct from the Teacher role — content authors are curriculum/scenario designers (internal team or vetted partners in later phases), not classroom instructors. Teachers *select from* the library; they don't author scenarios in v1–v2.
- See Persona 3 (§6) for the fuller picture of this role's workload and success measures.

### 11.5 Content Authoring Pipeline

The scenario/issue library was previously flagged as a risk with no named plan. This defines the minimum workflow needed before Phase 1 content work starts:

1. **Authoring format**: each scenario is a self-contained package — fix-baseline repo, one or more issue-variant repos (or diffs against baseline), verification check(s) held in the protected trust zone defined in §8.5, briefing text, and metadata (domain, difficulty, category, target department(s)) — versioned like code.
2. **Review gate**: every scenario passes a two-part review before entering the library — a *correctness* review (does the verification check actually fail on the broken variant and pass on a correct fix, including a correct fix that differs from the reference fix, and is it actually protected from student tampering per §8.5) and a *pedagogical* review (is the symptom text genuinely diagnostic without giving away the cause; is the difficulty tag accurate). **Requirement (new):** each review has a single named approver role (not just "a reviewer") and a target turnaround SLA (e.g., review decision within 5 business days of submission) so a scenario cannot stall indefinitely before a phase's content deadline.
3. **Ownership**: one named content lead per phase, responsible for the review gate and for the "no student sees the same incident twice across sections" reuse property by tracking which variants have been used per class/section.
4. **Cadence / numeric targets (revised — was qualitative in v2.0):**
   - Phase 0: exactly 1 scenario, 1 issue variant.
   - Phase 1: at minimum, enough issue variants per in-scope department that a single class meeting weekly for one term (≈12–15 sessions) does not repeat an incident — as a starting planning number, **at least 15 issue variants across the four departments** by end of Phase 1, refined once real section sizes and term lengths for pilot institutions are known.
   - Phase 2: sufficient variants across Beginner/Intermediate/Advanced and the new security/malicious-script categories to support layered incidents without repeats — exact number to be set once Phase 1's actual authoring throughput (variants/content-author/month) is measured, rather than assumed.
   - Phase 3: full breadth per §12.4's domain table.
5. **Tooling**: authoring starts as a manual, code-repo-based process (no bespoke authoring UI in early phases) — an authoring tool is a candidate future enhancement once the pipeline's shape is validated, not a v1 dependency.

---

## 12. Detailed Feature Set

*(Feature list is largely unchanged from v2.0; phase tags in Section 5 govern what's built when. New subsections 12.13 and 12.14 close gaps identified in review.)*

### 12.1 Session & Lobby Management
- Create a session tied to a class/section; auto-generated join code and shareable link.
- Configure roster size, department team sizes, and session time limit.
- Reuse a previous session's configuration as a starting template for a new one.

### 12.2 Character Creation & Roaming
- First-session character creation flow (appearance, name tag).
- Free movement across the full building with smooth multiplayer sync — every student sees every other student's character moving live.
- Persistent character identity across sessions (progress/cosmetics carry over) — requires the account model in [Section 15](#15-data-model--accounts-requirement-level).

### 12.3 Department & Team Assignment

The teacher decides how the class is organized for each session — this is a deliberate flexibility point, since different lessons call for different structures:

- **Multi-department mode** *(Phase 1)* — the class is split across Frontend / Backend / DevOps / QA, either:
  - *manually*, with the teacher dragging/assigning specific students to specific departments (useful when the teacher knows individual strengths);
  - *self-selected*, where students pick their own department in the lobby, optionally capped per room so no department is empty or overloaded; or
  - *auto-balanced*, where the system distributes students evenly (or by a rule, e.g., mixed skill levels per room) with one click.
- **Single-department mode** *(MVP for the "whole class, one team" case; sub-team splitting within this mode is Phase 1 — see §5.1)* — the teacher can instead put the **entire class into one department** (e.g., everyone in Backend) when the lesson is meant to focus on one discipline specifically, or when the class itself is a specialized course (e.g., a dedicated DevOps elective). In this mode the whole class collaborates as one large team — or, from Phase 1 onward, is optionally split into several smaller same-department teams, each working an independent copy of the same incident, so multiple groups can be compared afterward. **Each of those smaller teams is its own provisioned environment instance (§8.1) — infra cost and isolation scale with team count, not just session count; this is a capacity-planning input for the Architecture Document, not just a UX toggle.**
- **Custom grouping** *(Phase 1+)* — teachers can also define ad hoc sub-teams within a department (e.g., two 3-person Backend teams racing the same incident independently) for larger classes.
- Regardless of mode, each department retains its distinct "slice" of the overall project — deliberately incomplete information from any single vantage point — which is what drives collaboration; in single-department mode with sub-teams, that incompleteness instead exists *between* the smaller teams working the same room.

### 12.4 Project & Scenario Library

The library is the teacher's catalog of ready-made "companies to work at" for a session. **Full breadth (below) is the Phase 3 target (§5.5); MVP ships one scenario, one domain.** It's deliberately broad in the target state — spanning multiple technology domains, not just one type of app — so the platform stays useful across very different courses (a security elective, a web dev class, an ML course, a DevOps-focused lab) rather than being tied to one narrow theme.

**Browsing & selection.** Teachers filter the catalog by three independent facets and pick a scenario that fits their lesson:
- **Technology domain** — the subject-matter flavor of the project.
- **Difficulty tier** — Beginner / Intermediate / Advanced (see [Section 14](#14-difficulty--injected-issue-taxonomy)).
- **Departmental shape** — whether the scenario is a *full-stack* project engaging all four departments at once, or a *specialist* project deliberately built around a single department (for single-department-mode sessions).

**Example domain coverage (target state, not MVP):**

| Domain | Example scenario | Departments naturally involved | Typical difficulty range |
|---|---|---|---|
| Web Development | E-commerce checkout platform | Frontend, Backend, QA | Beginner – Advanced |
| AI / ML | Recommendation-engine dashboard with a model-serving API | Backend, Frontend, (optional ML specialist track) | Intermediate – Advanced |
| Blockchain / Web3 | Token wallet & smart-contract interaction dashboard | Backend, Frontend, QA | Intermediate – Advanced |
| Cloud / DevOps Infrastructure | CI/CD pipeline and deployment config for a microservice | DevOps, Backend | Beginner – Advanced |
| Mobile / Cross-platform backend | Ride-hailing companion app's supporting services | Frontend, Backend, QA | Beginner – Intermediate |
| IoT / Connected devices | Smart-home device management dashboard | Backend, DevOps, Frontend | Intermediate |
| Internal tools | Team chat / helpdesk application | Frontend, Backend, QA | Beginner – Intermediate |

**Specialist (single-department) projects.** For single-department-mode sessions, the library also offers scenarios purpose-built around one discipline — e.g., a pure Backend "fix the broken microservice" challenge (this is the MVP scenario), a pure Frontend "broken checkout UI" challenge, or a pure DevOps "misconfigured pipeline" challenge — so a specialized class doesn't have to awkwardly reuse a full-stack scenario.

**Reusability.** Every scenario supports multiple difficulty tiers and multiple possible injected issues (see [Section 14](#14-difficulty--injected-issue-taxonomy)), so teachers can replay the same scenario across sections or semesters without students encountering an identical incident twice — enforced operationally by the content pipeline's usage-tracking (§11.5).

### 12.5 Issue Injection Selection
- Teacher browses a categorized library of injectable issues (logic bugs, security vulnerabilities, malicious scripts, misconfigurations — see [Section 14](#14-difficulty--injected-issue-taxonomy)) and picks one or lets the system pick randomly within a chosen difficulty and category.
- Option to inject more than one issue for advanced sessions (a "layered incident") — Phase 2 (§8.3).
- Mechanically, this selects an authored issue variant (§8.1) to provision for the session.

### 12.6 Collaboration & Communication Tools
- Proximity-based voice/text chat (louder/clearer the closer characters stand) — **text chat from MVP; voice is Phase 3 (§5.5)**.
- Department-wide and company-wide (all-hands) chat channels.
- Lightweight "ping" system — a character can flag a location or workstation for teammates to notice.
- Shared whiteboard/notes surface in the Conference Room and SOC for jotting shared findings — Phase 1/2.

### 12.7 Mission Briefing & Live Incident Feed
- Initial symptom-only briefing posted at session start.
- Teacher can push follow-up "customer reports" or "monitoring alerts" mid-session to add pressure or nudge a stuck team.
- In-world visual/audio cues (flicker, alarm tone) reflect the incident being "live," with a captioned equivalent per Accessibility (§16.5).

### 12.8 Workstation Interaction
See [Section 8](#8-the-core-mechanic--workstations-issue-injection--verification) for the full specification.
- The camera settles into a comfortable over-the-shoulder view of that in-world screen while seated, so the student never visually "leaves" the building to work — they're still sitting in the room, teammates still visible in their peripheral view walking past.
- Visible "who's at which desk" status so teammates and the teacher know who is actively working, at a glance, from anywhere in the room.

### 12.9 Verification & Scoring
- Automated check confirms whether the actual injected issue has been resolved, per §8.3 and the tamper-resistance requirement in §8.5 — not just "the code changed."
- Partial credit for narrowing down the right department/area even if the full fix isn't reached, per the diagnostic-check mechanism in §8.3.
- Team-level and individual-level contribution tracking (e.g., who found the root cause, who implemented the fix, who verified it). **Measurement mechanism (new, resolves a v2.0 gap):** contribution is inferred from a combination of system-observable events — which student's edit session first introduced the passing change (root-cause/fix attribution), which student triggered the passing verification run (verification attribution), and chat/ping activity as a secondary "communication contribution" signal — not from self-reporting. This event-based approach must be reflected in the data model (§15) and is a direct input to the Architecture Document's event-logging design.

### 12.10 Teacher Dashboard & Observability
- **MVP**: a straightforward roster/status list — who's joined, who's seated, per-team verification status, and (new) each team's outcome state including "in progress," "resolved," and "session ended unresolved" (§13.3). No 3D staging.
- **Phase 2**: the teacher's oversight tools live inside the 3D world too, staged as a "war room" in the Mentor's Office: a holographic table/model of the building showing every department room, who's present, who's seated, and rough progress per team — read by walking up to it and looking, not by opening an external admin panel.
- **Phase 2**: teachers can also freely fly into **spectator mode** — an unobtrusive floating camera that can drop into any room to watch a team work in real time, then pop back out to the overview.
- **Phase 2**: session timeline/replay after the fact — a debrief view showing key milestones (issue found, fix attempted, fix verified) per team, presented as a walkable in-world timeline rather than a flat report screen. MVP ships a simple summary screen instead.
- Ability to drop a hint to a specific struggling team (delivered to their department's monitor wall) without broadcasting it to everyone — MVP: delivered via the status-list dashboard instead of a monitor wall push, same underlying capability.

### 12.11 Post-Session Debrief
- Automatic summary: time to detect, time to fix, path taken, team communication highlights.
- **Must include a defined, non-punitive presentation of the failure/timeout outcome** (§13.3) for any team that did not resolve the issue — this is not an edge case to special-case later, it is a required state of the debrief screen from Phase 0 onward.
- Personal takeaway card for each student (what they contributed, what they learned, badges earned) — badges are Phase 1+.
- Exportable summary for the teacher's gradebook or class discussion.

### 12.12 Gamification Layer
See [Section 18](#18-gamification--progression).

### 12.13 Session Resilience & Conflict Handling (new in v3.0)

These are required behaviors, not deferred edge cases, because they will occur in any real classroom session:

- **Late join:** a student joining after session start must be able to enter the building, be assigned to a department/team per the session's configured mode, and receive the current state of the mission briefing and their team's environment as it stands — not a fresh/reset environment and not a blocked join.
- **Disconnect / reconnect:** if a student's connection drops, their character and any in-progress workstation state must be recoverable on reconnect within the same session, consistent with "progress is saved automatically" (§10.2). The session and the team's environment must continue to exist and be usable by remaining teammates while a student is disconnected.
- **Simultaneous desk interaction:** resolved deterministically per §10.2's workstation conflict-handling behavior.
- **Early session end:** a teacher ending a session before all teams resolve their issue must still produce a valid debrief (§12.11, §13.3) for every team, and all provisioned environment instances must be torn down per the session-integrity requirement in §16.4.
- **Abandoned session:** a session with no teacher action and no student activity for a defined inactivity window must auto-timeout and tear down its provisioned environments rather than holding infrastructure indefinitely — the exact inactivity window is an Architecture Document parameter, but the requirement that one exists is fixed here.

### 12.14 Privacy & Data Handling Touchpoints (cross-reference)

Every feature above that stores or displays student activity (chat logs, contribution tracking in §12.9, session history) is subject to the Privacy & Compliance requirements in §16.6 and the retention policy in §15.5 — flagged here so it is not treated as a separate, disconnected concern during implementation.

---

## 13. End-to-End User Journeys (Including Failure & Edge Paths)

*(Journeys 13.1–13.2 describe the target-state (Phase 2+) experience for illustration; the MVP journey is the same shape, scoped to one department, no voice, and a simple dashboard instead of the holo-table/spectator mode. Journeys 13.3–13.5 are new in v3.0 and are required for Phase 0 — see §5.1.)*

### 13.1 Teacher journey — "Running a lab session"
1. Priya navigates to the SimOffice URL and immediately sees the headquarters exterior — a premium, architectural corporate building rendered live in her browser. A digital access panel beside the entrance reads "Administration Access — Staff Login." She enters her email and password. The system authenticates; the entrance doors begin to open and the camera advances through the entrance, carrying her into the Lobby where the visual language shifts into SimOffice's recognizable stylized simulation aesthetic. She creates a new session for her Tuesday lab section.
2. She picks the "e-commerce checkout" scenario, sets difficulty to Intermediate, and selects a security-category issue (a hidden vulnerability in the payment flow) plus one unrelated Frontend logic bug for extra challenge.
3. She shares the join code with her class.
4. As students trickle in and customize their characters, she watches the lobby fill up on the holo-table in her office and manually balances a couple of departments that are lopsided.
5. She starts the session; the notice board posts: *"Customers report their payment sometimes fails silently."*
6. Twenty minutes in, she notices the Backend team hasn't moved from the lobby — she drops into spectator mode to check on them, then pushes a hint to their monitor wall.
7. As teams close in on the fix, the holo-table's verification checks flip green one by one.
8. She ends the session, reviews the auto-generated debrief, and exports it for class discussion next lecture.

### 13.2 Student journey — "Joining a live incident"
1. Rahul navigates to SimOffice and sees the same headquarters exterior his teacher is already inside. The access panel reads "Join Session." He enters the class code, and the entrance opens — the camera carries him through into the Lobby. He picks a bright color scheme and a cap for his character, and walks out of the onboarding course into the lobby.
2. He's assigned to the Backend team and takes the elevator up to the Engine Room, where three teammates are already gathered around the department monitor wall reading the incident report.
3. He sits at a workstation, gets his slice of the payment service, and starts poking around while chatting with a QA teammate who's testing the flow from her side.
4. He spots something suspicious, pings his teammates' screens to gather them at his desk (physically walking over, in-character).
5. Together they confirm the issue, apply a fix, and submit it for verification — the platform runs the scenario's verification check (§8.3) and a satisfying confirmation chime plays as the SOC's alarm prop calms down.
6. At the debrief screen, Rahul sees he was the one who spotted the root cause, and unlocks a new hat for his character.

### 13.3 Student/Teacher journey — "The team doesn't solve it in time" (new, required for Phase 0)
1. A team spends the full session investigating but has not passed the full verification check when the session time limit is reached (or the teacher ends the session early).
2. The session transitions to the debrief screen for that team in a **non-punitive** framing: it shows what the team *did* find (any partial-credit diagnostic checks passed, per §8.3), how far they got, and what the remaining gap was — not simply "FAILED."
3. The teacher's dashboard reflects this team's outcome as "unresolved," distinct from both "resolved" and "in progress," so it's visible in class-level reporting without being flagged as an error state.
4. The teacher can optionally reveal the actual fix/root cause to the team as a teaching moment (a deliberate, teacher-triggered action — not automatic) — **flagged here as a required capability of the debrief screen**, with the actual UI treatment to be defined in the UI/UX design document.
5. The student's personal takeaway card (§12.11) still records what they contributed even though the team didn't fully resolve the incident, since partial diagnostic progress and communication activity are real, gradable signal.

### 13.4 Student journey — "Joining late / reconnecting" (new, required for Phase 0)
1. A student joins the session 10 minutes after it started (e.g., they had trouble logging in).
2. They pass through character setup and are placed on their assigned team's existing environment instance — not a fresh one — and see the mission briefing and their team's current state (chat history for their room, current code state) as it stands.
3. Later in the same session, their laptop briefly loses network connection. On reconnect, their character reappears where they left off, their workstation session (if they were seated) resumes with their in-progress edits intact, and their teammates see them as having briefly "stepped away" rather than the desk being freed for someone else mid-edit.

### 13.5 Teacher journey — "Ending a session early with unresolved teams" (new, required for Phase 0)
1. Priya is running short on class time and ends the session 10 minutes before the configured limit, with two of four teams still unresolved.
2. Every team — resolved and unresolved — receives a valid debrief screen (§13.3 applies to the unresolved ones).
3. All provisioned environment instances for the session are torn down per §16.4's session-integrity requirement; no environment is left running after the session is marked ended.

---

## 14. Difficulty & Injected-Issue Taxonomy

| Difficulty | Description | Example issue categories |
|---|---|---|
| **Beginner** | Single, isolated issue confined to one department; symptom closely matches cause. | Simple logic bug, obvious misconfiguration, missing input validation. |
| **Intermediate** | Issue may span two departments or require cross-team communication to trace. | Common web vulnerabilities (e.g., injection flaws, exposed secrets, insecure data handling), moderate logic bugs. |
| **Advanced** | Multiple layered issues, symptom is misleading, requires full-team coordination and process (logs, monitoring, testing) to isolate. | Chained vulnerabilities, malicious script planted to look like legitimate code, infra misconfiguration combined with an application bug. |

**Issue categories (conceptual, not exhaustive):**
- **Logic bugs** — incorrect behavior with no security implication (a broken calculation, a UI state bug). **MVP category.**
- **Security vulnerabilities** — classic categories familiar from secure-coding education (injection, broken access control, exposed sensitive data, etc.), always presented as *teaching scenarios* using project-specific sample code, never real exploit tooling. Requires the content-review gate (§11.5) before entering the library — Phase 2.
- **Malicious scripts** — a deliberately planted, clearly-fictional "bad actor" snippet that students must recognize and remove, teaching code-review vigilance. Phase 2. **Requires the content-liability legal review defined in §19 before any such content is authored, not just the standard review gate.**
- **Infrastructure / DevOps misconfiguration** — permission, pipeline, or deployment settings that cause a downstream symptom. Phase 1/2 (once the DevOps room exists).

**Authoring-risk note (new):** Advanced-tier scenarios (layered issues, misleading symptoms) are meaningfully harder to author *and* to verify reliably under the §8.3 model (a check per issue, composable without false positives/negatives across layers) than Beginner-tier ones. This should not be assumed to scale linearly from Beginner-tier authoring throughput — see the Phase 2/3 content-authoring risk in §19.

---

## 15. Data Model & Accounts (Requirement Level)

This is requirement-level, not a schema — the ER-level model is a downstream Architecture/Database Design deliverable (§22). Several product features (persistent cosmetics, session history, contribution tracking, teacher rosters) depend on this existing.

- **15.1 Accounts**: both teachers and students need an identity that persists across sessions. Students likely join via a class roster/code rather than self-registering, to keep onboarding frictionless and to keep the "minimal personal data" privacy goal (§16.6) intact — exact auth mechanism (school SSO, code-based lightweight accounts, etc.) is an Architecture Document decision.
- **15.2 Institution / Class hierarchy (new, was implicit in v2.0):** a "class" or "section" is a first-class entity distinct from an individual "session" — a class persists across a term and has many sessions run against it over time (this is what §11.1's "reuse across sections" and §17's return-rate metric actually require structurally). A teacher account is associated with one or more classes; a student roster is associated with a class, not directly with individual sessions.
- **15.3 Session state**: each run's configuration (scenario, difficulty, issue variant(s), roster, department assignments, timing) and its live state (who's where, who's seated, verification status, and — new — each team's outcome state per §13.3) must be tracked per session and cleaned up/archived per the session-integrity requirement (§16.4).
- **15.4 Per-student persistent record**: cosmetics/unlocks, XP/badges, and session history (for the "return for a second session" metric in §17) — tied to the account, not the session. Also includes the contribution-tracking events defined in §12.9.
- **15.5 Data retention & deletion policy (new, closes a Critical gap from the v2.0 review):**
  - Session recordings/logs (chat transcripts, contribution events, code-edit history) are retained only as long as needed for the debrief/gradebook-export use case and the aggregate metrics in §17, with an explicit maximum retention window to be set as part of the compliance review in §16.6 (not left indefinite).
  - A student or their guardian/institution must be able to request deletion of a student's personal data consistent with applicable regulations (§16.6); the account/session model must support this operation without corrupting other students' or teams' historical records (e.g., a deleted student's contribution events may need to be anonymized/retained in aggregate form rather than fully deleted from a team's shared debrief).
  - Provisioned environment instances (§15.6) are never retained beyond session teardown — they contain no student PII by design, only code artifacts.
- **15.6 Per-session environment instances**: one provisioned, isolated environment per team (§8.1, §12.3) — these are ephemeral and tied to the session's lifecycle, not the persistent account data.
- **15.7 Content library records**: scenarios and issue variants (§11.5) as versioned entities independent of any session, referenced by session configs.

---

## 16. Non-Functional Requirements

### 16.1 Presentation model
- **3D-first, browser-based, no popup-style UI** — the experience happens inside the 3D world; mission briefings, chat, scoreboards, incident status, workstation access, and the teacher's oversight tools are rendered as real objects and surfaces inside the 3D space itself (see [Interactive Objects](#10-2-interactive-objects--how-they-work)), not as flat HTML overlays breaking the sense of place. Visual quality (lighting, character animation, environment detail) matters and should scale down gracefully rather than being cut entirely on weaker hardware.

### 16.2 Device/performance baseline
- The target environment is standard school-issued laptops and Chromebook-class devices, not just high-end machines — this is the primary hardware profile, not an edge case.
- **Requirement:** a defined minimum spec, set via a device-baseline test plan run against a representative sample of real school hardware **before Phase 0 engineering is scheduled** (this is a Phase 0 blocking deliverable, not a parallel nice-to-have — see the Phase 0 exit criteria in §5.2, criterion 3), with tiered visual settings (shadows, particle/lighting effects, character density) as the mitigation for devices above that minimum.
- Devices below the minimum are an explicit non-goal for v1–v2, not silently degraded — the product should tell a teacher/student clearly if a device doesn't meet it, rather than delivering a broken experience.
- **Target ranges to validate against (starting hypotheses, to be confirmed or revised by the test plan, not final commitments):** session join time under 10 seconds on baseline hardware; sustained frame rate that reads as smooth for casual 3D movement (commonly targeted around 30fps floor on baseline devices, 60fps on above-baseline); workstation check-run response time per the tiered targets in §8.2.
- **Requirement (new in v3.1):** "test plan" scales down at pilot scope (§22) — running the build on the actual lab hardware and observing it satisfies the *method*, per the deployment-scoped Architecture Document — but the three numbers above must still be **measured and recorded**, not eyeballed. A test that produces "seemed fine" instead of an actual join-time figure, an actual sustained-fps figure, and an actual check-run-latency figure has not satisfied this requirement or the Phase 0 exit criterion in §5.2 that depends on it, regardless of how informal the rest of the process is.

### 16.3 Real-time responsiveness & concurrency
- Character movement and teammate presence must feel immediate; noticeable lag breaks the sense of shared space.
- The platform must support many simultaneous class sessions, each with multiple isolated department teams, without cross-contamination between sessions or between teams' provisioned environments (§8.1).
- **Requirement (new):** The concrete concurrency targets for the Phase 0/1 pilot are: 50 maximum concurrent sessions per deployment, 20 teams per session, and 6 students per team (up to 6,000 total concurrent clients).

### 16.4 Isolation, safety & session integrity
- Every student's/team's working environment for an exercise is a disposable, isolated instance (§8.1, §15.6) with no path to any real system, so nothing a student does can affect anything outside the exercise.
- Verification integrity per §8.5 (protected, non-editable check code) is part of this isolation requirement, not a separate concern.
- A teacher must be able to fully reset or discard a session's environment between class sections without residual state leaking into the next run; provisioned environment instances are torn down at session end, including the abandoned-session and early-end cases in §12.13.

### 16.5 Accessibility
- Full functionality must be reachable via keyboard alone, including the movement/traversal-specific resolution required in §9.6.
- Every audio cue (chimes, alarm tones) has an in-world visual/caption equivalent on the relevant object rather than a separate overlay, so audio is never the sole channel for any required information — this applies to voice chat too (Phase 3): voice-based collaboration must have a text-based equivalent available in the same room, not just captions of what others said.
- Readable contrast and text sizing; option to reduce motion/animation intensity.

### 16.6 Privacy & Compliance (new — was entirely absent in v2.0, flagged as a Critical gap)
- SimOffice is designed for classroom use and will likely be used by minors. **Requirement:** before any pilot in a real classroom, complete a compliance review against the applicable regulatory regimes for the deployment's jurisdiction(s) — at minimum COPPA and FERPA for U.S. K-12/higher-ed deployments, and GDPR-K or equivalent regional child-data protections for any deployment outside the U.S. This review is a named deliverable, not an implied consequence of "minimal personal data" (§15.1).
- **Requirement:** the account model (§15.1) must be designed around lightweight, roster-based identity rather than broad personal data collection — no requirement for real photos/likenesses, no collection of data beyond what's pedagogically necessary for the features in this PRD.
- **Requirement:** teacher visibility into student activity is limited to what's pedagogically necessary — dashboard status, contribution signals, and chat logs for moderation/safety purposes, not unrelated personal data.
- **Requirement:** a parent/guardian or institution-level consent mechanism, appropriate to the deployment context, must exist before a student's account is created — the exact mechanism (school-level blanket consent via the institution's existing enrollment agreement, individual consent flow, etc.) is a decision for the compliance review above, not fixed in this PRD.
- **Requirement:** the data retention/deletion policy in §15.5 is the operational implementation of this section and must be finalized alongside it, not independently.
- This section is a **blocking Critical item** for any real-classroom pilot, including the Phase 0 pilot referenced in §5.2 — Phase 0 engineering can proceed in parallel, but no student data may be collected from a real class until this review is complete.
- **Requirement (new in v3.1):** the actual age range of the Phase 0 pilot cohort must be confirmed and documented (e.g., "adult diploma-program students, 18+" vs. "K-12 minors") **before** deciding which compliance path applies. A downstream document may scale down the *formality* of the compliance review for a small, single-institution pilot (§22), but it may not assume adult participants as a way of doing so — that assumption must be a confirmed fact about the actual deployment, not a default taken for convenience. If the cohort includes minors, the full COPPA/FERPA/GDPR-K-equivalent review above applies at full weight regardless of pilot scale.

---

## 17. Success Metrics & Instrumentation

Each metric below names the underlying event(s) it depends on. Baselines are not yet known (this is a new product); the numbers below are **starting hypotheses for the Phase 0 pilot**, to be replaced with real baselines after the first cohort per the exit criteria in §5.2 — they are included so the metric is falsifiable rather than open-ended.

- **Engagement**: average session duration (session start/end events); % of students who return for a second session (per-account session history, §15.4); emote/social-interaction frequency (emote-use and chat-message events). *Starting hypothesis: a session should sustain active engagement for at least 70% of its configured duration before drop-off, based on chat/movement activity density.*
- **Learning effectiveness**: time-to-detect and time-to-fix trends across repeated sessions (timestamped: session start → first correct diagnostic check passed (§8.3) → full verification passed); should improve as students gain experience; post-session quiz/reflection scores (a lightweight in-app prompt at debrief — the exact prompt content is a candidate for a later addendum, not specified further here).
- **Collaboration quality**: cross-department communication frequency during multi-department incidents — instrumented via ping events, whiteboard interactions (Phase 1+), and cross-room chat-channel usage; **not measurable in MVP** (single-department only) — becomes trackable starting Phase 1.
- **Teacher adoption**: number of sessions created per teacher per term; session reuse rate (via the "reuse a previous session's configuration" feature, §12.1).
- **Satisfaction**: post-session student and teacher sentiment (simple in-app rating + optional comment, captured at debrief). This is the metric that directly tests the Executive Summary's core vision claim (§1) — a specific, tracked question at debrief should ask whether the session felt more like "being part of a team" than a typical assignment, not just a generic satisfaction score.

---

## 18. Gamification & Progression

- **XP & levels** — earned per session for participation, contribution, and successful resolution. *(Phase 1.)*
- **Badges** — awarded for specific behaviors: first to find root cause, best team communicator (as inferred from ping/chat activity), fastest team fix, "clean fix" (resolved without unrelated side effects). *(Phase 1.)*
- **Cosmetic unlocks** — new outfits, hats, and accessories for the character, unlocked through XP/badges rather than purchased. *(Phase 1 basics, full economy Phase 3.)*
- **Leaderboards** — per-class and per-session leaderboards for teams and individuals; framed around collaboration metrics, not just speed, to avoid discouraging careful work. *(Phase 1+, collaboration-metric leaderboards depend on Phase 1's cross-department instrumentation.)*
- **Company "wall of fame"** — a persistent in-world display (e.g., in the lobby) celebrating standout past sessions/teams for a class. *(Phase 3.)*

---

## 19. Risks & Assumptions

| Risk | Notes |
|---|---|
| Scope too large for one release | Mitigated directly by the phased plan in Section 5 — Phase 0 validates the core mechanic before committing engineering time to the full building, gamification, and library, gated by explicit exit criteria (§5.2). |
| The core mechanic is unproven, technically and in cost | The workstation/injection/verification loop (§8) is the one genuinely novel piece of engineering; it should be prototyped and user-tested in Phase 0 before Phase 1 world-building investment, independent of 3D polish. **(Expanded in v3.0):** this risk is also a cost risk, not just a UX risk — the code-execution sandbox's per-team, per-session infrastructure cost (§12.3) is currently unmodeled and should be estimated as part of the Architecture Document before Phase 0 is fully scheduled. |
| Verification-check tampering | **(New)** Students disabling or rewriting a verification check rather than fixing the real defect is a predictable classroom behavior, not a hypothetical one. Mitigated by the trust-zone separation required in §8.5. |
| Unbounded resource consumption by student code (new in v3.1) | A runaway loop or fork bomb in one team's environment is a predictable outcome of a debugging exercise, not a hypothetical attack — at pilot scale, multiple teams' environments may share a host with the platform's own services. Mitigated by the enforced per-environment CPU/memory/wall-clock ceiling required in §8.6. |
| Compliance / minors' data (new — was entirely absent in v2.0) | SimOffice is a classroom product likely used by minors, with no compliance review previously identified. Mitigated by the mandatory Privacy & Compliance review in §16.6, which is a blocking Critical item ahead of any real-classroom pilot. |
| Novelty wears off | The playful 3D layer needs to keep earning its place — if it becomes a distraction rather than a hook, engagement may drop after the first few sessions. Mitigated by rotating scenarios, cosmetics, and evolving difficulty (Phase 1+), and monitored directly via the engagement metrics in §17. |
| Uneven team participation | As with any group exercise, some students may coast. Individual contribution tracking (§12.9, now with a defined measurement mechanism) and per-student debrief cards aim to surface this to teachers. |
| Content creation bottleneck | Mitigated by the named pipeline, review gate with an SLA, and numeric phased content volume targets in §11.5 — content lead is a required hire/assignment before Phase 1 content work starts, not an afterthought. |
| Advanced-tier content authoring difficulty | **(New)** Layered/misleading-symptom scenarios (Advanced tier, §14) are harder to author and verify reliably than Beginner-tier ones; authoring throughput should not be assumed to scale linearly across tiers. Mitigated by prototyping one Advanced scenario early in Phase 2 planning rather than assuming the Phase 0/1 authoring pace applies. |
| Device/performance variance | Addressed directly by the baseline requirement and blocking test plan in §16.2 — a defined minimum spec set from real device testing before Phase 0 engineering is scheduled, rather than an unqualified "always full 3D" commitment. |
| Content-review liability (security content specifically) | Security-vulnerability and malicious-script scenarios (Phase 2) carry more review weight than logic bugs — the correctness+pedagogical review gate in §11.5 applies with extra scrutiny to this category before it enters the library, and the malicious-script category additionally requires a legal/content-liability review before any such content is authored. This review must cover: the scope of malicious-script scenarios for community-authored content, liability boundaries, and content moderation requirements. |
| Assumption | Students have basic familiarity with their assigned department's technology before the session — SimOffice trains *debugging and collaboration*, not from-scratch technology instruction. |

---

## 20. Out of Scope / Future Enhancements

- Native mobile app or VR support.
- Fully open-ended "sandbox mode" with no teacher-authored scenario.
- AI-generated, fully dynamic vulnerability injection (relies on a curated, vetted library through at least Phase 3).
- Cross-institution leaderboards and public matchmaking.
- Marketplace or purchasable cosmetics.
- Asynchronous/offline mode for students who missed a live session.
- A bespoke content-authoring UI for non-technical content authors (Phase 1–3 authoring is repo/code-based per §11.5; a dedicated tool is a candidate once that workflow is validated).
- Institution admin tooling (§11.3).
- Any specific technology stack, hosting provider, or sandboxing implementation choice — these are explicitly deferred to the downstream documents in §22, not decided by this PRD.

---

## 21. Glossary

- **Session / Run** — one instance of the company, tied to a single class period or lab.
- **Class / Section** — the persistent group of a teacher and roster of students that a session is run against; a class has many sessions over a term (§15.2).
- **Department** — a themed room and team grouping (Frontend, Backend, DevOps, QA).
- **Injected issue / Issue variant** — an authored version of a scenario's codebase containing a specific, known defect a teacher plants for students to find and fix, paired with its verification check (§8).
- **Fix baseline** — the correct, working version of a scenario's codebase that an issue variant is derived from.
- **Verification check** — the automated check (test suite or equivalent) authored per issue variant that confirms the specific injected defect has been resolved, held in a protected trust zone students cannot edit (§8.5).
- **Trust zone** — the distinction (new in v3.0) between student-editable application code and author-controlled, tamper-resistant verification code within the same provisioned environment (§8.5).
- **Mission briefing** — the symptom-level description of the incident shown to students at session start.
- **Workstation** — the in-world object a character sits at to access their department's part of the project (§8.2).
- **Provisioned environment instance** — the disposable, isolated running copy of a scenario's issue variant created per team for a session.
- **Content Author** — the role (distinct from Teacher) that authors and maintains scenarios and issue variants (§11.4, §11.5).
- **SOC (Security Operations Center)** — shared in-world room showing overall incident status.
- **Debrief** — the post-session summary of what happened, who contributed what, and what was learned — including the required unresolved/failure-path presentation (§13.3).
- **Exit criteria** — the measurable thresholds a phase must clear (§5.2) before the next phase is funded.

---

## 22. Open Technical Decisions & Downstream Documents

This PRD deliberately stops short of technology choices. The following documents are expected next, each grounded in the requirements fixed above, and each should be treated as **not yet decided** by anything in this PRD:

1. **System Architecture Document** — must resolve: 3D/game engine choice, multiplayer networking approach and protocol, client/server topology, hosting/cloud provider, and — highest priority — the **code-execution sandbox design** satisfying §8.1's isolation requirement and §8.5's trust-zone separation, including its cost model at the concurrency targets set in §16.3.
2. **Security & Isolation Design** — the specific technology (containers, microVMs, WASM, etc.) and threat model for running student-submitted/edited code, informed by §8.1, §8.5, and §16.4.
3. **Database Design / ER Diagram** — turning the requirement-level model in §15 into real entities and relationships, including the class/session/environment-instance hierarchy in §15.2–§15.6.
4. **API Specification** — for session management, workstation code operations, verification submission/results, teacher dashboard status, and the resilience behaviors in §12.13.
5. **Content Authoring Spec / Schema** — the concrete, versioned file/repo format implementing §11.5.1, needed before the single Phase 0 scenario can be authored.
6. **UI/UX Design (wireframes/prototypes)** — validating the "no popup-style UI, everything is an in-world object" mandate (§16.1) is actually usable, including the failure-path debrief screen (§13.3) and the accessibility-driven movement design (§9.6).
7. **Sequence Diagrams** — at minimum for: session start → provisioning, workstation sit → environment load, submit → verification → result propagation, late join, disconnect/reconnect, and session-end teardown (§12.13).
8. **Device/Performance Baseline Test Plan & Report** — the blocking Phase 0 deliverable required by §16.2, producing the actual minimum spec numbers this PRD only hypothesizes.
9. **Privacy & Compliance Review** — the blocking deliverable required by §16.6, before any real-classroom pilot collects student data.
10. **Phase 0 Effort Estimate & Team Plan** — produced once (1) and (2) above exist, since the sandbox architecture decision is the input most likely to move the estimate materially (§5.1).
11. **Content-Liability Legal Review** — the blocking deliverable defined in §19 before Phase 2 malicious-script content is authored.

**Handoff note:** every requirement in this PRD that used a phrase like "Architecture Document decision" or "downstream document" above is intentionally not resolved here. If any of documents 1–11 make a decision that conflicts with a requirement fixed in this PRD (e.g., a sandbox design that can't actually support the §8.5 trust-zone separation), that conflict should be raised and resolved against this PRD, not silently overridden.

---

## 23. Sign-off Checklist

Before Phase 0 engineering work is scheduled (as distinct from the technical spikes in §22, which can begin immediately against this PRD):

- [ ] Architecture Document exists and resolves items 1–4 in §22.
- [ ] Device/Performance Baseline Test Plan (§22 item 8) has produced a real minimum spec.
- [ ] Privacy & Compliance review (§22 item 9) is complete, or a plan exists to complete it before any real-classroom data collection (engineering may proceed in parallel; data collection may not).
- [ ] Content Authoring Spec (§22 item 5) exists and the Phase 0 content author has begun the single required scenario.
- [ ] Phase 0 effort estimate and team plan (§22 item 10) is produced and reviewed against the sandbox architecture decision.
- [ ] Phase 0 exit criteria (§5.2) are agreed upon by product and teaching stakeholders before the pilot begins, not renegotiated after seeing results.
- [ ] Pilot cohort's actual age range is confirmed and documented (§16.6, new in v3.1), and the correct compliance path is selected accordingly — not assumed.
- [ ] Per-environment resource ceilings (§8.6, new in v3.1) are specified as concrete numbers in the Architecture Document, not left as an unquantified "isolation exists" statement.

**Phase 2 Readiness Check:**
- [ ] Content-Liability Legal Review (§19) is complete and approved before any malicious-script content authoring begins.

---

## 24. Changelog v2.0 → v3.0

| Area | Change |
|---|---|
| §5 | Added Phase 0 exit criteria, effort-sizing note, resolved onboarding-in-MVP ambiguity, clarified sub-team splitting is Phase 1 |
| §6 | Added Content Author and IT/Procurement Admin personas |
| §8 | Added execution-time requirement (8.2), added §8.5 verification tamper-resistance / trust-zone requirement |
| §9 | Added §9.6 accessibility resolution requirement for movement |
| §10 | Resolved lobby/onboarding-in-MVP inconsistency |
| §11 | Added teacher account provisioning requirement, review-gate SLA, numeric content-volume targets (was qualitative) |
| §12 | Added §12.9 contribution-tracking measurement mechanism, §12.13 session resilience/conflict handling, §12.14 privacy cross-reference |
| §13 | Added three new required journeys: failure/timeout, late-join/reconnect, early session end |
| §14 | Added Advanced-tier authoring-risk note, cross-referenced malicious-script legal review |
| §15 | Added §15.2 class/institution hierarchy, §15.5 data retention & deletion policy |
| §16 | Restructured into numbered subsections; added §16.6 Privacy & Compliance (previously entirely absent); added target-range hypotheses to device baseline |
| §17 | Added starting-hypothesis baselines to each metric; tied satisfaction metric explicitly to the Executive Summary's vision claim |
| §19 | Added compliance risk, verification-tampering risk, sandbox-cost risk, Advanced-tier authoring risk |
| §20 | Added explicit statement that technology/architecture choices are out of scope of this document |
| §21 | Added Class/Section, Trust zone, Exit criteria terms |
| §22 (new) | Lists every downstream document this PRD hands off to, and exactly what each must resolve |
| §23 (new) | Sign-off checklist gating Phase 0 engineering scheduling |
| §24 (new) | This changelog |

---

## 25. Changelog v3.0 → v3.1

This revision closes four gaps surfaced by cross-reviewing this PRD against the resulting SAD v1.1 and TSSD v2.1 (both Pilot Editions) — the PRD is the source document, so where the downstream documents' reasoning depended on something this PRD hadn't actually required, the requirement is fixed here rather than left implicit downstream.

| Area | Change |
|---|---|
| §8 | Added §8.6 — an explicit, enforced per-environment CPU/memory/wall-clock resource ceiling, distinct from the network/filesystem isolation in §8.1. Isolation alone doesn't prevent one team's runaway code from starving shared pilot-scale infrastructure. |
| §16.2 | Added an explicit requirement that pilot-scale "informal" device-baseline testing must still produce and record the three actual target numbers (join time, sustained fps, check-run latency) — an informal *method* is fine; an unrecorded *result* is not. |
| §16.6 | Added a requirement that the pilot cohort's actual age range be confirmed and documented before selecting a compliance path — closes a gap where a downstream document could assume adult participants for convenience rather than as a confirmed fact. |
| §19 | Added a new risk: unbounded resource consumption by student code, mitigated by §8.6. |
| §23 | Added two sign-off checklist items tying directly to the above: confirmed cohort age range, and concrete (not just asserted) resource-ceiling numbers in the Architecture Document. |

---

## 26. Changelog v3.1 → v3.2

This revision adds the Building Exterior / Headquarters Entrance as a first-class product space and documents the immersive entry sequence as a Phase 0 requirement. The redesign does not change any API, data model, or backend architecture — all changes are in experience design, art direction, and the frontend entry flow.

| Area | Change |
|---|---|
| §10.1 | Added **Building Exterior / Headquarters Entrance** as the first bullet in the building layout list. All users enter SimOffice through this space before reaching the Lobby. |
| §10.4 (new) | New subsection establishing the exterior's design requirements: visual identity (premium/architectural, deliberately distinct from the playful interior), access panel dual variants (teacher vs. student content, same physical environment), ambient life, entry camera transition, reduced-motion fallback, WebGL fallback, and performance budget. |
| §13.1 | Rewrote step 1 to describe the teacher's experience arriving at the headquarters exterior and passing through the entry sequence before reaching the class management screens. |
| §13.2 | Rewrote step 1 to describe the student's experience arriving at the same exterior, entering via join code, and being carried through into the Lobby. |
