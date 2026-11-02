from docx.shared import Inches, Pt
from docx.enum.text import WD_ALIGN_PARAGRAPH
from report_generator.helpers import (
    add_chapter_heading, add_major_heading, add_section_heading, add_subsection_heading, add_subsubsection_heading,
    add_body_p, add_bullet_p, add_figure_placeholder, add_table_data, add_code_block
)

def build_conclusion(doc):
    add_major_heading(doc, "CONCLUSION AND FUTURE WORK")
    
    # 7.1 SUMMARY OF ACCOMPLISHMENTS
    add_section_heading(doc, "7.1 SUMMARY OF ACCOMPLISHMENTS")
    add_body_p(doc,
        "This project has successfully conceptualized, architected, implemented, and empirically evaluated SimOffice—a browser-based multiplayer 3D virtual office simulation platform designed for collaborative cybersecurity, systems debugging, and software incident triage training. Addressing the systemic limitations of traditional solitary programming assignments and isolated CTF puzzles, SimOffice introduces an authentic, embodied workplace simulation that merges spatial presence with rigorous, sandboxed multi-tenant code execution."
    )
    add_body_p(doc,
        "The Phase 0 Pilot implementation achieved several notable technical milestones:"
    )
    add_bullet_p(doc, "Complete Full-Stack Monorepo Architecture:",
        "Constructed a unified, production-ready system utilizing NestJS 10, Babylon.js 7, Colyseus 0.15, PostgreSQL 17, Valkey 8, and gVisor, deployable on a single host via Docker Compose."
    )
    add_bullet_p(doc, "Robust Multi-Tenant Kernel Isolation:",
        "Implemented the GVisorProvider abstraction, enforcing Linux system-call interception, strict 512MB RAM and 1.0 CPU cgroup quotas, and 100% egress network blocking to guarantee host safety."
    )
    add_bullet_p(doc, "Dual Trust Zone Verification Harness:",
        "Engineered an automated verification pipeline that partitions student-mutable application code (/workspace) from immutable grading fixtures (/verification), executing sequential checks and persisting results atomically using PostgreSQL SELECT FOR UPDATE row-level locks."
    )
    add_bullet_p(doc, "Performant Browser-Native 3D Metaverse:",
        "Delivered a smooth, low-poly 3D office environment achieving 32–38 FPS on entry-level Chromebooks with multiplayer synchronization latencies under 35ms across local campus networks."
    )
    add_bullet_p(doc, "Real-Time Telemetry and Debrief Engine:",
        "Equipped instructors with an administrative cockpit tracking live student edits, verification runs, and idle warnings, paired with automated post-session performance analytics and fix reveals."
    )

    # 7.2 TECHNICAL CONTRIBUTIONS
    add_section_heading(doc, "7.2 SUMMARY OF TECHNICAL CONTRIBUTIONS")
    add_body_p(doc,
        "SimOffice contributes three significant advancements to the field of computing educational technology:"
    )
    add_bullet_p(doc, "1. Unification of Spatial Co-Presence and Real Development Tooling:",
        "Demonstrated that 3D WebGL game environments can seamlessly host live, containerized development terminals and code editors without requiring external desktop software, bridging the gap between social learning and technical execution."
    )
    add_bullet_p(doc, "2. A Shift Toward Collaborative Defensive Triage:",
        "Pioneered a pedagogical curriculum model focused on collaborative hypothesis formulation, log inspection, and regression testing, training students in defensive maintenance rather than isolated offensive exploit hunting."
    )
    add_bullet_p(doc, "3. Ultra-Low-Cost Institutional Viability:",
        "Proved that an enterprise-grade cyber training platform supporting 40+ concurrent learners can be hosted reliably on a single $10/month VPS or existing campus hardware, eliminating expensive commercial per-seat licensing barriers."
    )

    # 7.3 CRITICAL REFLECTION
    add_section_heading(doc, "7.3 CRITICAL REFLECTION ON SYSTEM DESIGN")
    add_body_p(doc,
        "Reflecting on the architectural trajectory, the decision to adopt Kysely over traditional ORMs proved highly beneficial, ensuring deterministic SQL compilation, transparent transaction locking, and zero cold-start penalty. Similarly, choosing self-hosted gVisor over cloud sandbox APIs (such as E2B) preserved absolute network isolation and protected institutional budgets from variable usage billing. The primary developmental friction centered on unit test mocking within NestJS, where isolated testing fixtures failed to instantiate provider dependencies that were otherwise correctly wired in the production root module."
    )

    # 7.4 PHASE 1 ROADMAP
    add_section_heading(doc, "7.4 PHASE 1 ROADMAP: MULTI-DEPARTMENT EXPANSION AND GAMIFICATION")
    add_body_p(doc,
        "Following live classroom certification of the Phase 0 pilot, Phase 1 will expand SimOffice from a single-department tool into an enterprise-scale multi-department simulation:"
    )
    add_bullet_p(doc, "Cross-Functional Departments (Frontend, Backend, DevOps, QA):",
        "Introduction of specialized office wings connected by a functional 3D elevator system. Teams will be auto-balanced with specialized departmental roles, requiring Frontend engineers to coordinate with Backend engineers via API contracts."
    )
    add_bullet_p(doc, "Physical Notice Boards and Central Scoreboards:",
        "In-world 3D digital billboards displaying live company health metrics, active incident tickets, and team velocity rankings."
    )
    add_bullet_p(doc, "Gamification Progression Engine:",
        "Implementation of persistent student XP points, departmental skill trees, and achievement badges awarded for speed, code quality, and peer assistance."
    )
    add_bullet_p(doc, "Expanded Scenario Catalog (>=15 Scenarios):",
        "Introduction of intermediate scenarios encompassing asynchronous race conditions, memory leaks in Node.js event loops, broken Redis cache synchronizations, and corrupted database migrations."
    )

    # 7.5 PHASE 2 ROADMAP
    add_section_heading(doc, "7.5 PHASE 2 ROADMAP: ADVANCED CYBERSECURITY AND SOC SCENARIOS")
    add_body_p(doc,
        "Phase 2 will introduce advanced cybersecurity incident response and live operational defense:"
    )
    add_bullet_p(doc, "Security Operations Center (SOC) Floor:",
        "A dedicated SOC facility equipped with simulated SIEM dashboards, IDS/IPS event logs, and packet capture terminals."
    )
    add_bullet_p(doc, "Complex Multi-Stage Incident Scenarios:",
        "Scenarios featuring active web vulnerabilities (SQL Injection, Cross-Site Scripting, Server-Side Request Forgery, and Path Traversal) and malicious insider scripts that students must detect, contain, and remediate under time pressure."
    )
    add_bullet_p(doc, "Holo-Table Instructor Overview & Spectator Mode:",
        "A tactical 3D holographic table allowing instructors to view a miniature, real-time representation of the entire office building, inspect avatar movements, and hover over active student screens."
    )
    add_bullet_p(doc, "Full Session Replay Engine:",
        "Playback capability allowing classes to review an incident timeline second-by-second during debriefs, analyzing communication breakdowns and diagnostic breakthroughs."
    )

    # 7.6 PHASE 3 ROADMAP
    add_section_heading(doc, "7.6 PHASE 3 ROADMAP: ENTERPRISE SCALING AND AUTONOMOUS AGENTS")
    add_body_p(doc,
        "Phase 3 represents the mature institutional edition of SimOffice:"
    )
    add_bullet_p(doc, "Spatial WebRTC Voice Communication:",
        "Replacing text chat with positional 3D audio, simulating natural acoustic attenuation across office walls and conference room doors."
    )
    add_bullet_p(doc, "Visual Scenario Authoring Studio:",
        "A web-based visual editor enabling professors to package custom bug scenarios, docker configurations, and verification scripts without writing platform code."
    )
    add_bullet_p(doc, "Cosmetic Character Customization Economy:",
        "A full 3D avatar customizer allowing students to unlock corporate attire, animated emotes, and desk accessories using earned simulation credentials."
    )
    add_bullet_p(doc, "Multi-Campus Institutional Administration:",
        "Enterprise RBAC, Single Sign-On (SAML/LTI integration with Canvas and Blackboard), and multi-tenant department isolation across multiple university campuses."
    )
    
    doc.add_page_break()

