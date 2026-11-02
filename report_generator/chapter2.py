from report_generator.helpers import (
    add_chapter_heading, add_section_heading, add_subsection_heading,
    add_body_p, add_bullet_p, add_figure_placeholder, add_table_data
)

def build_chapter2(doc):
    add_chapter_heading(doc, 2, "LITERATURE REVIEW")
    
    # 2.1 GAMIFICATION AND SERIOUS GAMES IN COMPUTING EDUCATION
    add_section_heading(doc, "2.1 GAMIFICATION AND SERIOUS GAMES IN COMPUTING EDUCATION")
    add_body_p(doc,
        "The application of game design elements within non-game educational contexts—formally conceptualized as gamification by Deterding et al. (2011)—has emerged as a prominent pedagogical strategy to address student disengagement, high attrition rates, and cognitive fatigue in undergraduate computer science curricula. In their foundational taxonomy, Deterding et al. distinguish between superficial gamification (the mechanical addition of extrinsic reward layers such as points, badges, and leaderboards, colloquially termed PBL mechanics) and serious games, which immerse learners in meaningful, contextually coherent simulated worlds where domain learning is inextricably woven into the core gameplay loop."
    )
    add_body_p(doc,
        "Educational theorist James Paul Gee (2003) argues that effective video games embody superior learning principles compared to conventional pedagogical methods. Gee posits that video games provide 'situated meaning'—learners acquire and manipulate abstract symbols within rich virtual environments where concepts have immediate embodied consequences. Furthermore, games maintain learners in a state of productive challenge, continuously operating within Vygotsky's Zone of Proximal Development (ZPD) by offering immediate feedback cycles and low-stakes failure penalties, allowing learners to cycle through hypothesis formulation, experimentation, and refinement."
    )
    add_body_p(doc,
        "Empirical meta-analyses by Hamari, Koivisto, and Sarsa (2014) and Subhash and Cudney (2018) demonstrate that while superficial PBL mechanics provide short-term motivational boosts, their efficacy attenuates rapidly over sustained academic terms due to the 'overjustification effect,' wherein extrinsic motivators undermine intrinsic intellectual curiosity (Deci, Koestner, & Ryan, 2001). In contrast, serious games grounded in Self-Determination Theory (Ryan & Deci, 2000) satisfy students' innate psychological needs for competence (mastering challenging diagnostic tasks), autonomy (exploring hypotheses freely within sandbox boundaries), and relatedness (collaborating with peers toward shared operational objectives)."
    )
    add_body_p(doc,
        "Within software engineering education, platforms such as CodeCombat and CheckiO have successfully utilized game-based mechanics to teach foundational programming syntax and algorithmic flow to novice programmers. However, these platforms remain strictly focused on individual code submission and puzzle-solving. They do not simulate the social complexities of software maintenance, multi-agent communication, or enterprise system architecture. SimOffice extends this pedagogical trajectory by transitioning from superficial puzzle gamification to a high-fidelity serious simulation of modern corporate software engineering practice."
    )

    # 2.2 COMPUTER-SUPPORTED COLLABORATIVE LEARNING (CSCL) AND TEAM DEBUGGING
    add_section_heading(doc, "2.2 COMPUTER-SUPPORTED COLLABORATIVE LEARNING (CSCL) AND TEAM DEBUGGING")
    add_body_p(doc,
        "Computer-Supported Collaborative Learning (CSCL) investigates how digital communication technologies can mediate and augment social interactions to foster collective knowledge construction (Dillenbourg, 1999; Stahl, Koschmann, & Suthers, 2006). Rooted in the social constructivist paradigms of Lev Vygotsky (1978), CSCL posits that higher-order cognitive functions—including complex diagnostic problem-solving, architectural abstraction, and systems debugging—develop first through interpersonal social discourse before being internalized as individual mental models."
    )
    add_body_p(doc,
        "In their seminal work on collaborative problem-solving, Roschelle and Teasley (1995) define collaboration as 'a coordinated, synchronous activity that is the result of a continued attempt to construct and maintain a shared conception of a problem.' They emphasize that effective collaborative learning requires the establishment of a Joint Problem Space (JPS)—a shared conceptual representation that integrates goals, current state descriptions, available diagnostic operators, and mutual awareness of peer actions."
    )
    add_body_p(doc,
        "In the specific domain of computing, pair programming—a collaborative software development practice popularized by Agile and Extreme Programming methodologies—has been extensively evaluated in academic environments. Empirical studies by Williams, Kessler, Cunningham, and Jeffries (2000) and Begel and Nagappan (2008) demonstrated that student pair programmers produce higher-quality code, exhibit greater persistence in the face of complex debugging hurdles, and report significantly higher academic self-efficacy than students working independently. More recently, the industry adoption of 'ensemble programming' (or mob programming), wherein an entire multi-functional team collaboratively navigates a single codebase in real time, has highlighted the critical importance of group coordination and synchronized shared awareness."
    )
    add_body_p(doc,
        "However, transferring collaborative programming paradigms into remote or hybrid collegiate computer science labs presents formidable logistical obstacles. Traditional video conferencing platforms (e.g., Zoom, Microsoft Teams) impose severe cognitive overhead: screen sharing is inherently asymmetrical (one student controls the screen while peers passively observe), turn-taking is clunky, and spatial presence is absent. Research by Murphy, Phung, and Kaiser (2008) highlights that collaborative software debugging flounders when team members lack immediate, low-friction awareness of what files their peers are examining, what hypotheses are being tested, and what test outputs have been generated. SimOffice directly resolves this barrier by embedding team collaboration within a spatial 3D virtual office, where shared workstations, synchronized telemetry displays, and integrated chat create a natural, continuous Joint Problem Space."
    )

    # 2.3 CYBERSECURITY EDUCATION AND CTF FRAMEWORKS
    add_section_heading(doc, "2.3 CYBERSECURITY EDUCATION AND CTF FRAMEWORKS")
    add_body_p(doc,
        "Over the past fifteen years, the pedagogical landscape of cybersecurity education has pivoted decisively toward hands-on, competitive laboratory exercises, predominantly exemplified by Capture The Flag (CTF) competitions and isolated virtual cyber ranges (Mirkovic et al., 2014; Cheung et al., 2018; Yamin et al., 2020). CTF competitions typically follow one of two formats: 'Jeopardy-style' challenges, where participants solve modular security puzzles across discrete categories (e.g., binary exploitation, cryptography, reverse engineering, web security) to retrieve an arbitrary cryptographic flag string; or 'Attack-Defense' matches, where teams defend their own vulnerable virtual machines while attacking the services of opposing teams."
    )
    add_body_p(doc,
        "Open-source frameworks such as CTFd (an open-source Jeopardy-style scoring server) and commercial platforms such as HackTheBox, TryHackMe, and Cyberbit have achieved widespread adoption across academic universities and corporate training bootcamps. These platforms provide on-demand access to vulnerable virtual machines, democratizing access to penetration testing environments without requiring students to configure complex local hypervisors."
    )
    add_body_p(doc,
        "Despite their undeniable popularity and utility in teaching offensive penetration testing techniques, pedagogical researchers have identified critical educational limitations inherent to traditional CTF models:"
    )
    add_bullet_p(doc, "Disconnection from Production Software Engineering:",
        "As noted by Davis, LeBlanc, and Dunlap (2014), Jeopardy CTFs reward hyper-specialized, contrived exploit tricks (such as finding hidden strings in steganographic images or exploiting esoteric buffer overflows) rather than realistic software maintenance. In real-world technology companies, vulnerabilities are rarely clean puzzles hiding flags; they are subtle concurrency flaws, improper input validations, logic errors in business workflows, and configuration regressions embedded within thousands of lines of legacy microservice code."
    )
    add_bullet_p(doc, "Perverse Focus on Exploitation over Remediation:",
        "Standard CTF platforms terminate the educational interaction at the moment of exploitation—once the flag is extracted and submitted, the problem is solved. Consequently, students rarely learn how to write clean, defensive patches, verify that remediation does not break existing functional business logic, or deploy regression test harnesses. This creates a severe industry skill gap, producing graduates who know how to attack systems but lack the defensive engineering competence to repair them."
    )
    add_bullet_p(doc, "Absence of Operational Team Coordination:",
        "Most online cyber ranges are designed for solo users navigating linear laboratory guides. Even during team CTF tournaments, the typical strategy involves dividing distinct challenges among members to work in complete cognitive silos, rather than collaborating synchronously on a complex, multi-service incident. SimOffice addresses these systemic deficiencies by shifting the core instructional objective from arbitrary flag-hunting to holistic software incident triage, collaborative diagnosis, and automated patch verification."
    )

    # 2.4 3D VIRTUAL LEARNING ENVIRONMENTS (VLEs) AND SPATIAL IMMERSION
    add_section_heading(doc, "2.4 3D VIRTUAL LEARNING ENVIRONMENTS (VLEs) AND SPATIAL IMMERSION")
    add_body_p(doc,
        "The application of 3D Virtual Learning Environments (VLEs) and spatial virtual worlds in education has been extensively documented since the pioneering deployments of Second Life in university curricula during the late 2000s (Mikropoulos & Natsis, 2011; Dalgarno & Lee, 2010). Educational researchers classify the psychological impact of virtual worlds through the twin constructs of 'spatial immersion' (the perceptual illusion of being physically located within a computer-generated space) and 'social presence' (the feeling of being co-present with other human beings in a shared virtual milieu) (Witmer & Singer, 1998; Biocca, Harms, & Burgoon, 2003)."
    )
    add_body_p(doc,
        "Dalgarno and Lee (2010) established an influential conceptual model demonstrating that the spatial fidelity and avatar-mediated interactivity of 3D environments yield five distinct learning affordances: (1) enhanced spatial knowledge representation of domain concepts; (2) experiential learning opportunities that are impossible or hazardous in physical settings; (3) heightened intrinsic motivation and engagement; (4) rich collaborative modeling and peer scaffolding; and (5) improved transfer of knowledge to physical tasks through contextual and situated learning (Lave & Wenger, 1991)."
    )
    add_body_p(doc,
        "In the wake of the COVID-19 pandemic and the permanent rise of distributed work, lightweight virtual office platforms such as Gather.town, Topia, and Virbela emerged to mitigate the social isolation and 'Zoom fatigue' associated with conventional video grid interfaces. Gather.town utilized a 2D retro-RPG tilemap metaphor to introduce proximity-based video and audio communication, demonstrating that spatialized movement significantly increases spontaneous, informal peer interactions and fosters team cohesion."
    )
    add_body_p(doc,
        "However, existing 2D and 3D spatial platforms operate purely as generic communication shells. They lack deep integration with software engineering toolchains, domain-specific execution sandboxes, or automated educational assessment harnesses. Users can walk their avatars across a virtual floorplan, but when actual coding or system administration begins, they must immediately exit the spatial world and switch to external, disconnected desktop applications. SimOffice bridges this chasm by embedding interactive computing workstations directly inside the 3D WebGL office floor, allowing students to inspect server logs, edit code, and trigger automated verification tests without ever breaking spatial immersion."
    )

    add_figure_placeholder(doc, "2.1", "Evolution of Computing Educational Environments",
        "Chronological progression from isolated command-line terminals and automated web graders to Jeopardy CTFs, 2D proximity spaces, and finally integrated 3D virtual office simulations.")

    # 2.5 MULTIPLAYER GAME TECHNOLOGIES AND BROWSER-BASED ARCHITECTURES
    add_section_heading(doc, "2.5 MULTIPLAYER GAME TECHNOLOGIES AND BROWSER ARCHITECTURES")
    add_body_p(doc,
        "Building a performant, browser-based multiplayer 3D simulation presents intricate distributed systems and real-time networking challenges. Historically, rich 3D virtual environments required heavy client software compiled to native desktop binaries (e.g., Unity or Unreal Engine builds), which severely constrained deployment in academic institutions where laboratory computers are tightly locked down and students frequently utilize low-powered Chromebooks."
    )
    add_body_p(doc,
        "The standardization and widespread hardware acceleration of the Web Graphics Library (WebGL) and its successor WebGPU have fundamentally altered this paradigm, enabling modern web browsers to render complex 3D scenes with shader-level performance directly within the Document Object Model (DOM) canvas without external plugins. In the open-source TypeScript ecosystem, two primary rendering engines dominate browser-native 3D development: Three.js and Babylon.js. While Three.js provides a minimalist rendering library requiring developers to manually build scene graphs, physics integrations, and camera controllers, Babylon.js offers a fully integrated, enterprise-grade game engine featuring built-in collision physics, advanced shader pipelines, robust glTF/GLB asset management, and rigorous memory garbage collection routines optimized for resource-constrained browsers."
    )
    add_body_p(doc,
        "At the networking layer, real-time multiplayer architectures must balance low-latency synchronization against authoritative server security to prevent cheating and state desynchronization (Bernier, 2001; Fogh, 2016). In classic networked multiplayer games, the authoritative server architecture dictates that clients transmit only raw player inputs (or high-level intent commands) to the central server; the server validates the inputs, advances the authoritative physics simulation, and broadcasts compressed state deltas back to all connected clients."
    )
    add_body_p(doc,
        "For browser-based applications, the standard bidirectional communication protocol is the HTML5 WebSocket (RFC 6455), which establishes persistent, full-duplex TCP connections over port 80/443, bypassing HTTP polling overhead. While basic WebSocket libraries (such as Socket.io) provide message-passing abstractions, they lack schema-driven state synchronization and delta compression, forcing developers to implement complex spatial interest management from scratch. The Colyseus framework addresses this limitation by implementing a lightweight, schema-encoded authoritative room architecture. Colyseus compiles binary state schemas into efficient byte deltas, broadcasting updates only when monitored properties change, thereby maintaining network bandwidth well within the constraints of shared collegiate Wi-Fi networks."
    )

    # 2.6 COMPARATIVE ANALYSIS OF EXISTING PLATFORMS
    add_section_heading(doc, "2.6 COMPARATIVE ANALYSIS OF EXISTING PLATFORMS")
    add_body_p(doc,
        "To rigorously contextualize SimOffice within the contemporary landscape of educational technology, Table 2.1 presents a comprehensive comparative evaluation across eight structural dimensions, benchmarking SimOffice against prevailing pedagogical paradigms and commercial tools: (1) GitHub Classroom; (2) HackTheBox / TryHackMe; (3) Gather.town; (4) Minecraft Education Edition; and (5) CTFd."
    )
    
    table_headers = ["Platform", "3D Spatial World", "Zero-Install Browser", "Live Isolated Sandbox", "Real-Time Co-Op", "Live Teacher Cockpit", "Defensive Remediation", "Hosting Cost"]
    table_rows = [
        ["GitHub Classroom", "No (Git repo)", "Partial (Codespaces)", "Yes (VM / Cloud)", "No (Async Git PRs)", "No (Static grades)", "Yes (Code fixes)", "Free–High ($/hr)"],
        ["HackTheBox / TryHackMe", "No (Web dashboard)", "Partial (Browser VM)", "Yes (Full VM/LXC)", "No (Primarily solo)", "Limited (Scoreboard)", "No (Offensive flags)", "Commercial ($$$)"],
        ["Gather.town", "2D Pixel art", "Yes (Web canvas)", "No (None)", "Yes (Proximity AV)", "No (Spatial only)", "No (No code/IT)", "Commercial ($$$)"],
        ["Minecraft Education", "Yes (Voxel 3D)", "No (Native app)", "No (In-game only)", "Yes (LAN / Server)", "Limited (In-game UI)", "No (Toy blocks)", "Subscription ($)"],
        ["CTFd", "No (Web forms)", "Yes (HTML forms)", "No (Third-party)", "No (Team points)", "Yes (Scoreboard)", "No (Flag match)", "Free (Self-hosted)"],
        ["SimOffice (Ours)", "Yes (Babylon.js 3D)", "Yes (Pure WebGL)", "Yes (gVisor runsc)", "Yes (Colyseus sync)", "Yes (Full telemetry)", "Yes (Triage & patch)", "Free–$10/mo (VPS)"]
    ]
    add_table_data(doc, "2.1", "Comparative Evaluation of SimOffice Against Existing Platforms", table_headers, table_rows, [2.3, 1.8, 1.8, 1.8, 1.7, 1.8, 1.8, 1.65])
    
    add_body_p(doc,
        "As Table 2.1 starkly reveals, no existing educational platform successfully unifies browser-native 3D spatial immersion, synchronous team collaboration, kernel-isolated live code execution sandboxes, and real-time instructional telemetry within a free, open-source, and self-hostable architectural footprint."
    )

    # 2.7 RESEARCH GAPS IDENTIFIED
    add_section_heading(doc, "2.7 IDENTIFIED RESEARCH GAPS AND NOVEL CONTRIBUTIONS")
    add_body_p(doc,
        "Based on this systematic literature review and comparative analysis, this project identifies three critical research and engineering gaps in computing pedagogy that SimOffice resolves:"
    )
    add_bullet_p(doc, "Gap 1: Disconnection Between Spatial Presence and Real Development Sandboxes:",
        "While 2D/3D virtual worlds have proven highly effective in fostering social presence and mitigating remote learning isolation, they have remained completely disconnected from operational development environments. Existing systems treat virtual worlds merely as video conference lobbies. SimOffice closes this gap by making the virtual office workstations the literal portal to containerized, multi-tenant Linux development sandboxes."
    )
    add_bullet_p(doc, "Gap 2: The Pedagogical Neglect of Defensive Collaborative Triage:",
        "Current cybersecurity educational tools heavily prioritize solo offensive penetration testing ('breaking into a box and capturing a flag'). Consequently, students graduate without practical experience in collaborative incident response, reading unfamiliar codebases under time pressure, identifying logic bugs, formulating shared diagnostic hypotheses, or implementing and verifying non-regressive patches. SimOffice pioneeers an educational framework specifically architected around defensive software triage and team remediation."
    )
    add_bullet_p(doc, "Gap 3: Prohibitive Infrastructure Costs and Administrative Friction:",
        "Existing commercial cyber ranges rely on heavy cloud virtual machines that incur substantial hourly operational expenses and require dedicated IT setup. SimOffice contributes a novel, micro-architected deployment stack utilizing gVisor kernel virtualization, NestJS, and Valkey, allowing an entire collegiate class of 40+ concurrent students to run secure, multi-tenant debugging sessions on a single $10/month VPS or existing university campus server."
    )
    
    doc.add_page_break()
