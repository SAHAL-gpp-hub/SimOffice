from report_generator.helpers import (
    add_chapter_heading, add_section_heading, add_subsection_heading,
    add_body_p, add_bullet_p, add_figure_placeholder, add_table_data
)

def build_chapter1(doc):
    add_chapter_heading(doc, 1, "INTRODUCTION")
    
    # 1.1 OVERVIEW
    add_section_heading(doc, "1.1 OVERVIEW")
    add_body_p(doc, 
        "The contemporary software industry has undergone a radical transformation over the past decade, moving away from monolithic, single-developer codebases toward globally distributed microservice architectures, continuous delivery pipelines, and complex cross-functional engineering organizations. In these real-world production environments, software engineers rarely work in cognitive isolation. Instead, software maintenance, security vulnerability remediation, and emergency incident triage demand rapid, synchronous collaboration, precise communication across specialized departments (e.g., Frontend, Backend, DevOps, Quality Assurance, and Security Operations), and the systematic interpretation of distributed telemetry."
    )
    add_body_p(doc,
        "Despite this industry reality, undergraduate computer science and cybersecurity education remains largely anchored in nineteenth-century pedagogical models adapted to twentieth-century computing labs. Traditional university coursework evaluates students through isolated, single-user programming assignments submitted to batch automated grading systems (such as Web-CAT, Gradescope, or custom unit-test runners). While effective for evaluating basic syntactic fluency and isolated algorithmic mechanics, these traditional paradigms fail completely to cultivate the operational intuition, diagnostic problem-solving, and team dynamics required to navigate production-grade engineering emergencies."
    )
    add_body_p(doc,
        "To bridge this critical pedagogical divide, this project introduces SimOffice—a browser-based, multiplayer 3D virtual office simulation platform designed specifically for collaborative cybersecurity training, software debugging, and operational incident triage. SimOffice recreates the physical, social, and operational experience of working inside a high-tempo software company. Within a spatial 3D corporate campus rendered directly in modern web browsers via WebGL and Babylon.js, students embody animated software engineers who explore departmental office spaces, assemble at shared workstations, and collaboratively diagnose and remediate real, intentionally injected software defects and security vulnerabilities."
    )
    add_body_p(doc,
        "An instructor assumes the operational role of Engineering Director. From a centralized administrative cockpit, the instructor initiates synchronized lab sessions, selects incident scenarios with tailored difficulty curves, monitors granular student activity and team verification states in real time, and dynamically broadcasts diagnostic hints or initiates post-incident debriefs. Under the hood, SimOffice delivers an enterprise-grade multi-tenant execution harness utilizing Google's gVisor kernel-virtualization technology, guaranteeing absolute multi-tenant container isolation, deterministic resource throttling, and strict egress network blocking on minimal campus hardware."
    )
    
    add_figure_placeholder(doc, "1.1", "Conceptual Overview of the SimOffice Simulation Paradigm",
        "Depicts the interplay between the 3D WebGL client, the instructor dashboard, the Colyseus state synchronization layer, and the gVisor-isolated code execution sandboxes.")

    # 1.2 PROBLEM STATEMENT
    add_section_heading(doc, "1.2 PROBLEM STATEMENT")
    add_body_p(doc,
        "The fundamental problem addressed by SimOffice originates in the structural pathology of contemporary computing pedagogy, which segregates theoretical instruction from collaborative, real-time operational practice. Specifically, computer science curricula exhibit four acute failure modes:"
    )
    add_bullet_p(doc, "1. Cognitive and Social Isolation in Traditional Lab Exercises:",
        "Standard university programming labs treat code construction as a solitary, asynchronous endeavor. Students write code in independent environments and push to Git repositories or grading portals. This artificial isolation denies students the opportunity to practice collaborative debugging—such as pair programming, joint log inspection, hypothesizing, and division of diagnostic labor—which accounts for more than 70% of an engineer's time during production outages."
    )
    add_bullet_p(doc, "2. Artificiality of Toy Assignments vs. Real Production Systems:",
        "Conventional homework problems typically consist of 50-to-200-line self-contained algorithms implemented from scratch. Consequently, students develop no mental models for navigating pre-existing, multi-layered codebases, interpreting legacy architectural conventions, or identifying non-obvious logic bugs embedded within realistic web services and asynchronous event loops."
    )
    add_bullet_p(doc, "3. Absence of Live Telemetry and Operational Incident Pressure:",
        "In industry, outages are discovered through customer incident reports, metrics spikes, and broken integration checks. Traditional learning platforms present sterile, predetermined problem descriptions with immediate pass/fail feedback. Students never experience the tension of diagnosing symptoms under time constraints, testing hypotheses against running services, or triaging issues where an improper fix could introduce secondary regressions."
    )
    add_bullet_p(doc, "4. Technical and Financial Prohibitions of Existing Cyber Ranges:",
        "Existing commercial cyber ranges (e.g., HackTheBox, TryHackMe, Cyberbit) and virtual reality educational frameworks impose heavy operational friction. They frequently mandate bulky desktop client installations, complex VPN configurations, costly per-seat enterprise licensing fees ($50–$200/student), or high-end graphics processing hardware that exceeds the budgets and device capabilities of collegiate computer labs and student-owned Chromebooks."
    )
    add_body_p(doc,
        "There is an urgent, unfulfilled need for an accessible, zero-install, browser-native simulation framework that combines the spatial presence and engaging social dynamics of multiplayer virtual worlds with rigorous, production-grade sandbox security and live software triage curriculum."
    )

    # 1.3 PRODUCT VISION
    add_section_heading(doc, "1.3 PRODUCT VISION")
    add_body_p(doc,
        "SimOffice envisions a unified educational metaverse where academic software engineering and cybersecurity education mimic the authentic sociotechnical reality of modern technology enterprises. The platform is grounded in three core design pillars:"
    )
    add_bullet_p(doc, "Authentic Workplace Metaphor:",
        "Rather than interacting with an abstract directory tree or sterile submission form, students enter a living, stylized 3D virtual office building. They walk across departments (Backend, Frontend, DevOps, Security Operations), sit together around ergonomic workstation pods, view team status displays on digital office boards, and congregate in conference rooms for tactical planning and debriefing sessions. Spatial presence transforms passive remote learning into an active, shared team mission."
    )
    add_bullet_p(doc, "Browser-Native Zero-Install Frictionless Access:",
        "To ensure universal accessibility across diverse socioeconomic and institutional environments, SimOffice requires zero client-side installation. The entire 3D interactive experience, rich code editor, terminal logs, and spatial text communication run inside standard, modern web browsers (Chrome, Edge, Firefox, Safari) across commodity hardware, including low-cost institutional Chromebooks, without administrative privileges or plugins."
    )
    add_bullet_p(doc, "Authoritative, Safe, Multi-Tenant Code Execution:",
        "Education in software debugging and cybersecurity inherently involves running broken, untrusted, and potentially hostile code. SimOffice couples an intuitive multiplayer front-end with an impenetrable, self-hosted container virtualization backend. Each student team operates within an ephemeral, fully isolated sandbox enforced at the Linux system-call layer via gVisor, preventing cross-tenant interference, denial-of-service loops, or campus network exfiltration."
    )

    # 1.4 OBJECTIVES
    add_section_heading(doc, "1.4 OBJECTIVES OF THE PROJECT")
    add_body_p(doc,
        "To operationalize this product vision, the project established both pedagogical and technical objectives that governed the architectural design, implementation, and empirical validation phases:"
    )
    add_subsection_heading(doc, "1.4.1 Educational Objectives")
    add_bullet_p(doc, "Cultivate Diagnostic Reasoning Under Operational Scenarios:",
        "Enable students to formulate, test, and validate diagnostic hypotheses against living, running web applications exhibiting realistic behavioral anomalies, rather than simply writing isolated code against abstract specifications."
    )
    add_bullet_p(doc, "Foster Collaborative Team Debugging and Division of Labor:",
        "Require students to coordinate in multi-member teams, sharing insights via synchronized proximity and departmental text channels, negotiating triage strategies, and collaboratively verifying proposed code patches."
    )
    add_bullet_p(doc, "Empower Instructors with Real-Time Telemetry and Intervention Controls:",
        "Provide teachers with live administrative dashboards displaying real-time team progress, active file edits, verification attempts, and idle timers, paired with the capability to broadcast targeted pedagogical hints to struggling teams without breaking classroom flow."
    )
    add_bullet_p(doc, "Automate Pedagogical Debriefing and Performance Attribution:",
        "Generate automated post-session analytics detailing time-to-first-diagnosis, verification run histories, and individual student contributions (code edits, checks executed, chat messages), facilitating objective grading and structured class retrospectives."
    )

    add_subsection_heading(doc, "1.4.2 Technical Objectives")
    add_bullet_p(doc, "Sustain High-Performance 3D Rendering on Constrained Hardware:",
        "Deliver a stable rendering framerate of >=30 frames per second (FPS) on entry-level, education-tier hardware (e.g., dual-core Intel Celeron Chromebooks with 4GB RAM) using Babylon.js WebGL optimizations."
    )
    add_bullet_p(doc, "Achieve Ultra-Low Latency Multiplayer Synchronization:",
        "Maintain multiplayer avatar movement, animation state, and spatial chat synchronization latency below 50 milliseconds Round-Trip Time (RTT) across local campus networks using Colyseus WebSocket state management."
    )
    add_bullet_p(doc, "Enforce Kernel-Level Multi-Tenant Sandbox Isolation:",
        "Architect a dual-zone execution sandbox using self-hosted gVisor (runsc) virtualization to intercept application system calls, enforce 512MB RAM and 1.0 CPU core cgroups, block 100% of network egress traffic, and prevent container breakout attacks."
    )
    add_bullet_p(doc, "Minimize Infrastructure and Operational Hosting Costs:",
        "Ensure the entire production server stack—including reverse proxy, API backend, database, caching layer, and container orchestrator—runs reliably on a single entry-level host ($0 on institutional hardware or $5–$10/month on cloud VPS), avoiding costly SaaS dependencies."
    )

    add_figure_placeholder(doc, "1.2", "SimOffice Incident Triage Lifecycle Workflow",
        "Illustrates the sequential state progression from teacher session initialization, bug injection, student collaborative triage, automated verification, and post-session debrief.")

    # 1.5 SCOPE OF THE PROJECT
    add_section_heading(doc, "1.5 SCOPE OF THE PROJECT")
    add_body_p(doc,
        "The complete product roadmap for SimOffice is organized into four evolutionary phases (Phase 0 through Phase 3). This project report documents the design, implementation, and rigorous evaluation of the Phase 0 Pilot MVP, which provides the foundational architecture and validates core educational and technical hypotheses in a live collegiate environment."
    )
    add_body_p(doc,
        "The scope of Phase 0 is precisely defined as follows:"
    )
    add_bullet_p(doc, "Single Department Focus (Backend Engineering):",
        "Phase 0 focuses exclusively on the Backend Engineering department. The 3D virtual office environment features the dedicated Backend bullpen, equipped with modular workstation desks, server racks, and central status monitors."
    )
    add_bullet_p(doc, "Baseline Incident Scenario (OmniCart Inventory API):",
        "Implementation of a production-style Node.js and Express.js REST microservice representing an e-commerce inventory checkout engine. The scenario includes an intentionally injected critical logic flaw in src/index.js where a hardcoded `if (true)` branch bypasses stock availability checks, allowing inventory counts to underflow into negative numbers."
    )
    add_bullet_p(doc, "Beginner Difficulty Profile and Diagnostic Harness:",
        "Provisioning of automated verification scripts partitioned into diagnostic checks (which students can execute repeatedly to test hypotheses) and formal verification checks (which run against isolated test runners to determine final team success)."
    )
    add_bullet_p(doc, "Text-Based Spatial and Team Communication:",
        "In-world communication is handled through synchronized text chat channels supporting both proximity-based speech (audible only to nearby avatars) and team-wide departmental broadcasts."
    )
    add_bullet_p(doc, "Instructor Telemetry Dashboard and Debrief Engine:",
        "Full implementation of the teacher administrative portal, featuring real-time roster tracking, team verification state tables, hint broadcasting, manual session termination, and post-session performance reviews."
    )
    
    # Table 1.1 Scope Matrix
    table_headers = ["System Capability", "Phase 0 Pilot Scope (Implemented)", "Future Phases (Roadmap)"]
    table_rows = [
        ["Virtual Office Departments", "Backend Engineering department only", "Frontend, DevOps, QA, and SOC floors (Phase 1)"],
        ["Incident Scenarios", "OmniCart Inventory API (Logic flaw / stock underflow)", ">=15 scenarios: XSS, SQLi, Race Conditions, Memory Leaks (Phases 1-2)"],
        ["Multiplayer Communication", "Synchronized spatial & team text chat", "Spatial WebRTC voice chat and animated emotes (Phase 3)"],
        ["Sandbox Environment", "Single gVisor container per team (Node.js runtime)", "Multi-container microservice clusters per team (Phase 2)"],
        ["Verification Engine", "Dual-zone harness (diagnostic & final checks)", "Multi-stage CI/CD simulation with automated regression tests (Phase 1)"],
        ["Gamification & Economy", "Team pass/fail outcome and time-to-fix metrics", "XP progression, badge achievements, cosmetic customization (Phases 1-3)"],
        ["Administrative Scope", "Teacher session orchestration & live debrief", "Institutional multi-tenant campus management (Phase 3)"]
    ]
    add_table_data(doc, "1.1", "SimOffice Phase 0 Pilot Scope vs. Future Roadmap", table_headers, table_rows, [3.2, 5.7, 5.75])

    # 1.6 REPORT ORGANIZATION
    add_section_heading(doc, "1.6 REPORT ORGANIZATION")
    add_body_p(doc,
        "The remainder of this academic project report is organized systematically into five subsequent chapters, followed by concluding remarks, references, and technical appendices:"
    )
    add_bullet_p(doc, "Chapter 2 — Literature Review:",
        "Surveys foundational and contemporary research in serious games for computing, computer-supported collaborative learning (CSCL), cybersecurity cyber ranges, 3D virtual learning environments, and browser-native multiplayer networking. Identifies critical research gaps and positions SimOffice relative to existing platforms."
    )
    add_bullet_p(doc, "Chapter 3 — System Requirements:",
        "Details the formal functional requirements (FR-01 to FR-18) and non-functional requirements (NFR-01 to NFR-14), presents user personas and behavioral archetypes, outlines comprehensive system use cases, and formalizes scope boundaries."
    )
    add_bullet_p(doc, "Chapter 4 — System Design and Architecture:",
        "Presents the high-level five-tier containerized topology, component responsibility matrix, relational data model, dual-zone trust boundaries, gVisor sandboxing architecture, Colyseus multiplayer state synchronization, session lifecycle state machine, and threat model."
    )
    add_bullet_p(doc, "Chapter 5 — Implementation:",
        "Provides an exhaustive technical discussion of the codebase, detailing the NestJS backend modules (auth, sessions, workstation, verification, reporting, sandbox provider), PostgreSQL schema and views, sandbox-orchestrator microservice, OmniCart scenario content, Babylon.js 3D client integration, and Docker Compose deployment."
    )
    add_bullet_p(doc, "Chapter 6 — Testing and Results:",
        "Examines the multi-tier testing methodology, evaluates unit test results across 11 Jest suites (including root-cause analysis of test harness dependency injection configurations), details empirical findings from M0.1a and M0.1b technical spikes, and reviews Phase 0 exit criteria status."
    )
    add_bullet_p(doc, "Conclusion and Future Work:",
        "Synthesizes project outcomes, reflects on key technical decisions, acknowledges known limitations, and outlines the developmental roadmap for Phases 1, 2, and 3."
    )
    add_bullet_p(doc, "References & Appendices:",
        "Compiles extensive APA-formatted academic citations, followed by Appendix 1 (Exhaustive PostgreSQL Database Schema) and Appendix 2 (Comprehensive API and WebSocket Endpoint Summary)."
    )
    
    doc.add_page_break()