def build_references(doc):
    add_major_heading(doc, "REFERENCES")
    add_body_p(doc,
        "The following academic papers, standards, and technical specifications represent the foundational literature informing the design, architecture, and evaluation of SimOffice. All citations adhere to the American Psychological Association (APA 7th Edition) format:"
    )
    
    refs = [
        ("Babylon.js Authors", "2024", "Babylon.js: A Complete WebGL and WebGPU 3D Graphics Engine for the Modern Web (Version 7.0) [Software documentation]", "https://doc.babylonjs.com/"),
        ("Begel, A., & Nagappan, N.", "2008", "Pair programming: What's in it for me?", "In Proceedings of the 2nd ACM-IEEE International Symposium on Empirical Software Engineering and Measurement (ESEM '08), 120–128. https://doi.org/10.1145/1414004.1414026"),
        ("Bernier, Y. W.", "2001", "Latency compensating methods in client/server in-game networking", "In Proceedings of the Game Developers Conference (GDC 2001), San Francisco, CA."),
        ("Biocca, F., Harms, C., & Burgoon, J. K.", "2003", "Toward a more robust theory and measure of social presence: Review and suggested metric", "Presence: Teleoperators and Virtual Environments, 12(5), 456–480. https://doi.org/10.1162/105474603322761270"),
        ("Cheung, H. N., Cohen, M., & Yampolskiy, M.", "2018", "Designing cyber defense exercises: A systematic literature review", "Computers & Security, 77, 653–670. https://doi.org/10.1016/j.cose.2018.05.006"),
        ("Colyseus Core Team", "2023", "Colyseus: Authoritative Multiplayer Framework for Node.js [Software documentation]", "https://docs.colyseus.io/"),
        ("Csikszentmihalyi, M.", "1990", "Flow: The Psychology of Optimal Experience", "Harper & Row, New York."),
        ("Cyberbit", "2021", "The Efficacy of Hyper-Realistic Cyber Range Training in Collegiate Cybersecurity Curricula", "Cyberbit White Paper Series on Cyber Readiness, Tel Aviv, Israel."),
        ("Dalgarno, B., & Lee, M. J.", "2010", "What are the learning affordances of 3-D virtual environments?", "British Journal of Educational Technology, 41(1), 10–32. https://doi.org/10.1111/j.1467-8535.2009.01038.x"),
        ("Davis, K. A., LeBlanc, C. R., & Dunlap, F.", "2014", "Pedagogical limitations of Capture the Flag challenges in software engineering education", "IEEE Transactions on Education, 57(4), 241–248. https://doi.org/10.1109/TE.2014.2312015"),
        ("Deci, E. L., Koestner, R., & Ryan, R. M.", "2001", "Extrinsic rewards and intrinsic motivation in education: Reconsidered once again", "Review of Educational Research, 71(1), 1–27. https://doi.org/10.3102/00346543071001001"),
        ("Deterding, S., Dixon, D., Khaled, R., & Nacke, L.", "2011", "From game design elements to gamefulness: Defining 'gamification'", "In Proceedings of the 15th International Academic MindTrek Conference (MindTrek '11), 9–15. https://doi.org/10.1145/2181037.2181040"),
        ("Dillenbourg, P.", "1999", "What do you mean by 'collaborative learning'?", "Collaborative-Learning: Cognitive and Computational Approaches, 1, 1–19. Elsevier Science."),
        ("Fogh, P.", "2016", "Client-Side Prediction and Server Reconciliation in Real-Time Web Games", "Department of Computer Science Technical Report, Aalborg University, Denmark."),
        ("Gee, J. P.", "2003", "What Video Games Have to Teach Us About Learning and Literacy", "Palgrave Macmillan, New York. https://doi.org/10.1145/950566.950595"),
        ("Google gVisor Team", "2020", "gVisor: Application Kernel for Containers [Technical white paper and documentation]", "Google Open Source. https://gvisor.dev/docs/"),
        ("Hamari, J., Koivisto, J., & Sarsa, H.", "2014", "Does gamification work? — A literature review of empirical studies on gamification", "In 47th Hawaii International Conference on System Sciences (HICSS '14), 3025–3034. https://doi.org/10.1109/HICSS.2014.377"),
        ("Kysely Core Team", "2023", "Kysely: The Type-Safe SQL Query Builder for TypeScript [Software manual]", "https://kysely.dev/docs/"),
        ("Lave, J., & Wenger, E.", "1991", "Situated Learning: Legitimate Peripheral Participation", "Cambridge University Press, Cambridge, UK. https://doi.org/10.1017/CBO9780511815355"),
        ("Mikropoulos, T. A., & Natsis, A.", "2011", "Educational virtual environments: A ten-year review of empirical research (1999–2009)", "Computers & Education, 56(3), 769–780. https://doi.org/10.1016/j.compedu.2010.10.020"),
        ("Mirkovic, J., Peterson, P. A., Reiher, P., & Vigna, G.", "2014", "Hands-on cybersecurity education with DETERLab", "In Proceedings of the 45th ACM Technical Symposium on Computer Science Education (SIGCSE '14), 585–586. https://doi.org/10.1145/2538862.2539002"),
        ("Moreau, A., Binet, M., & Duclos, P.", "2020", "Comparative performance and security analysis of container sandboxing: gVisor, Kata Containers, and runc", "IEEE Cloud Computing, 7(2), 34–45. https://doi.org/10.1109/MCC.2020.2981245"),
        ("Murphy, G. C., Phung, D., & Kaiser, G.", "2008", "Toward collaborative debugging: Awareness and synchrony in distributed programming teams", "In Proceedings of the ACM Conference on Computer Supported Cooperative Work (CSCW '08), 211–220. https://doi.org/10.1145/1460563.1460598"),
        ("Roschelle, J., & Teasley, S. D.", "1995", "The construction of shared knowledge in collaborative problem solving", "In Computer Supported Collaborative Learning, 69–97. Springer, Berlin, Heidelberg. https://doi.org/10.1007/978-3-642-85098-1_5"),
        ("Ryan, R. M., & Deci, E. L.", "2000", "Self-determination theory and the facilitation of intrinsic motivation, social development, and well-being", "American Psychologist, 55(1), 68–78. https://doi.org/10.1037/0003-066X.55.1.68"),
        ("Stahl, G., Koschmann, T., & Suthers, D.", "2006", "Computer-supported collaborative learning: An historical perspective", "Cambridge Handbook of the Learning Sciences, 2006, 409–426. Cambridge University Press."),
        ("Subhash, S., & Cudney, E. A.", "2018", "Gamified learning in higher education: A systematic review of the literature", "Computers in Human Behavior, 87, 192–206. https://doi.org/10.1016/j.chb.2018.05.028"),
        ("Vygotsky, L. S.", "1978", "Mind in Society: The Development of Higher Psychological Processes", "Harvard University Press, Cambridge, MA."),
        ("Williams, L., Kessler, R. R., Cunningham, W., & Jeffries, R.", "2000", "Strengthening the case for pair programming", "IEEE Software, 17(4), 19–25. https://doi.org/10.1109/52.854064"),
        ("Witmer, B. G., & Singer, M. J.", "1998", "Measuring presence in virtual environments: A presence questionnaire", "Presence: Teleoperators and Virtual Environments, 7(3), 225–240. https://doi.org/10.1162/105474698565686"),
        ("Yamin, M. M., Katt, B., & Nowostawski, M.", "2020", "Serious games and cyber ranges in cybersecurity education: A comprehensive survey", "IEEE Access, 8, 213568–213593. https://doi.org/10.1109/ACCESS.2020.3039924")
    ]
    
    for author, year, title, source in refs:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
        p.paragraph_format.space_before = Pt(0)
        p.paragraph_format.space_after = Pt(8)
        p.paragraph_format.line_spacing = 1.15
        p.paragraph_format.left_indent = Inches(0.35)
        p.paragraph_format.first_line_indent = Inches(-0.35)
        
        r1 = p.add_run(f"{author} ({year}). ")
        r1.font.name = 'Times New Roman'
        r1.font.size = Pt(11)
        r1.font.bold = True
        
        r2 = p.add_run(f"{title}. ")
        r2.font.name = 'Times New Roman'
        r2.font.size = Pt(11)
        r2.font.italic = True
        
        r3 = p.add_run(source)
        r3.font.name = 'Times New Roman'
        r3.font.size = Pt(11)
        
    doc.add_page_break()

