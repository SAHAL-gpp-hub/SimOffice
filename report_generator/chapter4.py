from report_generator.helpers import (
    add_chapter_heading, add_section_heading, add_subsection_heading, add_subsubsection_heading,
    add_body_p, add_bullet_p, add_figure_placeholder, add_table_data, add_code_block
)

def build_chapter4(doc):
    add_chapter_heading(doc, 4, "SYSTEM DESIGN AND ARCHITECTURE")
    
    # 4.1 SYSTEM OVERVIEW AND DESIGN PHILOSOPHY
    add_section_heading(doc, "4.1 SYSTEM OVERVIEW AND DESIGN PHILOSOPHY")
    add_body_p(doc,
        "The architecture of SimOffice is engineered around the core conviction that serious educational simulations must embody the same structural rigor, resilience, and security defense-in-depth found in enterprise production platforms. Developing a browser-based collaborative simulation where untrusted students write, edit, and execute live code within a shared multiplayer environment requires solving three difficult tensions:"
    )
    add_bullet_p(doc, "1. Spatial Richness vs. Minimal Client Footprint:",
        "Delivering an immersive, animated 3D corporate campus without demanding client-side installations, heavy native binaries, or expensive dedicated graphics hardware."
    )
    add_bullet_p(doc, "2. Real-Time Multiplayer Responsiveness vs. Authoritative Security:",
        "Providing instant, fluid avatar movement and spatial text chat (<50ms RTT) while maintaining strict server-side authority over game state, session timers, and automated grading verification."
    )
    add_bullet_p(doc, "3. Student Code Flexibility vs. Host Infrastructure Security:",
        "Granting students unrestricted freedom to modify source code, inspect files, and execute scripts within their assigned microservice, while guaranteeing that broken infinite loops, memory leaks, fork bombs, or malicious container breakout exploits cannot compromise other student teams, the host operating system, or the university network."
    )
    add_body_p(doc,
        "To resolve these tensions, SimOffice adopts a zero-trust multi-tier architecture, complete container virtualization at the Linux system-call layer via gVisor, declarative relational modeling in PostgreSQL 17, and an authoritative state-synchronized WebSocket cluster powered by NestJS and Colyseus."
    )

    # 4.2 HIGH-LEVEL ARCHITECTURE
    add_section_heading(doc, "4.2 HIGH-LEVEL ARCHITECTURE (THE 5-SERVICE DOCKER TOPOLOGY)")
    add_body_p(doc,
        "As formalized in the System Architecture Document (SAD v1.3 §3), SimOffice is organized as a monorepo multi-container topology managed via Docker Compose. The production environment consists of exactly five specialized service containers linked across private internal virtual bridge networks, ensuring strict separation of concerns and minimal attack surface exposure."
    )
    
    add_figure_placeholder(doc, "4.1", "Five-Service Containerized Deployment Topology and Network Architecture",
        "Depicts the TLS-terminating Nginx reverse proxy routing traffic to the app-server, which coordinates with PostgreSQL, Valkey, and the isolated sandbox-orchestrator managing gVisor containers.")
    
    add_body_p(doc,
        "The five core services comprising the SimOffice deployment topology operate as follows:"
    )
    add_bullet_p(doc, "1. nginx (Edge Reverse Proxy & Static Bundle Server):",
        "The sole service bound to the host's external network interfaces (ports 80 and 443). Built on an optimized Alpine Linux base image, Nginx performs TLS/SSL termination, serves the static production build of the React and Babylon.js WebGL front-end single-page application (SPA), and proxies REST API requests and WebSocket upgrade connections to the internal application server."
    )
    add_bullet_p(doc, "2. app-server (Core Backend & Multiplayer Gateway):",
        "A unified Node.js (v22 LTS) process running the NestJS application framework combined with the Colyseus multiplayer game server. The app-server exposes the public-facing REST API (for authentication, session orchestration, workstation file operations, and teacher debrief telemetry) and hosts stateful WebSocket rooms (TeamRoom) for synchronized multiplayer avatar motion, chat channels, and teacher hint delivery."
    )
    add_bullet_p(doc, "3. postgres (System-of-Record Relational Database):",
        "A self-hosted PostgreSQL 17.x relational database serving as the immutable system of record. It persists user accounts, class cohorts, student rosters, session records, team memberships, verification run histories, and fine-grained student contribution telemetry. The database is strictly isolated within the internal Docker network and is inaccessible from external IP addresses."
    )
    add_bullet_p(doc, "4. valkey (Presence Store, Pub-Sub & Rate Limiter):",
        "A self-hosted Valkey 8.x instance (a fully open-source, high-performance Redis-compatible key-value data store). Valkey acts as the shared backplane for Colyseus room presence, distributed state coordination across horizontal application workers, and the memory-backed token-bucket rate limiter defending against join-code brute-force attacks."
    )
    add_bullet_p(doc, "5. sandbox-orchestrator (Narrow-Privilege Container Manager):",
        "A specialized, minimal-privilege Node.js daemon and the only component in the entire topology with access to the host's Docker socket (/var/run/docker.sock). It runs on a segregated internal management network and exposes a restricted HTTP API (/provision, /readFile, /writeFile, /runCheck, /runVerification, /teardown) accessible exclusively by the app-server. It abstracts the lifecycle of ephemeral, gVisor-isolated student execution environments."
    )

    # 4.3 COMPONENT RESPONSIBILITY MATRIX
    add_section_heading(doc, "4.3 COMPONENT RESPONSIBILITY MATRIX")
    add_body_p(doc,
        "To enforce defense-in-depth and avoid architectural cross-contamination, Table 4.1 establishes the explicit boundary conditions and responsibility matrix for every service in the SimOffice topology."
    )
    
    matrix_headers = ["Component", "Primary Operational Responsibility", "Explicitly Does NOT Do"]
    matrix_rows = [
        ["nginx", "TLS termination, HTTP/2 negotiation, static asset delivery (HTML/JS/glTF), HTTP & WebSocket reverse proxying.", "Does NOT execute application logic, inspect JWTs, or interact with database."],
        ["app-server", "Business logic, REST API routing, JWT generation/validation, Colyseus multiplayer rooms, database querying via Kysely.", "Does NOT touch Docker socket directly; does NOT run user code in-process."],
        ["postgres", "ACID-compliant persistence of accounts, rosters, sessions, verification runs, and telemetry event logs.", "Does NOT store transient presence; does NOT handle real-time messaging."],
        ["valkey", "Volatile presence tracking, room state pub-sub, join-code attempt counters, rate-limiting sliding windows.", "Does NOT persist core business entities or long-term session grades."],
        ["sandbox-orchestrator", "Provisions/destroys gVisor containers, writes/reads files via Docker exec/tar, runs test harnesses.", "Does NOT validate user auth; does NOT handle student web requests directly."],
        ["gVisor Container", "Executes student application code and verification test scripts in an isolated, sandboxed environment.", "Has NO network egress; cannot access host filesystem; cannot escape sandbox."]
    ]
    add_table_data(doc, "4.1", "SimOffice Component Responsibility and Boundary Matrix", matrix_headers, matrix_rows, [2.3, 6.2, 6.15])

    # 4.4 DATA ARCHITECTURE
    add_section_heading(doc, "4.4 DATA ARCHITECTURE AND RELATIONAL MODELING")
    add_body_p(doc,
        "The data architecture of SimOffice is engineered to provide complete referential integrity, deterministic auditability, and seamless extensibility. Designed in PostgreSQL 17 and documented in the Database Design Document (DBD v1.1 §5), the schema comprises 14 interrelated relational tables, supplemented by composite indexes and convenience views."
    )
    
    add_figure_placeholder(doc, "4.2", "Entity-Relationship Diagram of SimOffice Core Schema",
        "Shows the hierarchical relationship between accounts, classes, roster_entries, sessions, teams, environment_instances, verification_runs, and contribution_events.")

    add_subsection_heading(doc, "4.4.1 Entity-Relationship Catalog and Table Hierarchy")
    add_body_p(doc,
        "The relational model is organized into four logical clusters:"
    )
    add_bullet_p(doc, "Identity & Academic Hierarchy Cluster:",
        "1. `accounts`: Stores authenticated instructor accounts (UUID primary key, email, Bcrypt password hash, role constraint: 'teacher' or 'admin').\n"
        "2. `classes`: Represents recurring academic class sections managed by an instructor (e.g., 'CS301-Fall2024'), establishing a multi-session container.\n"
        "3. `roster_entries`: Represents individual student identities scoped to a class. Contains the student's display name, persistent 4-digit passcode for seamless re-authentication, and an extensible `appearance JSONB` column persisting avatar cosmetics across sessions."
    )
    add_bullet_p(doc, "Session Orchestration & Team Allocation Cluster:",
        "4. `sessions`: Represents a single live class lab session. Holds the 6-character alphanumeric join code, foreign keys to class and scenario_variant, the session status state machine ('created', 'active', 'ended', 'debriefed', 'torn_down'), time limit, and start/end timestamps.\n"
        "5. `departments`: Seed catalog defining functional engineering wings ('backend', 'frontend', 'devops', 'qa', 'soc').\n"
        "6. `teams`: Represents student teams within a session. Maps to a department and maintains the team's outcome status ('in_progress', 'resolved', 'failed') and final score.\n"
        "7. `team_memberships`: Join table establishing many-to-many relationships between roster_entries and teams, enforcing team size limits and tracking active presence."
    )
    add_bullet_p(doc, "Virtualization & Verification Cluster:",
        "8. `environment_instances`: Tracks provisioned gVisor container instances per team. Records Docker container IDs, provision timestamps, status ('provisioning', 'ready', 'failed', 'torn_down'), and internal network IP bindings.\n"
        "9. `verification_checks`: Declarative definition of checks belonging to a scenario variant (e.g., diagnostic stock check vs. full fix regression suite), specifying check order, weight, and harness references.\n"
        "10. `verification_runs`: Execution audit log capturing every single check execution triggered by a team. Stores execution status ('pass', 'fail', 'resource_limit_exceeded', 'error'), duration in milliseconds, stdout/stderr logs, and exit codes."
    )
    add_bullet_p(doc, "Telemetry, Content & Logging Cluster:",
        "11. `contribution_events`: High-frequency append-only event log capturing student granular interactions ('code_edit_saved', 'check_run_triggered', 'chat_message', 'emote_used') with millisecond timestamps and metadata JSONB.\n"
        "12. `scenarios`: Master content catalog defining educational scenarios (e.g., 'OmniCart Inventory API').\n"
        "13. `scenario_variants`: Versioned challenge instances configuring difficulty level ('beginner', 'intermediate', 'advanced'), specific injected bugs, briefing texts, and harness configurations.\n"
        "14. `scenario_usage_log`: Aggregate analytics tracking how frequently scenarios are utilized and their historical pass rates across institutions."
    )

    add_subsection_heading(doc, "4.4.2 Key Architectural Data Decisions")
    add_bullet_p(doc, "UUID v4 Primary Keys Throughout:",
        "All database entities employ Universally Unique Identifiers (UUID v4) as primary keys generated via PostgreSQL's `gen_random_uuid()`. This eliminates sequential enumeration vulnerabilities (preventing students from guessing adjacent session IDs or team records) and simplifies future distributed database scaling."
    )
    add_bullet_p(doc, "TEXT with CHECK Constraints Over Native ENUMs:",
        "Rather than utilizing native PostgreSQL ENUM types, status fields (e.g., session status, team outcome, verification status) utilize `TEXT` with strict `CHECK` constraints. In PostgreSQL, altering a native ENUM requires table-level locking DDL operations; using CHECK constraints allows seamless zero-downtime additions of future states."
    )
    add_bullet_p(doc, "JSONB Extensibility for Evolving Metadata:",
        "Semi-structured fields—such as avatar cosmetic attributes (`appearance` in `roster_entries`), scenario parameters (`config` in `scenario_variants`), and telemetry payloads (`metadata` in `contribution_events`)—are stored as binary JSONB, enabling rapid schema iteration without costly relational migrations."
    )

    # 4.5 TRUST ZONE AND SANDBOX ARCHITECTURE
    add_section_heading(doc, "4.5 TRUST ZONE AND SANDBOX ARCHITECTURE")
    add_body_p(doc,
        "The security architecture of SimOffice enforces a rigid dual-zone security model designed to withstand intentional student attacks, accidental infinite loops, and untrusted dependency execution (PRD v3.1 §8.1 and SAD v1.3 §5)."
    )
    
    add_figure_placeholder(doc, "4.3", "Dual Trust Zone Partitioning and gVisor Syscall Interception Architecture",
        "Details the separation between the student-writable /workspace volume and the immutable /verification volume, mediated by the gVisor Sentry application kernel.")

    add_subsection_heading(doc, "4.5.1 The Dual Trust Zone Model")
    add_body_p(doc,
        "Every provisioned team container is partitioned into two distinct filesystem zones with mutually exclusive access controls:"
    )
    add_bullet_p(doc, "Trust Zone A: Student-Editable Workspace (/workspace):",
        "This directory contains the microservice application source code that students are instructed to debug (e.g., src/index.js, package.json). The workstation API grants students read and write privileges over this directory. Students can modify, create, and save files within /workspace to test hypotheses."
    )
    add_bullet_p(doc, "Trust Zone B: Immutable Protected Verification Harness (/verification):",
        "This directory contains the automated test harness, grading scripts, assertions, and test fixtures used to evaluate code correctness. The workstation API provides zero read and zero write access to this zone; students cannot list its contents, inspect its assertions, or modify its grading logic. The harness is mounted into the container as a read-only volume (`:ro`), completely eliminating cheat vectors where students might alter tests to trivially return exit code 0."
    )

    add_subsection_heading(doc, "4.5.2 gVisor Kernel-Level Virtualization (runsc)")
    add_body_p(doc,
        "Standard Docker containers utilize standard Linux cgroups and namespaces sharing the host Linux kernel (`runc` runtime). While lightweight, shared-kernel containerization is fundamentally vulnerable to container escape exploits (e.g., kernel privilege escalation, Dirty COW, Dirty Pipe) and denial-of-service attacks. If an untrusted student script triggers a kernel panic or executes raw socket manipulation, the entire host system can be compromised."
    )
    add_body_p(doc,
        "SimOffice mandates self-hosted gVisor (`runsc`), an open-source application kernel developed by Google. Written in Go, gVisor acts as a secure intermediary layer between the untrusted containerized application and the host operating system kernel. The gVisor 'Sentry' intercepts all system calls made by student processes, implementing over 300 Linux syscalls in memory within userspace. It never passes raw syscalls directly to the host kernel. File and network I/O are mediated through the 'Gofer' process, ensuring complete isolation."
    )
    add_bullet_p(doc, "Strict Egress Network Blocking:",
        "The sandbox container is attached to an internal Docker network created with `--internal=true`. In addition, iptables rules drop all outbound traffic. Student code cannot initiate external HTTP requests, ping local campus servers, exfiltrate credentials, or participate in distributed denial-of-service (DDoS) botnets."
    )
    add_bullet_p(doc, "Resource Throttling and Quotas:",
        "Each container is strictly constrained via Linux control groups (cgroups): CPU is capped at 1.0 vCPU core; RAM is hard-capped at 512 MB (with an Out-Of-Memory killer instantly terminating offending processes); diagnostic and verification runs enforce a strict 30-second wall-clock execution timeout."
    )

    # 4.6 REAL-TIME MULTIPLAYER ARCHITECTURE
    add_section_heading(doc, "4.6 REAL-TIME MULTIPLAYER ARCHITECTURE")
    add_body_p(doc,
        "Multiplayer state synchronization is powered by Colyseus 0.15 running inside the NestJS app-server process. SimOffice partitions the active session into dedicated, isolated multiplayer rooms on a per-team basis (`TeamRoom`), supplemented by an administrative room for instructor observation."
    )
    add_bullet_p(doc, "Authoritative Schema-Driven Synchronization:",
        "Colyseus utilizes binary state schemas (`TeamRoomState`) to track the world state. The schema defines a synchronized collection of `PlayerState` objects, where each player possesses position coordinates (`x`, `y`, `z`), rotation (`rotY`), and animation state (`animState`: 'idle', 'walk', 'run', 'typing'). When a player moves using keyboard controls, the client sends compact delta vectors to the server. The server validates boundary collisions and broadcasts encoded binary state patches at 20Hz (every 50ms) to connected peers."
    )
    add_bullet_p(doc, "Proximity-Aware Spatial Text Chat:",
        "Chat messages transmitted across the WebSocket connection are routed through a spatial distance filter. Messages tagged as 'proximity' compute Euclidean distance between the sender and recipient avatars; if the distance is within 8.0 virtual meters, the message renders in an in-world speech bubble above the avatar. Messages tagged as 'team' broadcast unconditionally to all members of the departmental team."
    )
    add_bullet_p(doc, "20-Second Reconnection Grace Period:",
        "Colyseus room architecture includes built-in disconnection tolerance. If a student experiences a temporary Wi-Fi drop or refreshes their browser, the server reserves their avatar and seat for 20 seconds (`allowReconnection(client, 20)`). Upon reconnecting with their session JWT, the student seamlessly resumes their active session without losing workstation state or roster binding."
    )

    # 4.7 SESSION LIFECYCLE STATE MACHINE
    add_section_heading(doc, "4.7 SESSION LIFECYCLE STATE MACHINE")
    add_body_p(doc,
        "A SimOffice simulation session adheres to a deterministic, five-state finite state machine (FSM) governed by strict transition rules and automated lifecycle hooks (SAD v1.3 §7)."
    )
    
    add_figure_placeholder(doc, "4.4", "SimOffice Session Lifecycle State Machine Transition Flow",
        "Illustrates the sequential state transitions from created, active, ended, debriefed, to torn_down, showing trigger events, guard conditions, and automated cleanup hooks.")
    
    state_headers = ["State", "Trigger Event", "Entry Actions & System Behavior", "Exit Conditions & Guards"]
    state_rows = [
        ["created", "Instructor clicks 'Create Session' in dashboard.", "Generates 6-character join code; provisions database session record; waits for student roster joins.", "Transitions to 'active' only when teacher explicitly initiates session."],
        ["active", "Instructor clicks 'Start Session'.", "Triggers sandbox-orchestrator to provision gVisor containers per team; starts countdown timer; unlocks workstation editor.", "Transitions to 'ended' upon timer expiry or instructor manual termination."],
        ["ended", "Time limit expires OR instructor clicks 'End'.", "Immediately locks in-world editor (read-only mode); rejects new verification runs; freezes final team outcomes.", "Transitions to 'debriefed' when teacher accesses debrief analytics."],
        ["debriefed", "Instructor opens class debrief view.", "Aggregates completion rankings, verification attempt counts, and student contribution logs; displays fix reveal.", "Transitions to 'torn_down' when teacher closes or dismisses debrief."],
        ["torn_down", "Instructor dismisses session OR 24h cron.", "Invokes sandbox-orchestrator to destroy all gVisor containers and remove temporary volumes; releases ports.", "Terminal state; session record archived in database."]
    ]
    add_table_data(doc, "4.2", "Session Lifecycle State Machine Transition Specifications", state_headers, state_rows, [1.8, 3.4, 5.8, 3.65])

    # 4.8 SECURITY ARCHITECTURE
    add_section_heading(doc, "4.8 SECURITY ARCHITECTURE AND THREAT MODELING")
    add_body_p(doc,
        "Because SimOffice provides a public-facing web interface that allows arbitrary users to execute code, security threat modeling is an imperative architectural pillar. The system implements a defense-in-depth posture spanning multiple protective barriers:"
    )
    add_bullet_p(doc, "1. Authentication and Token Partitioning:",
        "Teacher authentication requires an email and password verified against a Bcrypt hash with a work factor of 12. Teachers receive a signed JWT containing `role: 'teacher'` and an expiration of 12 hours. Student onboarding is passwordless but authenticated via a session join code and class roster passcode. Student JWTs contain `role: 'student'`, `sessionId`, and `teamId`, with expiration strictly bounded to the session duration."
    )
    add_bullet_p(doc, "2. Path Traversal Defenses in Workstation API:",
        "A critical vulnerability in web-based IDEs is directory traversal (e.g., `GET /workstation/file?path=../../etc/passwd`). The workstation service enforces strict path validation via `validatePath()`. Any requested filepath containing `..`, null bytes (`%00`), or leading absolute slashes (`/`) is rejected with a `400 Bad Request` before reaching filesystem APIs."
    )
    add_bullet_p(doc, "3. Denial of Service and Brute-Force Rate Limiting:",
        "To prevent malicious actors from guessing session join codes (a 6-character alphanumeric space of ~2.1 billion combinations), the API utilizes `@nestjs/throttler` backed by Valkey. Join attempts are strictly limited to 10 requests per minute per IP address. Exceeding this quota triggers an immediate HTTP 429 Too Many Requests response."
    )
    add_bullet_p(doc, "4. Atomic Concurrency and Race Condition Defenses:",
        "When students submit code for verification, multiple team members might simultaneously click the submit button. To prevent double-crediting or race conditions, the verification service wraps the outcome calculation within a PostgreSQL serializable transaction utilizing `SELECT ... FOR UPDATE` row-level locks on the `teams` record."
    )

    # 4.9 API ARCHITECTURE
    add_section_heading(doc, "4.9 RESTFUL AND REAL-TIME API ARCHITECTURE")
    add_body_p(doc,
        "The communication contract of SimOffice is cleanly partitioned between stateless HTTP REST endpoints (for operational management, file I/O, and reporting) and bidirectional WebSocket connections (for high-frequency multiplayer synchronization). All REST endpoints return standardized JSON payloads adhering to OpenAPI 3.0 conventions, authenticated via Bearer JWT tokens in the HTTP Authorization header. Complete endpoint schemas are cataloged in Appendix 2."
    )

    # 4.10 DEPLOYMENT ARCHITECTURE
    add_section_heading(doc, "4.10 DEPLOYMENT ARCHITECTURE AND PHYSICAL TOPOLOGY")
    add_body_p(doc,
        "The physical deployment architecture is optimized for minimal operational cost, enabling educational institutions to host SimOffice on existing campus hardware or a modest single-host Virtual Private Server (VPS) costing under $10 per month (e.g., 2 vCPU, 4GB RAM, 50GB SSD). All five service containers run within an isolated Docker Compose network. The host operating system exposes only port 443 (HTTPS) and port 80 (HTTP redirect to HTTPS) to the public internet. The Docker daemon socket is completely inaccessible to the web-facing containers, mediated solely through the narrow sandbox-orchestrator proxy."
    )
    
    doc.add_page_break()
