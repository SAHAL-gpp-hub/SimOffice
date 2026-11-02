from report_generator.helpers import (
    add_chapter_heading, add_section_heading, add_subsection_heading, add_subsubsection_heading,
    add_body_p, add_bullet_p, add_figure_placeholder, add_table_data
)

def build_chapter3(doc):
    add_chapter_heading(doc, 3, "SYSTEM REQUIREMENTS")
    
    # 3.1 FUNCTIONAL REQUIREMENTS
    add_section_heading(doc, "3.1 FUNCTIONAL REQUIREMENTS")
    add_body_p(doc,
        "The functional requirements for SimOffice govern the behavioral interactions, operational workflows, and data processing capabilities required of the platform. Derived from Product Requirements Document (PRD v3.1 §12), these requirements are formalized with unique alphanumeric identifiers (FR-01 through FR-18) categorized across system actors: Instructors (Teachers), Learners (Students), and System Administrative services. Priority classifications follow the MoSCoW framework, where 'Must Have' denotes non-negotiable core functionality required for Phase 0 Pilot certification."
    )
    
    # FR Table
    fr_headers = ["Req ID", "Requirement Name", "Description & Functional Scope", "Priority"]
    fr_rows = [
        ["FR-01", "Teacher Authentication", "Secure email/password authentication using Bcrypt hashing and 12-hour signed JWTs for session authorization.", "Must Have"],
        ["FR-02", "Class Roster Management", "Creation of class cohorts and persistent student roster entries scoped by class passcodes.", "Must Have"],
        ["FR-03", "Session Orchestration", "Teacher creation, configuration, and manual start/end transitions for live timed simulation sessions.", "Must Have"],
        ["FR-04", "Student Join Flow", "Passwordless student onboarding via 6-character session join code and roster passcode selection.", "Must Have"],
        ["FR-05", "3D Avatar Navigation", "Keyboard-driven (WASD/Arrows) 3D avatar movement, collision physics, and run/idle animation transitions.", "Must Have"],
        ["FR-06", "Spatial & Team Text Chat", "Dual-mode in-world communication: proximity-based local chat and broadcast departmental team chat.", "Must Have"],
        ["FR-07", "Virtual File System Browser", "Real-time listing and directory traversal of student application code inside the isolated container.", "Must Have"],
        ["FR-08", "In-World Code Editing", "Reading and atomic saving of source code files from the browser into the container /workspace volume.", "Must Have"],
        ["FR-09", "Diagnostic Test Execution", "On-demand execution of non-binding diagnostic tests to inspect application behavior and server logs.", "Must Have"],
        ["FR-10", "Formal Verification Submission", "Submission of patched codebase to automated test harness; computes team pass/fail outcome atomically.", "Must Have"],
        ["FR-11", "Teacher Live Telemetry", "Real-time dashboard displaying student active states, file edits, verification attempts, and idle timers.", "Must Have"],
        ["FR-12", "Contextual Hint Broadcast", "Instructor capability to push targeted textual guidance and hints directly to struggling teams.", "Must Have"],
        ["FR-13", "Automated Post-Session Debrief", "Aggregation of team completion times, attempt counts, and individual contribution metrics for grading.", "Must Have"],
        ["FR-14", "Solution Fix Reveal", "Post-session mechanism allowing instructors to display the canonical patch diff to teams.", "Must Have"],
        ["FR-15", "Automated Sandbox Teardown", "Deterministic destruction of container sandboxes and temporary volumes upon session conclusion.", "Must Have"],
        ["FR-16", "Contribution Telemetry Logging", "Granular logging of all student actions (code edits, checks executed, chat messages) into PostgreSQL.", "Must Have"],
        ["FR-17", "Scenario Variant Management", "Data-driven scenario catalog defining briefing prompts, injected bugs, and verification criteria.", "Must Have"],
        ["FR-18", "Avatar Appearance Customization", "Persistence of student cosmetic preferences (skin tone, shirt color, hair style) across sessions.", "Should Have"]
    ]
    add_table_data(doc, "3.1", "SimOffice Functional Requirements Matrix", fr_headers, fr_rows, [1.6, 3.4, 8.2, 1.45])

    # 3.2 NON-FUNCTIONAL REQUIREMENTS
    add_section_heading(doc, "3.2 NON-FUNCTIONAL REQUIREMENTS")
    add_body_p(doc,
        "Non-functional requirements (NFRs) specify the technical qualities, performance baselines, security boundaries, and operational constraints that the architecture must satisfy under load. Derived from PRD v3.1 §16, each requirement establishes measurable verification criteria."
    )
    
    nfr_headers = ["NFR ID", "Category", "Specification Metric", "Verification Standard"]
    nfr_rows = [
        ["NFR-01", "Rendering Performance", "Framerate >= 30 FPS", "Maintained on low-power Intel Celeron Chromebook hardware."],
        ["NFR-02", "Multiplayer Latency", "Network RTT < 50 ms", "Avatar state synchronization latency across local campus Wi-Fi."],
        ["NFR-03", "Kernel Sandbox Isolation", "Syscall Interception", "Zero host breakout; enforced via self-hosted gVisor runsc."],
        ["NFR-04", "Network Containment", "0 Byte Egress Allowed", "Containers blocked from LAN or external WAN internet access."],
        ["NFR-05", "Memory Resource Quota", "RAM <= 512 MB per team", "Enforced by Docker cgroups; container killed on OOM violation."],
        ["NFR-06", "CPU Resource Quota", "CPU <= 1.0 Core per team", "Enforced by Linux CFS bandwidth limits in container runtime."],
        ["NFR-07", "Execution Timeout", "Timeout <= 30 seconds", "Diagnostic and verification runs hard-killed at 30s threshold."],
        ["NFR-08", "Hosting Cost Ceiling", "Cost <= $10.00 / month", "Entire stack deployable on single shared VPS or college hardware."],
        ["NFR-09", "Concurrent Scalability", "Capacity >= 40 Students", "Simultaneous active players per class session without degradation."],
        ["NFR-10", "Transactional Integrity", "Atomic Row Locking", "Verification outcome transactions utilize SELECT FOR UPDATE."],
        ["NFR-11", "Credential Security", "12-Hour Expiration", "Teacher JWTs expire in 12h; student tokens scoped to teamId."],
        ["NFR-12", "Path Traversal Defense", "Strict Whitelisting", "File API rejects paths with '..' or leading absolute slashes."],
        ["NFR-13", "Universal Accessibility", "Keyboard Navigable", "All in-world UI, editor, and terminals operable without mouse."],
        ["NFR-14", "Abuse & DDoS Defense", "Rate Limiting", "Join code guessing and login brute-forcing rate-limited via Valkey."]
    ]
    add_table_data(doc, "3.2", "SimOffice Non-Functional Requirements Matrix", nfr_headers, nfr_rows, [1.6, 3.4, 4.4, 5.25])

    # 3.3 USER PERSONAS
    add_section_heading(doc, "3.3 USER PERSONAS AND BEHAVIORAL ARCHETYPES")
    add_body_p(doc,
        "To ensure that architectural and user experience decisions align directly with stakeholder expectations, SimOffice defines three canonical user personas derived from empirical field observations across collegiate computing departments (PRD v3.1 §6):"
    )
    
    add_subsection_heading(doc, "3.3.1 Persona 1: Teacher Priya (The Engineering Director)")
    add_body_p(doc,
        "Priya is an Assistant Professor of Computer Science who teaches third-year Web Engineering and Software Testing courses with 60 students per section. She possesses deep technical knowledge but suffers from extreme time constraints and grading fatigue. During lab hours, she struggles to maintain visibility into what students are actually doing: students sit quietly in rows, and Priya only discovers who is fundamentally stuck when assignments are graded a week later."
    )
    add_bullet_p(doc, "Primary Motivations:",
        "Desires immediate, real-time insight into student diagnostic struggles; wants to transition her labs from boring homework completion to an energized, collaborative team event; needs automated grading telemetry so she can spend lab time mentoring rather than evaluating."
    )
    add_bullet_p(doc, "Pain Points & Frustrations:",
        "Hates configuring complex local software dependencies on student laptops; frustrated when students passively wait for solutions rather than experimenting; overwhelmed by disparate tools (Canvas, GitHub, Zoom) during class."
    )
    add_bullet_p(doc, "Role in SimOffice:",
        "Acts as Engineering Director. She logs into the administrative console, creates a class session, selects the scenario, monitors the live dashboard to detect struggling teams, pushes targeted hints, and leads the synchronized post-incident debrief."
    )

    add_subsection_heading(doc, "3.3.2 Persona 2: Student Rahul (The Junior Software Engineer)")
    add_body_p(doc,
        "Rahul is a sophomore Computer Science undergraduate. He understands basic JavaScript and data structures from textbook exercises, but he feels profound anxiety when confronted with large, unfamiliar codebases. In group projects, Rahul often gets sidelined by more aggressive teammates because traditional tools lack structured division of labor."
    )
    add_bullet_p(doc, "Primary Motivations:",
        "Wants to gain practical, resume-worthy software debugging experience that mirrors real industry jobs; desires a psychologically safe learning environment where failure is a normal step in the diagnostic process; enjoys gaming and spatial collaboration."
    )
    add_bullet_p(doc, "Pain Points & Frustrations:",
        "Intimidated by dense command-line error traces; struggles to connect theoretical software engineering concepts to practical bug fixes; feels isolated when working on assignments at home."
    )
    add_bullet_p(doc, "Role in SimOffice:",
        "Embodied as an animated 3D avatar within the Backend department. Rahul walks to his team's workstation desk, opens the in-world editor, inspects the failing OmniCart service, coordinates hypotheses with his teammates via proximity chat, modifies code, and triggers test verifications."
    )

    add_subsection_heading(doc, "3.3.3 Persona 3: Content Author Dr. Aris (The Scenario Architect)")
    add_body_p(doc,
        "Dr. Aris is a curriculum specialist who designs hands-on laboratory exercises for cybersecurity training. He requires a standardized, reproducible specification for packaging software defects, briefing narratives, and automated verification test harnesses without having to modify core platform server code."
    )
    add_bullet_p(doc, "Primary Motivations:",
        "Needs a modular content format to easily construct new bug scenarios (e.g., SQL injections, race conditions, memory leaks); requires deterministic, sandboxed test execution that produces unambiguous pass/fail telemetry."
    )
    add_bullet_p(doc, "Role in SimOffice:",
        "Authors declarative scenario manifests and Docker-compatible seed volumes, specifying initial repository files, injected flaws, diagnostic test suites, and strict verification criteria."
    )

    # 3.4 SYSTEM USE CASES
    add_section_heading(doc, "3.4 SYSTEM USE CASES AND ACTOR INTERACTIONS")
    add_body_p(doc,
        "The interaction dynamics of SimOffice are defined through four primary use cases that encapsulate the end-to-end lifecycle of a simulated educational incident triage session:"
    )
    
    add_subsection_heading(doc, "3.4.1 Use Case UC-01: Session Initialization and Student Onboarding")
    add_bullet_p(doc, "Primary Actor:", "Teacher (Engineering Director)")
    add_bullet_p(doc, "Preconditions:", "Teacher is authenticated with active JWT; class section exists with registered student roster.")
    add_bullet_p(doc, "Main Success Scenario:",
        "1. Teacher selects 'Create Session' from dashboard, choosing the 'OmniCart Inventory API' scenario and a 45-minute time limit.\n"
        "2. The server generates a unique 6-character alphanumeric join code (e.g., 'ABC123') and initializes the session state as 'created'.\n"
        "3. Students navigate to the SimOffice web URL, input the join code, and select their identity from the class roster dropdown.\n"
        "4. The system validates the student passcode, assigns the student to a team (Backend Department), provisions a session-scoped JWT, and connects the client to the Colyseus TeamRoom.\n"
        "5. The student's 3D avatar spawns in the virtual office lobby, and the teacher dashboard reflects the active roster status."
    )

    add_subsection_heading(doc, "3.4.2 Use Case UC-02: Collaborative Incident Diagnosis and Live Triage")
    add_bullet_p(doc, "Primary Actor:", "Student (Software Engineer)")
    add_bullet_p(doc, "Preconditions:", "Session has transitioned to 'active' state; team sandbox environment is provisioned.")
    add_bullet_p(doc, "Main Success Scenario:",
        "1. Teacher officially starts the session, triggering the synchronized incident alarm in the virtual office.\n"
        "2. Students receive the incident briefing: 'Customer orders are processing successfully despite zero stock, causing negative inventory counts.'\n"
        "3. Students walk to their team workstation and press 'E' to open the virtual desktop interface.\n"
        "4. Students inspect the directory tree, locate src/index.js, and identify the checkout route.\n"
        "5. Team members discuss hypotheses via in-world text chat; one student triggers a diagnostic test via the workstation terminal.\n"
        "6. The test output streams to all team members, confirming that inventory underflow occurs due to a hardcoded `if (true)` conditional."
    )

    add_subsection_heading(doc, "3.4.3 Use Case UC-03: Automated Verification and Patch Certification")
    add_bullet_p(doc, "Primary Actor:", "Student Team")
    add_bullet_p(doc, "Preconditions:", "Students have edited and saved the source file in their workstation.")
    add_bullet_p(doc, "Main Success Scenario:",
        "1. A student replaces `if (true)` with `if (item.stock >= quantity)` and clicks 'Save File'.\n"
        "2. The workstation service persists the updated file into the team's gVisor container volume and logs a code_edit_saved event.\n"
        "3. The team clicks 'Submit for Verification'.\n"
        "4. The app-server calls the sandbox-orchestrator to execute the isolated verification harness located in the protected /verification volume.\n"
        "5. The harness tests boundary conditions (exact stock, insufficient stock, negative request) in isolation.\n"
        "6. All checks pass; the server executes an atomic database transaction updating team outcome to 'resolved' and records completion time.\n"
        "7. The 3D virtual office plays a success chime, and the team's status monitor illuminates green."
    )

    add_subsection_heading(doc, "3.4.4 Use Case UC-04: Real-Time Intervention and Automated Debriefing")
    add_bullet_p(doc, "Primary Actor:", "Teacher (Engineering Director)")
    add_bullet_p(doc, "Preconditions:", "Session is active; at least one team is struggling or session timer expires.")
    add_bullet_p(doc, "Main Success Scenario:",
        "1. The teacher dashboard highlights Team 3 with an idle warning (no test runs for 12 minutes).\n"
        "2. Teacher selects Team 3 and broadcasts a targeted hint: 'Examine the conditional branching logic in the /checkout POST handler.'\n"
        "3. The hint renders instantly as an urgent priority alert on Team 3's workstation monitors.\n"
        "4. Upon session completion, the teacher clicks 'End Session'.\n"
        "5. The platform transitions session state to 'debriefed' and renders the comparative debrief screen, displaying time-to-fix rankings, verification attempts, and individual student contribution logs."
    )

    # 3.5 PHASE 0 SCOPE BOUNDARIES
    add_section_heading(doc, "3.5 PHASE 0 SCOPE BOUNDARIES AND SYSTEM EXCLUSIONS")
    add_body_p(doc,
        "To ensure robust delivery and high architectural rigor for the collegiate pilot within the allocated developmental timeframe, SimOffice PRD v3.1 §5.1 explicitly demarcates the scope boundaries of the Phase 0 MVP. Table 3.3 formalizes the functional inclusions and explicit exclusions."
    )
    
    scope_headers = ["Subsystem", "Included in Phase 0 Pilot", "Explicitly Deferred (Phases 1–3)"]
    scope_rows = [
        ["Office Environments", "Single floor, Backend Engineering department bullpen.", "Multi-floor elevator navigation, Frontend, DevOps, and QA wings."],
        ["Scenario Library", "Single scenario: OmniCart Inventory API (Logic error).", "Multi-scenario catalogs, advanced injection flaws (XSS, SQLi, CSRF)."],
        ["Difficulty Scaling", "Beginner profile (isolated flaw, detailed briefing).", "Intermediate and Advanced profiles (layered multi-file bugs, red herrings)."],
        ["Communication", "Proximity text chat and departmental team text chat.", "Spatial WebRTC audio/voice channels and 3D avatar physical emotes."],
        ["Team Structure", "Single department teams (all students are Backend engineers).", "Cross-functional collaborative teams (Frontend talking to Backend & DevOps)."],
        ["In-World Mechanics", "Workstation interaction, door triggers, status screens.", "Elevator transit, whiteboard scratchpads, mini-games, watercooler break areas."],
        ["Economy & Badges", "Basic pass/fail outcome logging and session completion metrics.", "Persistent XP levels, cosmetic avatar stores, achievement badges."],
        ["Sandbox Topology", "Single gVisor container per team mounting Node.js runtime.", "Multi-container microservice clusters with virtual network bridges."]
    ]
    add_table_data(doc, "3.3", "Phase 0 Pilot Inclusion and Exclusion Boundary Matrix", scope_headers, scope_rows, [2.3, 6.1, 6.25])
    
    doc.add_page_break()