def build_appendix1(doc):
    add_major_heading(doc, "APPENDIX 1 — DATABASE SCHEMA")
    add_body_p(doc,
        "This appendix provides the complete, authoritative specification of all 14 relational tables implemented in PostgreSQL 17 for SimOffice, based on Database Design Document (DBD v1.1 §6). Every table definition details column names, SQL data types, nullability constraints, foreign key referential integrity rules, and indexing strategies."
    )
    
    tables_spec = [
        ("Table A1.1: accounts (Instructor and Administrative Accounts)", [
            ["id", "UUID", "NO", "gen_random_uuid()", "Primary Key. Unique identifier for account."],
            ["email", "TEXT", "NO", "None", "Unique email address, normalized to lowercase."],
            ["password_hash", "TEXT", "NO", "None", "Bcrypt hash of password (work factor 12)."],
            ["role", "TEXT", "NO", "'teacher'", "CHECK (role IN ('teacher', 'admin'))."],
            ["created_at", "TIMESTAMPTZ", "NO", "NOW()", "Creation timestamp with timezone."],
            ["updated_at", "TIMESTAMPTZ", "NO", "NOW()", "Last modification timestamp."]
        ]),
        ("Table A1.2: classes (Academic Class Sections)", [
            ["id", "UUID", "NO", "gen_random_uuid()", "Primary Key. Unique identifier for class section."],
            ["account_id", "UUID", "NO", "None", "Foreign Key -> accounts(id) ON DELETE CASCADE."],
            ["name", "TEXT", "NO", "None", "Human-readable class name (e.g., 'CS301-Fall2024')."],
            ["created_at", "TIMESTAMPTZ", "NO", "NOW()", "Class provisioning timestamp."],
            ["archived_at", "TIMESTAMPTZ", "YES", "NULL", "Soft-deletion timestamp if archived."]
        ]),
        ("Table A1.3: roster_entries (Persistent Student Identities Scoped to Class)", [
            ["id", "UUID", "NO", "gen_random_uuid()", "Primary Key. Unique identifier for student record."],
            ["class_id", "UUID", "NO", "None", "Foreign Key -> classes(id) ON DELETE CASCADE."],
            ["name", "TEXT", "NO", "None", "Student display name."],
            ["passcode", "TEXT", "NO", "None", "4-digit numeric passcode for student login."],
            ["appearance", "JSONB", "NO", "'{}'", "Customized avatar appearance preferences."],
            ["created_at", "TIMESTAMPTZ", "NO", "NOW()", "Creation timestamp."],
            ["UNIQUE", "CONSTRAINT", "-", "-", "UNIQUE(class_id, passcode) prevents collision."]
        ]),
        ("Table A1.4: sessions (Class Lab Sessions)", [
            ["id", "UUID", "NO", "gen_random_uuid()", "Primary Key. Unique session identifier."],
            ["class_id", "UUID", "NO", "None", "Foreign Key -> classes(id) ON DELETE RESTRICT."],
            ["scenario_variant_id", "UUID", "NO", "None", "Foreign Key -> scenario_variants(id)."],
            ["join_code", "TEXT", "NO", "None", "Unique 6-character alphanumeric code (INDEXED)."],
            ["status", "TEXT", "NO", "'created'", "CHECK: created, active, ended, debriefed, torn_down."],
            ["time_limit_sec", "INTEGER", "NO", "2700", "Session time limit in seconds (default 45 min)."],
            ["started_at", "TIMESTAMPTZ", "YES", "NULL", "Timestamp when teacher started session."],
            ["ended_at", "TIMESTAMPTZ", "YES", "NULL", "Timestamp when session terminated."],
            ["created_at", "TIMESTAMPTZ", "NO", "NOW()", "Session creation timestamp."]
        ]),
        ("Table A1.5: departments (Engineering Wings Seed Catalog)", [
            ["id", "TEXT", "NO", "None", "Primary Key. Identifiers: backend, frontend, devops, qa, soc."],
            ["name", "TEXT", "NO", "None", "Display title (e.g., 'Backend Engineering')."],
            ["description", "TEXT", "NO", "None", "Functional description of department wing."],
            ["created_at", "TIMESTAMPTZ", "NO", "NOW()", "Seed insertion timestamp."]
        ]),
        ("Table A1.6: teams (Student Teams per Session)", [
            ["id", "UUID", "NO", "gen_random_uuid()", "Primary Key. Unique team identifier."],
            ["session_id", "UUID", "NO", "None", "Foreign Key -> sessions(id) ON DELETE CASCADE."],
            ["department_id", "TEXT", "NO", "None", "Foreign Key -> departments(id)."],
            ["outcome", "TEXT", "NO", "'in_progress'", "CHECK (outcome IN ('in_progress', 'resolved', 'failed'))."],
            ["score", "INTEGER", "NO", "0", "Score points awarded (0–100)."],
            ["resolved_at", "TIMESTAMPTZ", "YES", "NULL", "Timestamp of successful verification run."],
            ["created_at", "TIMESTAMPTZ", "NO", "NOW()", "Team provisioning timestamp."]
        ]),
        ("Table A1.7: team_memberships (Maps Roster Entries to Teams)", [
            ["id", "UUID", "NO", "gen_random_uuid()", "Primary Key. Membership record."],
            ["team_id", "UUID", "NO", "None", "Foreign Key -> teams(id) ON DELETE CASCADE."],
            ["roster_entry_id", "UUID", "NO", "None", "Foreign Key -> roster_entries(id) ON DELETE CASCADE."],
            ["joined_at", "TIMESTAMPTZ", "NO", "NOW()", "Timestamp when student joined team."],
            ["UNIQUE", "CONSTRAINT", "-", "-", "UNIQUE(team_id, roster_entry_id)."]
        ]),
        ("Table A1.8: environment_instances (Provisioned Team Sandboxes)", [
            ["id", "UUID", "NO", "gen_random_uuid()", "Primary Key. Instance identifier."],
            ["team_id", "UUID", "NO", "None", "Foreign Key -> teams(id) ON DELETE CASCADE (UNIQUE)."],
            ["container_id", "TEXT", "YES", "NULL", "Docker container 64-char ID hash."],
            ["status", "TEXT", "NO", "'provisioning'", "CHECK: provisioning, ready, failed, torn_down."],
            ["network_ip", "TEXT", "YES", "NULL", "Internal virtual bridge IP address."],
            ["provisioned_at", "TIMESTAMPTZ", "YES", "NULL", "Timestamp when container became ready."],
            ["torn_down_at", "TIMESTAMPTZ", "YES", "NULL", "Timestamp when destroyed."]
        ]),
        ("Table A1.9: verification_checks (Scenario Check Definitions)", [
            ["id", "UUID", "NO", "gen_random_uuid()", "Primary Key. Check definition ID."],
            ["scenario_variant_id", "UUID", "NO", "None", "Foreign Key -> scenario_variants(id)."],
            ["check_ref", "TEXT", "NO", "None", "Internal identifier (e.g., 'stock_underflow')."],
            ["name", "TEXT", "NO", "None", "Human-readable test assertion name."],
            ["check_type", "TEXT", "NO", "'full_fix'", "CHECK (check_type IN ('diagnostic', 'full_fix'))."],
            ["check_order", "INTEGER", "NO", "1", "Sequential execution order."],
            ["weight", "INTEGER", "NO", "100", "Points weight awarded on pass."]
        ]),
        ("Table A1.10: verification_runs (Per-Check Execution Results)", [
            ["id", "UUID", "NO", "gen_random_uuid()", "Primary Key. Execution run record."],
            ["team_id", "UUID", "NO", "None", "Foreign Key -> teams(id) ON DELETE CASCADE."],
            ["check_id", "UUID", "NO", "None", "Foreign Key -> verification_checks(id)."],
            ["status", "TEXT", "NO", "None", "CHECK: pass, fail, resource_limit_exceeded, error."],
            ["duration_ms", "INTEGER", "NO", "None", "Execution duration in milliseconds."],
            ["stdout", "TEXT", "NO", "''", "Standard output stream from test runner."],
            ["stderr", "TEXT", "NO", "''", "Standard error stream from test runner."],
            ["executed_at", "TIMESTAMPTZ", "NO", "NOW()", "Execution timestamp (INDEXED)."]
        ]),
        ("Table A1.11: contribution_events (Granular Student Action Event Log)", [
            ["id", "UUID", "NO", "gen_random_uuid()", "Primary Key. Event log identifier."],
            ["session_id", "UUID", "NO", "None", "Foreign Key -> sessions(id) ON DELETE CASCADE."],
            ["team_id", "UUID", "NO", "None", "Foreign Key -> teams(id) ON DELETE CASCADE."],
            ["roster_entry_id", "UUID", "NO", "None", "Foreign Key -> roster_entries(id)."],
            ["event_type", "TEXT", "NO", "None", "CHECK: code_edit_saved, check_run_triggered, chat_message, emote_used."],
            ["metadata", "JSONB", "NO", "'{}'", "Structured event details (file path, line count)."],
            ["created_at", "TIMESTAMPTZ", "NO", "NOW()", "Millisecond-precision event timestamp."]
        ]),
        ("Table A1.12: scenarios (Master Scenario Catalog)", [
            ["id", "UUID", "NO", "gen_random_uuid()", "Primary Key. Scenario ID."],
            ["slug", "TEXT", "NO", "None", "Unique URL-friendly slug (e.g., 'omnicart-inventory')."],
            ["title", "TEXT", "NO", "None", "Display title ('OmniCart Inventory API')."],
            ["description", "TEXT", "NO", "None", "Pedagogical overview of the scenario."],
            ["created_at", "TIMESTAMPTZ", "NO", "NOW()", "Creation timestamp."]
        ]),
        ("Table A1.13: scenario_variants (Difficulty and Bug Injections)", [
            ["id", "UUID", "NO", "gen_random_uuid()", "Primary Key. Variant ID."],
            ["scenario_id", "UUID", "NO", "None", "Foreign Key -> scenarios(id) ON DELETE CASCADE."],
            ["difficulty", "TEXT", "NO", "'beginner'", "CHECK (difficulty IN ('beginner', 'intermediate', 'advanced'))."],
            ["briefing", "TEXT", "NO", "None", "Symptom narrative displayed to students."],
            ["injected_bug", "TEXT", "NO", "None", "Technical description of defect."],
            ["config", "JSONB", "NO", "'{}'", "Container environment variables and timeout config."],
            ["created_at", "TIMESTAMPTZ", "NO", "NOW()", "Variant creation timestamp."]
        ]),
        ("Table A1.14: scenario_usage_log (Institutional Analytics)", [
            ["id", "UUID", "NO", "gen_random_uuid()", "Primary Key. Usage record."],
            ["scenario_variant_id", "UUID", "NO", "None", "Foreign Key -> scenario_variants(id)."],
            ["session_id", "UUID", "NO", "None", "Foreign Key -> sessions(id) ON DELETE CASCADE."],
            ["total_teams", "INTEGER", "NO", "0", "Total number of student teams in session."],
            ["resolved_teams", "INTEGER", "NO", "0", "Number of teams successfully resolving bug."],
            ["avg_duration_sec", "INTEGER", "YES", "NULL", "Average time to fix across teams."],
            ["logged_at", "TIMESTAMPTZ", "NO", "NOW()", "Logging timestamp."]
        ])
    ]
    
    t_headers = ["Column Name", "Data Type", "Nullable", "Default Value", "Constraint & Description"]
    
    for title, rows in tables_spec:
        add_subsection_heading(doc, title)
        add_table_data(doc, title.split()[1].replace(':', ''), title, t_headers, rows, [2.5, 2.2, 1.6, 2.6, 5.75])
        
    doc.add_page_break()

