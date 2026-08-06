# Phase 0 Effort Estimate & Schedule (M0.1 Exit)

## 1. Spike Outcomes & Go/No-Go Decision

- **M0.1a Sandbox & Security Spike:** gVisor passed all isolation, resource ceiling, and teardown constraints. E2B was rejected because its free tier lacks the required native egress blocking. The "injection-over-mount" pattern was successfully validated using a read-only volume and Linux user permissions.
- **M0.1b Client & Realtime Spike:** Babylon.js and Colyseus both passed the performance (≥30 FPS) and multiplayer sync feasibility checks.
- **Gate Decision:** **GO**. The core technology unknowns are resolved, and isolation requirements are met. Phase 0 execution can proceed to M0.2.

## 2. Revised Effort Estimate

The primary impact of the spike outcomes is on backend orchestration. Choosing a self-hosted gVisor solution over a managed cloud API (E2B) shifts the complexity directly onto our infrastructure and the `SandboxProvider` implementation.

| Milestone | Sub-Milestone | Impact | Revised Effort / Complexity |
| :--- | :--- | :--- | :--- |
| **M0.0** | Local Dev Env | **Increased** | Need to incorporate `runsc` and Docker socket access into the local dev orchestrator. |
| **M0.2** | M0.2a – M0.2c (DB, Auth, Session) | None | Standard backend work. |
| | M0.2d (Sandbox Orchestration) | **Significantly Increased** | Highest risk backend item. Must implement raw Docker API calls, secure volume mounts for verification injection, and handle lifecycle/OOM events manually. |
| | M0.2e – M0.2f (Verification, API) | None | Unaffected by underlying provider choice. |
| **M0.3** | M0.3a – M0.3f (Client Core) | None | Validated by M0.1b. Expected effort remains unchanged. |
| **M0.4** | M0.4a – M0.4e (Content, UI, Integration) | None | Standard content and UI integration work. |
| **M0.5–M0.7** | Evaluation Gates | None | Checklists and deployment validations remain intact. |

## 3. Firmed Phase 0 Schedule & Execution Plan

Based on the Roadmap v1.2 build order and the gVisor architectural decision, the team plan and build schedule is:

### Track 1: Infrastructure & Orchestration (Critical Path)
This is the highest priority due to the gVisor complexity.
1. **M0.0**: Provision local Postgres, Valkey, Nginx, and the gVisor-based sandbox-orchestrator.
2. **M0.2d**: Implement `SandboxProvider` against the gVisor host.

### Track 2: Backend Core (Parallel to Track 1)
1. **M0.2a → M0.2b → M0.2c**: DB Schema, Auth & Guards, Session State Machine.
2. **M0.2e → M0.2f**: Verification Pipeline and Workstation HTTP API (integrates with M0.2d).
3. **Gate**: {M0.2 Exit} Backend CI Green.

### Track 3: Client Core (Parallel to Tracks 1 & 2)
1. **M0.3a → M0.3c → M0.3e**: 3D Environment, Multiplayer Sync, Text Chat.
2. **M0.3b**: Character Creation UI.
3. **M0.3d**: Workstation Overlay (blocked by M0.2f completion).
4. **M0.3f**: Onboarding & Briefing.

### Track 4: Content (Background)
1. **M0.4a → M0.4b**: Backend Scenario Authoring and Review.

### Final Integration & Polish
1. **M0.4c → M0.4d**: Teacher Dashboard and Debrief Screen.
2. **Gate**: {M0.4e} Integration & E2E Testing with 2+ students.
3. **M0.5–M0.7**: Security, Hardware Baseline, and Compliance gates prior to live pilot.
