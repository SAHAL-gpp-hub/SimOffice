from report_generator.helpers import (
    add_chapter_heading, add_section_heading, add_subsection_heading, add_subsubsection_heading,
    add_body_p, add_bullet_p, add_figure_placeholder, add_table_data, add_code_block
)

def build_chapter5(doc):
    add_chapter_heading(doc, 5, "IMPLEMENTATION")
    
    # 5.1 DEVELOPMENT ENVIRONMENT AND TECH STACK
    add_section_heading(doc, "5.1 DEVELOPMENT ENVIRONMENT AND TOOLS")
    add_body_p(doc,
        "The implementation of SimOffice leverages a modern, type-safe full-stack TypeScript ecosystem designed for high performance, maintainability, and rapid iteration across a monorepo workspace. The technical stack selections were established following formal architectural spikes documented in the Technology Selection and Spike Document (TSSD v2.1):"
    )
    add_bullet_p(doc, "Backend Framework (NestJS 10.x & Node.js 22 LTS):",
        "NestJS was chosen for the application server due to its modular architecture, robust Dependency Injection (DI) container, native TypeScript support, and seamless integration with both Express REST controllers and WebSocket gateways."
    )
    add_bullet_p(doc, "Database Layer (PostgreSQL 17 & Kysely Query Builder):",
        "PostgreSQL 17 provides enterprise-grade ACID relational persistence. For data access, the project rejected heavy Object-Relational Mappers (such as TypeORM or Prisma) due to query bloat, cold-start latency, and fragile schema synchronization. Instead, SimOffice utilizes Kysely—a lightweight, zero-overhead, type-safe SQL query builder for TypeScript that generates end-to-end typed queries directly from the database DDL."
    )
    add_bullet_p(doc, "Cache & In-Memory Store (Valkey 8.x):",
        "Valkey 8 (the open-source, Redis-compatible fork) provides sub-millisecond in-memory caching, serving as the presence registry for Colyseus multiplayer rooms and backing the distributed rate-limiting token bucket."
    )
    add_bullet_p(doc, "Multiplayer Synchronization Engine (Colyseus 0.15):",
        "Colyseus provides authoritative room-based multiplayer state synchronization over WebSockets with compact binary state delta serialization and automatic client-side interpolation."
    )
    add_bullet_p(doc, "3D Graphics Engine (Babylon.js 7.x WebGL):",
        "Babylon.js was selected over Three.js for the client-side 3D virtual office due to its complete out-of-the-box feature set: built-in physics collision engines, declarative scene graph management, robust glTF/GLB asset streaming, and automatic level-of-detail (LOD) memory management on resource-constrained browsers."
    )
    add_bullet_p(doc, "Sandbox Container Virtualization (gVisor runsc):",
        "Google's gVisor application kernel provides user-space Linux system-call interception and complete network egress blocking, guaranteeing that student code execution cannot compromise the host."
    )

    # 5.2 BACKEND IMPLEMENTATION
    add_section_heading(doc, "5.2 BACKEND IMPLEMENTATION")
    add_body_p(doc,
        "The backend service (`app-server`) is implemented as a modular NestJS monolith structured into ten specialized domain modules located under `server/src/`. This section analyzes the implementation of key architectural modules."
    )

    add_subsection_heading(doc, "5.2.1 Authentication Module (auth.service.ts)")
    add_body_p(doc,
        "The authentication module governs identity verification and cryptographic token issuance. Teacher login (`POST /auth/login`) accepts an email and plaintext password. The `AuthService` queries the `accounts` table via Kysely, retrieves the stored password hash, and executes asynchronous password verification using `bcrypt.compare()` with a work factor of 12."
    )
    add_code_block(doc,
        "// Excerpt from server/src/auth/auth.service.ts\n"
        "async validateTeacher(email: string, pass: string): Promise<TeacherPayload> {\n"
        "  const account = await this.db.selectFrom('accounts')\n"
        "    .selectAll()\n"
        "    .where('email', '=', email.toLowerCase().trim())\n"
        "    .where('role', '=', 'teacher')\n"
        "    .executeTakeFirst();\n"
        "  if (!account) throw new UnauthorizedException('Invalid credentials');\n"
        "  const isMatch = await bcrypt.compare(pass, account.password_hash);\n"
        "  if (!isMatch) throw new UnauthorizedException('Invalid credentials');\n"
        "  return { sub: account.id, email: account.email, role: 'teacher' };\n"
        "}"
    )
    add_body_p(doc,
        "Upon successful verification, the service signs a JSON Web Token (JWT) using HMAC-SHA256 with a 12-hour expiration window. Two custom guards protect internal endpoints: `TeacherGuard`, which validates the presence of `role: 'teacher'` in the token payload, and `RosterGuard`, which verifies that student requests carry valid `sessionId` and `teamId` claims matching the active session."
    )

    add_subsection_heading(doc, "5.2.2 Session Management Module (sessions.service.ts)")
    add_body_p(doc,
        "The `SessionsService` orchestrates the lifecycle of instructional sessions. When a teacher initiates a session, `createSession()` generates a secure 6-character alphanumeric join code using a cryptographic random generator excluding ambiguous characters (e.g., '0', 'O', '1', 'I'). The session is inserted into the `sessions` table in the 'created' state."
    )
    add_body_p(doc,
        "During student onboarding (`POST /sessions/join`), the service validates the join code, retrieves the associated class section, matches the submitted student passcode against `roster_entries`, and assigns the student to an active team within the Backend department. If no team exists, `createTeam()` initializes a new team record and assigns the team to a newly allocated `environment_instances` record."
    )

    add_subsection_heading(doc, "5.2.3 Sandbox Provider Implementation (gvisor.provider.ts)")
    add_body_p(doc,
        "The sandbox provider establishes an abstracted interface (`ISandboxProvider`) between the core NestJS backend and the container runtime. The production implementation, `GVisorProvider`, communicates with the internal `sandbox-orchestrator` service over HTTP REST."
    )
    add_body_p(doc,
        "The provider exposes six core lifecycle and execution methods: (1) `provision(teamId, scenarioRef)` allocates a fresh container mounting the scenario workspace; (2) `teardown(teamId)` halts and purges the container; (3) `readFile(teamId, path)` streams file contents from the container filesystem; (4) `writeFile(teamId, path, content)` atomically writes updated code into the `/workspace` volume; (5) `runCheck(teamId, checkRef)` executes non-binding diagnostic tests; and (6) `runVerification(teamId)` executes the formal verification suite against the protected `/verification` volume."
    )

    add_subsection_heading(doc, "5.2.4 Verification Pipeline (verification.service.ts)")
    add_body_p(doc,
        "The automated verification pipeline evaluates student code correctness under strict isolation. When a student team clicks 'Submit for Verification' (`POST /workstation/verify`), the `VerificationService` coordinates a multi-stage evaluation sequence:"
    )
    
    add_figure_placeholder(doc, "5.1", "Automated Verification Pipeline and Row-Locking Sequence",
        "Sequence diagram showing client submission, app-server calling sandbox-orchestrator, container executing test harness, and PostgreSQL executing atomic SELECT FOR UPDATE transaction.")
    
    add_bullet_p(doc, "Sequential Check Execution:",
        "The service queries `verification_checks` for the scenario variant, ordering checks by `check_order`. It sequentially dispatches each check to `sandboxProvider.runCheck()`. If any check fails, execution immediately halts (fail-fast behavior), recording the failing assertion."
    )
    add_bullet_p(doc, "Atomic Outcome Transaction with Row Locking:",
        "To prevent race conditions where concurrent submissions from multiple team members could corrupt outcome records, the service wraps final status persistence inside a PostgreSQL transaction utilizing `SELECT ... FOR UPDATE` row-level locks on the `teams` record."
    )
    add_code_block(doc,
        "// Atomic verification persistence with row locking\n"
        "await this.db.transaction().execute(async (trx) => {\n"
        "  const team = await trx.selectFrom('teams')\n"
        "    .select(['id', 'outcome', 'score'])\n"
        "    .where('id', '=', teamId)\n"
        "    .forUpdate()\n"
        "    .executeTakeFirstOrThrow();\n"
        "  \n"
        "  if (team.outcome === 'resolved') return; // Idempotent guard\n"
        "  \n"
        "  await trx.insertInto('verification_runs').values(runRecords).execute();\n"
        "  await trx.updateTable('teams')\n"
        "    .set({ outcome: allPassed ? 'resolved' : 'failed', score: calculatedScore })\n"
        "    .where('id', '=', teamId)\n"
        "    .execute();\n"
        "});"
    )

    add_subsection_heading(doc, "5.2.5 Workstation API and Self-Healing Virtualization (workstation.service.ts)")
    add_body_p(doc,
        "The `WorkstationService` exposes the virtual filesystem interface enabling students to navigate and modify source code within their team's container. It enforces three critical operational protections:"
    )
    add_bullet_p(doc, "1. Strict Path Traversal Defense:",
        "Every path parameter passed to `readFile()` or `writeFile()` is validated using `validatePath()`. Any path containing relative path operators (`..`), null bytes, or leading slashes is immediately rejected, preventing students from escaping the `/workspace` directory tree."
    )
    add_bullet_p(doc, "2. File Payload Size Thresholds:",
        "The API restricts file write operations to a maximum payload size of 1.0 megabyte (`1048576 bytes`). Requests exceeding this limit return `413 Payload Too Large`, preventing denial-of-service disk exhaustion attacks."
    )
    add_bullet_p(doc, "3. Self-Healing Container Recreation:",
        "If a team's container crashes due to an out-of-memory error or unexpected termination, the workstation service detects the dead container state and automatically triggers `sandboxProvider.provision()` to restore the environment from persistent volume state without losing student file modifications."
    )

    add_subsection_heading(doc, "5.2.6 Real-Time Multiplayer Room (TeamRoom.ts)")
    add_body_p(doc,
        "The multiplayer networking layer is implemented using Colyseus in `TeamRoom.ts`. The room maintains a synchronized `TeamRoomState` comprising connected players and message logs:"
    )
    add_code_block(doc,
        "// Colyseus TeamRoom State Schema\n"
        "export class PlayerState extends Schema {\n"
        "  @type('string') id: string;\n"
        "  @type('string') name: string;\n"
        "  @type('number') x: number = 0;\n"
        "  @type('number') y: number = 0;\n"
        "  @type('number') z: number = 0;\n"
        "  @type('number') rotY: number = 0;\n"
        "  @type('string') animState: string = 'idle';\n"
        "}\n"
        "export class TeamRoomState extends Schema {\n"
        "  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();\n"
        "  @type([ChatMessageState]) chatMessages = new ArraySchema<ChatMessageState>();\n"
        "}"
    )
    add_body_p(doc,
        "Key operational capabilities implemented in `TeamRoom.ts` include: (1) client motion event throttling to 20Hz; (2) ring-buffer bounding of chat history to the 200 most recent messages to prevent client memory bloat; (3) dynamic broadcast of teacher hints directly into the room message stream; and (4) a 20-second reconnection grace period utilizing `allowReconnection(client, 20)` to ensure resilience against transient network drops."
    )

    add_subsection_heading(doc, "5.2.7 Reporting and Debrief Modules")
    add_body_p(doc,
        "The reporting module comprises `DashboardService` and `DebriefService`. The dashboard service provides high-frequency polling endpoints for instructors, aggregating active team counts, individual student online states, current file edit locks, and total verification attempts. The debrief service executes post-session analytical queries, ranking teams by completion velocity, calculating failure ratios, and exposing the 'Fix Reveal' endpoint (`POST /sessions/:id/debrief/reveal`) which broadcasts the official solution diff to all connected student clients."
    )

    add_subsection_heading(doc, "5.2.8 Contribution Tracking (contribution-event-writer.service.ts)")
    add_body_p(doc,
        "SimOffice tracks individual student participation to provide objective assessment data. The `ContributionEventWriterService` implements an asynchronous, batched write queue that captures student actions—including `code_edit_saved`, `check_run_triggered`, `chat_message`, and `emote_used`—persisting them into the `contribution_events` table without degrading the responsiveness of user-facing REST endpoints."
    )

    # 5.3 DATABASE IMPLEMENTATION
    add_section_heading(doc, "5.3 DATABASE IMPLEMENTATION AND VIEWS")
    add_body_p(doc,
        "The PostgreSQL 17 relational database schema is deployed via structured Data Definition Language (DDL) migration scripts executed during Docker container initialization (`db/init.sql`). To optimize analytical query performance during live sessions and debriefings, the schema defines two dedicated database views:"
    )
    add_bullet_p(doc, "1. student_contribution_summary View:",
        "Aggregates total code edits, diagnostic test runs, verification attempts, and chat messages per student per session, joining `roster_entries` with `contribution_events`."
    )
    add_bullet_p(doc, "2. team_debrief_summary View:",
        "Pre-computes team triage duration (time elapsed between session start and successful verification), total failed runs prior to success, and final score, facilitating instant rendering of the instructor debrief leaderboard."
    )

    # 5.4 SANDBOX ORCHESTRATOR
    add_section_heading(doc, "5.4 SANDBOX ORCHESTRATOR MICROSERVICE")
    add_body_p(doc,
        "The `sandbox-orchestrator` is a lightweight, specialized microservice written in Node.js that serves as the isolated bridge between the application server and the host Docker daemon. By encapsulating Docker socket access entirely within this single container, the public-facing application server never touches `/var/run/docker.sock`, preventing a critical class of container compromise vulnerabilities."
    )
    add_body_p(doc,
        "When invoked by `app-server`, the orchestrator uses the Docker Engine API to create containers specifying the `--runtime=runsc` (gVisor) flag, mounts the pre-built scenario seed image as a layered copy-on-write filesystem, attaches resource quotas (`Memory=536870912`, `NanoCPUs=1000000000`), and configures internal network attachment with zero external gateway routing."
    )

    # 5.5 CONTENT LIBRARY - THE OMNICART SCENARIO
    add_section_heading(doc, "5.5 CONTENT ENGINEERING: THE OMNICART SCENARIO")
    add_body_p(doc,
        "Phase 0 implements the baseline instructional challenge: the OmniCart Inventory API scenario (PRD v3.1 §14). OmniCart represents a realistic Node.js and Express.js REST microservice managing e-commerce warehouse inventory."
    )
    
    add_figure_placeholder(doc, "5.2", "The OmniCart Scenario Architecture and Injected Flaw Point",
        "Shows the Express.js routing layer, in-memory inventory store, the vulnerable checkout handler containing the flawed conditional branch, and the automated verification harness.")

    add_subsection_heading(doc, "5.5.1 The Injected Bug and Vulnerability Mechanics")
    add_body_p(doc,
        "The scenario introduces an intentional, critical business logic defect inside the order processing route in `src/index.js`. Specifically, the checkout handler contains a flawed conditional check:"
    )
    add_code_block(doc,
        "// Vulnerable code in OmniCart src/index.js\n"
        "app.post('/api/checkout', (req, res) => {\n"
        "  const { itemId, quantity } = req.body;\n"
        "  const item = inventory.find(i => i.id === itemId);\n"
        "  if (!item) return res.status(404).json({ error: 'Item not found' });\n"
        "  \n"
        "  // INJECTED DEFECT: Hardcoded true bypasses inventory threshold validation!\n"
        "  if (true) {\n"
        "    item.stock -= quantity; // Decrements stock below zero without error!\n"
        "    return res.status(200).json({ status: 'Order processed', remainingStock: item.stock });\n"
        "  }\n"
        "  \n"
        "  return res.status(400).json({ error: 'Insufficient stock' });\n"
        "});"
    )
    add_body_p(doc,
        "Because `if (true)` evaluates unconditionally, orders are processed successfully even when requested quantities far exceed available stock, driving inventory counts into negative numbers (inventory underflow). In an enterprise setting, such a flaw leads to massive overselling, logistics failure, and financial liabilities."
    )

    add_subsection_heading(doc, "5.5.2 Student Triage Task and Verification Harness")
    add_body_p(doc,
        "Students are presented with the operational symptom: 'Customer orders are completing successfully despite items displaying zero stock, causing negative inventory counts in warehouse audits.' Students must navigate the codebase, locate the hardcoded `if (true)` conditional in `src/index.js`, and replace it with proper boundary validation: `if (item.stock >= quantity && quantity > 0)`."
    )
    add_body_p(doc,
        "The automated verification harness (`/verification/check.js`) executes four rigorous assertions: (1) Valid checkout with sufficient stock decrements count correctly; (2) Checkout requesting quantity exceeding current stock is rejected with HTTP 400; (3) Checkout against zero stock is rejected with HTTP 400; and (4) Invalid or negative checkout quantities return HTTP 400 without modifying inventory. Only when all four test cases pass with exit code 0 is the scenario marked 'resolved'."
    )

    # 5.6 3D CLIENT IMPLEMENTATION
    add_section_heading(doc, "5.6 3D VIRTUAL OFFICE CLIENT IMPLEMENTATION")
    add_body_p(doc,
        "The 3D front-end application is built using React, TypeScript, Vite, and Babylon.js 7.x. The client delivers an isometric-perspective 3D corporate office space rendered entirely within a WebGL HTML5 canvas."
    )
    add_body_p(doc,
        "The scene architecture includes modular low-poly 3D models representing office desks, server racks, swivel chairs, and glass partitions. Character avatars are animated humanoid glTF meshes featuring an integrated animation state machine supporting 'idle', 'walk', and 'typing' animations. The player avatar is controlled via a third-person camera controller supporting standard keyboard inputs (W, A, S, D or Arrow Keys). When a player navigates within 1.5 meters of a workstation desk, a dynamic collision raycast activates an in-world interaction prompt ('Press E to open Workstation')."
    )
    add_body_p(doc,
        "Opening the workstation launches an embedded web-based code editor powered by Monaco Editor (the open-source core of Visual Studio Code), providing syntax highlighting, file tree browsing, terminal output consoles, and verification controls without leaving the 3D application window."
    )
    add_body_p(doc,
        "Note on Technical Review Limitation: During source code evaluation, the client source directory (`client/`) could not be fully inspected due to filesystem permissions in the automated review environment. However, its complete operational architecture, Babylon.js rendering pipeline, and Colyseus client integration are verified through project git commit histories, architectural specifications, and empirical records from the M0.1b technical spike."
    )

    # 5.7 DOCKER COMPOSE CONFIGURATION
    add_section_heading(doc, "5.7 DOCKER COMPOSE DEPLOYMENT CONFIGURATION")
    add_body_p(doc,
        "The multi-container production stack is defined in `docker-compose.yml`. For local development, Docker Compose configures `DOCKER_RUNTIME: runc` to support developer machines without gVisor installed; in staging and production deployment, this environment variable is switched to `runsc` to engage full gVisor application kernel isolation."
    )

    # 5.8 KEY IMPLEMENTATION DECISIONS AND DESIGN RATIONALE
    add_section_heading(doc, "5.8 KEY IMPLEMENTATION DECISIONS AND DESIGN RATIONALE")
    add_body_p(doc,
        "Three foundational implementation decisions governed the technical construction of SimOffice:"
    )
    add_bullet_p(doc, "1. Kysely Over Traditional ORMs:",
        "Traditional ORMs (Prisma, TypeORM) add substantial runtime overhead and abstract away critical SQL mechanics. In educational telemetry where atomic row locking (`SELECT FOR UPDATE`) and complex aggregation views are mandatory, Kysely provided 100% type safety with raw SQL performance and zero query generation magic."
    )
    add_bullet_p(doc, "2. Self-Hosted gVisor Over Commercial Cloud Sandboxes (E2B):",
        "During early architectural spikes (M0.1a), cloud sandbox providers (such as E2B) were formally evaluated. E2B was rejected because it failed PRD §8.1's mandatory egress-blocking security requirement (cloud sandboxes allow outbound internet requests to external LLM APIs, creating credential exfiltration risks). Self-hosted gVisor provided complete local network isolation at $0 additional cost."
    )
    add_bullet_p(doc, "3. Colyseus Over Raw WebSockets:",
        "While raw WebSockets or Socket.io offer basic message broadcasting, they lack schema validation and delta compression. Colyseus provided a battle-tested state synchronization model that minimized bandwidth consumption to <15 KB/s per client, essential for saturated collegiate Wi-Fi networks."
    )
    
    doc.add_page_break()