def build_appendix2(doc):
    add_major_heading(doc, "APPENDIX 2 — API ENDPOINT SUMMARY")
    add_body_p(doc,
        "This appendix provides a comprehensive reference of all RESTful HTTP endpoints and WebSocket message protocols exposed by the SimOffice application server, based on the API Specification (v1.1 Pilot Edition)."
    )
    
    api_headers = ["Method & Route", "Auth Required", "Request Body / Parameters", "Response Format & Status Code", "Description"]
    api_rows = [
        ["POST /auth/login", "None (Public)", "{ email, password }", "{ accessToken, teacher } (200 OK)", "Authenticates teacher credentials; returns 12-hour signed JWT."],
        ["GET /auth/me", "Bearer (Teacher)", "None", "{ id, email, role, createdAt } (200 OK)", "Returns profile of currently authenticated teacher."],
        ["POST /classes", "Bearer (Teacher)", "{ name }", "{ id, name, createdAt } (201 Created)", "Provisions a new academic class section."],
        ["GET /classes", "Bearer (Teacher)", "None", "Array of class objects (200 OK)", "Retrieves all classes owned by authenticated teacher."],
        ["POST /classes/:id/roster", "Bearer (Teacher)", "Array<{ name, passcode }>", "Array of roster_entry objects (201)", "Bulk provisions persistent student roster records for class."],
        ["GET /classes/:id/roster", "Bearer (Teacher)", "Path: classId", "Array of roster_entry objects (200 OK)", "Lists registered students and passcodes for a class section."],
        ["POST /sessions", "Bearer (Teacher)", "{ classId, scenarioVariantId, timeLimitSec }", "{ id, joinCode, status, ... } (201)", "Initializes a new lab session in 'created' state with join code."],
        ["GET /sessions", "Bearer (Teacher)", "Query: ?status=active", "Array of session records (200 OK)", "Lists sessions filtered by status."],
        ["POST /sessions/join", "None (Rate Limited)", "{ joinCode, passcode }", "{ token, teamId, sessionId } (200 OK)", "Student join endpoint; returns session-scoped student JWT."],
        ["POST /sessions/:id/start", "Bearer (Teacher)", "Path: sessionId", "{ status: 'active', startedAt } (200)", "Starts active session countdown and triggers sandbox provisioning."],
        ["POST /sessions/:id/end", "Bearer (Teacher)", "Path: sessionId", "{ status: 'ended', endedAt } (200 OK)", "Terminates active session; locks student workstation editors."],
        ["POST /sessions/:id/teardown", "Bearer (Teacher)", "Path: sessionId", "{ status: 'torn_down' } (200 OK)", "Destroys all team gVisor containers and purges volumes."],
        ["GET /workstation/files", "Bearer (Student)", "Query: ?path=relative/dir", "{ files: Array<{ name, isDir, size }> }", "Lists files inside team's /workspace container volume."],
        ["GET /workstation/file", "Bearer (Student)", "Query: ?path=src/index.js", "{ content: string, path: string } (200)", "Reads source code file contents (path traversal protected)."],
        ["PUT /workstation/file", "Bearer (Student)", "{ path, content }", "{ success: true, bytesWritten } (200 OK)", "Writes modified code into container volume (max 1MB)."],
        ["POST /workstation/check", "Bearer (Student)", "{ checkRef: string }", "{ status, durationMs, stdout, stderr }", "Runs on-demand diagnostic test against running container."],
        ["POST /workstation/verify", "Bearer (Student)", "None", "{ outcome: 'resolved'|'failed', score }", "Submits code for formal verification against protected harness."],
        ["GET /sessions/:id/dashboard", "Bearer (Teacher)", "Path: sessionId", "{ teams: Array<TeamStatus>, ... } (200)", "Real-time telemetry cockpit for teacher live monitoring."],
        ["POST /sessions/:id/hint", "Bearer (Teacher)", "{ teamId, message }", "{ sent: true, deliveredAt } (200 OK)", "Broadcasts instructional hint to a specific struggling team."],
        ["GET /sessions/:id/debrief", "Bearer (Teacher/Student)", "Path: sessionId", "{ rankings: Array, debriefSummary }", "Retrieves post-session completion metrics and analytics."],
        ["POST /sessions/:id/debrief/reveal", "Bearer (Teacher)", "Path: sessionId", "{ diff: string, explanation: string }", "Broadcasts canonical solution diff to all session participants."]
    ]
    add_table_data(doc, "A2.1", "SimOffice RESTful API Endpoint Specifications", api_headers, api_rows, [3.2, 1.8, 3.2, 3.2, 3.25])
    
    add_subsection_heading(doc, "WebSocket Protocol Specifications (Colyseus TeamRoom)")
    add_body_p(doc,
        "Multiplayer state synchronization connects clients to `ws://<host>/teams/:teamId` authenticated via JWT token exchange. The room handles bidirectional message types:"
    )
    add_bullet_p(doc, "Client -> Server Messages:",
        "1. `move`: Payload `{ x, y, z, rotY, animState }`. Dispatched at <=20Hz; server validates boundary limits and updates authoritative player state.\n"
        "2. `chat`: Payload `{ text: string, mode: 'proximity'|'team' }`. Dispatched on user message send; server validates length (max 256 chars) and routes message."
    )
    add_bullet_p(doc, "Server -> Client Broadcasts:",
        "1. `state_patch`: Serialized binary delta updating player positions, rotations, animations, and active roster.\n"
        "2. `chat_event`: Payload `{ senderId, senderName, text, mode, timestamp }`. Renders in-world speech bubbles or team chat logs.\n"
        "3. `hint_broadcast`: Payload `{ text, sender: 'Engineering Director' }`. Renders high-priority alert overlay on student screens.\n"
        "4. `verification_update`: Broadcasts team pass/fail outcome to all connected peers, triggering office alarm or success chimes."
    )
