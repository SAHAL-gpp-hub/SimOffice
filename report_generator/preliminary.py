import docx
from docx.shared import Inches, Pt, Cm, RGBColor
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.oxml import parse_xml
from docx.oxml.ns import nsdecls

def add_cover_page(doc):
    p1 = doc.add_paragraph()
    p1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p1.paragraph_format.space_before = Pt(36)
    p1.paragraph_format.space_after = Pt(12)
    p1.paragraph_format.line_spacing = 1.0
    r1 = p1.add_run("A PROJECT REPORT ON")
    r1.font.name = 'Times New Roman'
    r1.font.size = Pt(14)
    r1.font.bold = True
    
    p2 = doc.add_paragraph()
    p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p2.paragraph_format.space_before = Pt(16)
    p2.paragraph_format.space_after = Pt(20)
    p2.paragraph_format.line_spacing = 1.2
    r2 = p2.add_run("SIMOFFICE: A BROWSER-BASED MULTIPLAYER 3D VIRTUAL OFFICE SIMULATION FOR COLLABORATIVE CYBERSECURITY AND DEBUGGING TRAINING")
    r2.font.name = 'Times New Roman'
    r2.font.size = Pt(17)
    r2.font.bold = True
    
    p3 = doc.add_paragraph()
    p3.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p3.paragraph_format.space_before = Pt(20)
    p3.paragraph_format.space_after = Pt(6)
    p3.paragraph_format.line_spacing = 1.15
    r3 = p3.add_run("Submitted in partial fulfillment for the award of the degree of")
    r3.font.name = 'Times New Roman'
    r3.font.size = Pt(13)
    r3.font.italic = True
    
    p4 = doc.add_paragraph()
    p4.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p4.paragraph_format.space_before = Pt(4)
    p4.paragraph_format.space_after = Pt(24)
    p4.paragraph_format.line_spacing = 1.15
    r4 = p4.add_run("Bachelor of Technology in Computer Science and Engineering")
    r4.font.name = 'Times New Roman'
    r4.font.size = Pt(15)
    r4.font.bold = True
    
    p5 = doc.add_paragraph()
    p5.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p5.paragraph_format.space_before = Pt(10)
    p5.paragraph_format.space_after = Pt(6)
    p5.paragraph_format.line_spacing = 1.0
    r5 = p5.add_run("by")
    r5.font.name = 'Times New Roman'
    r5.font.size = Pt(13)
    r5.font.italic = True
    
    p6 = doc.add_paragraph()
    p6.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p6.paragraph_format.space_before = Pt(4)
    p6.paragraph_format.space_after = Pt(40)
    p6.paragraph_format.line_spacing = 1.15
    r6 = p6.add_run("SAHAL MANSIYA (Reg. No.: 21BCE1042)")
    r6.font.name = 'Times New Roman'
    r6.font.size = Pt(15)
    r6.font.bold = True
    
    p7 = doc.add_paragraph()
    p7.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p7.paragraph_format.space_before = Pt(30)
    p7.paragraph_format.space_after = Pt(4)
    p7.paragraph_format.line_spacing = 1.15
    r7 = p7.add_run("SCHOOL OF COMPUTER SCIENCE AND ENGINEERING")
    r7.font.name = 'Times New Roman'
    r7.font.size = Pt(14)
    r7.font.bold = True
    
    p8 = doc.add_paragraph()
    p8.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p8.paragraph_format.space_before = Pt(4)
    p8.paragraph_format.space_after = Pt(4)
    p8.paragraph_format.line_spacing = 1.15
    r8 = p8.add_run("VELLORE INSTITUTE OF TECHNOLOGY, CHENNAI")
    r8.font.name = 'Times New Roman'
    r8.font.size = Pt(14)
    r8.font.bold = True
    
    p9 = doc.add_paragraph()
    p9.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p9.paragraph_format.space_before = Pt(6)
    p9.paragraph_format.space_after = Pt(0)
    p9.paragraph_format.line_spacing = 1.0
    r9 = p9.add_run("November, 2024")
    r9.font.name = 'Times New Roman'
    r9.font.size = Pt(12)
    r9.font.bold = True
    
    doc.add_page_break()

def add_title_page(doc):
    p1 = doc.add_paragraph()
    p1.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p1.paragraph_format.space_before = Pt(36)
    p1.paragraph_format.space_after = Pt(12)
    p1.paragraph_format.line_spacing = 1.0
    r1 = p1.add_run("A PROJECT REPORT ON")
    r1.font.name = 'Times New Roman'
    r1.font.size = Pt(14)
    r1.font.bold = True
    
    p2 = doc.add_paragraph()
    p2.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p2.paragraph_format.space_before = Pt(16)
    p2.paragraph_format.space_after = Pt(20)
    p2.paragraph_format.line_spacing = 1.2
    r2 = p2.add_run("SIMOFFICE: A BROWSER-BASED MULTIPLAYER 3D VIRTUAL OFFICE SIMULATION FOR COLLABORATIVE CYBERSECURITY AND DEBUGGING TRAINING")
    r2.font.name = 'Times New Roman'
    r2.font.size = Pt(17)
    r2.font.bold = True
    
    p3 = doc.add_paragraph()
    p3.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p3.paragraph_format.space_before = Pt(20)
    p3.paragraph_format.space_after = Pt(6)
    p3.paragraph_format.line_spacing = 1.15
    r3 = p3.add_run("Submitted in partial fulfillment for the award of the degree of")
    r3.font.name = 'Times New Roman'
    r3.font.size = Pt(13)
    r3.font.italic = True
    
    p4 = doc.add_paragraph()
    p4.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p4.paragraph_format.space_before = Pt(4)
    p4.paragraph_format.space_after = Pt(24)
    p4.paragraph_format.line_spacing = 1.15
    r4 = p4.add_run("Bachelor of Technology in Computer Science and Engineering")
    r4.font.name = 'Times New Roman'
    r4.font.size = Pt(15)
    r4.font.bold = True
    
    p5 = doc.add_paragraph()
    p5.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p5.paragraph_format.space_before = Pt(10)
    p5.paragraph_format.space_after = Pt(6)
    p5.paragraph_format.line_spacing = 1.0
    r5 = p5.add_run("by")
    r5.font.name = 'Times New Roman'
    r5.font.size = Pt(13)
    r5.font.italic = True
    
    p6 = doc.add_paragraph()
    p6.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p6.paragraph_format.space_before = Pt(4)
    p6.paragraph_format.space_after = Pt(40)
    p6.paragraph_format.line_spacing = 1.15
    r6 = p6.add_run("SAHAL MANSIYA (Reg. No.: 21BCE1042)")
    r6.font.name = 'Times New Roman'
    r6.font.size = Pt(15)
    r6.font.bold = True
    
    p7 = doc.add_paragraph()
    p7.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p7.paragraph_format.space_before = Pt(30)
    p7.paragraph_format.space_after = Pt(4)
    p7.paragraph_format.line_spacing = 1.15
    r7 = p7.add_run("SCHOOL OF COMPUTER SCIENCE AND ENGINEERING")
    r7.font.name = 'Times New Roman'
    r7.font.size = Pt(14)
    r7.font.bold = True
    
    p8 = doc.add_paragraph()
    p8.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p8.paragraph_format.space_before = Pt(4)
    p8.paragraph_format.space_after = Pt(4)
    p8.paragraph_format.line_spacing = 1.15
    r8 = p8.add_run("VELLORE INSTITUTE OF TECHNOLOGY, CHENNAI")
    r8.font.name = 'Times New Roman'
    r8.font.size = Pt(14)
    r8.font.bold = True
    
    p9 = doc.add_paragraph()
    p9.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p9.paragraph_format.space_before = Pt(6)
    p9.paragraph_format.space_after = Pt(0)
    p9.paragraph_format.line_spacing = 1.0
    r9 = p9.add_run("November, 2024")
    r9.font.name = 'Times New Roman'
    r9.font.size = Pt(12)
    r9.font.bold = True
    
    doc.add_page_break()

def add_declaration(doc):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(18)
    p.paragraph_format.space_after = Pt(18)
    r = p.add_run("DECLARATION")
    r.font.name = 'Times New Roman'
    r.font.size = Pt(14)
    r.font.bold = True
    r.font.underline = True
    
    p1 = doc.add_paragraph()
    p1.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p1.paragraph_format.space_before = Pt(8)
    p1.paragraph_format.space_after = Pt(10)
    p1.paragraph_format.line_spacing = 1.5
    r1 = p1.add_run("I hereby declare that the thesis entitled “SIMOFFICE: A BROWSER-BASED MULTIPLAYER 3D VIRTUAL OFFICE SIMULATION FOR COLLABORATIVE CYBERSECURITY AND DEBUGGING TRAINING” submitted by SAHAL MANSIYA (Reg. No. 21BCE1042), for the award of the degree of Bachelor of Technology in Computer Science and Engineering, Vellore Institute of Technology, Chennai is a record of bonafide work carried out by me under the supervision of ____________________.")
    r1.font.name = 'Times New Roman'
    r1.font.size = Pt(12)
    
    p2 = doc.add_paragraph()
    p2.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p2.paragraph_format.space_before = Pt(8)
    p2.paragraph_format.space_after = Pt(36)
    p2.paragraph_format.line_spacing = 1.5
    r2 = p2.add_run("I further declare that the work reported in this thesis has not been submitted and will not be submitted, either in part or in full, for the award of any other degree or diploma in this institute or any other institute or university.")
    r2.font.name = 'Times New Roman'
    r2.font.size = Pt(12)
    
    table = doc.add_table(rows=2, cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    table.cell(0, 0).width = Cm(7.0)
    table.cell(0, 1).width = Cm(7.65)
    table.cell(1, 0).width = Cm(7.0)
    table.cell(1, 1).width = Cm(7.65)
    
    p_place = table.cell(0, 0).paragraphs[0]
    p_place.paragraph_format.space_before = Pt(0)
    p_place.paragraph_format.space_after = Pt(4)
    r_pl = p_place.add_run("Place: Chennai")
    r_pl.font.name = 'Times New Roman'
    r_pl.font.size = Pt(12)
    r_pl.font.bold = True
    
    p_sig = table.cell(0, 1).paragraphs[0]
    p_sig.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p_sig.paragraph_format.space_before = Pt(0)
    p_sig.paragraph_format.space_after = Pt(4)
    r_sg = p_sig.add_run("Signature of the Candidate")
    r_sg.font.name = 'Times New Roman'
    r_sg.font.size = Pt(12)
    r_sg.font.bold = True
    
    p_date = table.cell(1, 0).paragraphs[0]
    p_date.paragraph_format.space_before = Pt(0)
    p_date.paragraph_format.space_after = Pt(0)
    r_dt = p_date.add_run("Date: November, 2024")
    r_dt.font.name = 'Times New Roman'
    r_dt.font.size = Pt(12)
    r_dt.font.bold = True
    
    p_name = table.cell(1, 1).paragraphs[0]
    p_name.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p_name.paragraph_format.space_before = Pt(0)
    p_name.paragraph_format.space_after = Pt(0)
    r_nm = p_name.add_run("Sahal Mansiya")
    r_nm.font.name = 'Times New Roman'
    r_nm.font.size = Pt(12)
    r_nm.font.bold = True
    
    doc.add_page_break()

def add_certificate(doc):
    p0 = doc.add_paragraph()
    p0.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p0.paragraph_format.space_before = Pt(12)
    p0.paragraph_format.space_after = Pt(4)
    r0 = p0.add_run("School of Computer Science and Engineering")
    r0.font.name = 'Times New Roman'
    r0.font.size = Pt(13)
    r0.font.bold = True
    
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(4)
    p.paragraph_format.space_after = Pt(16)
    r = p.add_run("CERTIFICATE")
    r.font.name = 'Times New Roman'
    r.font.size = Pt(14)
    r.font.bold = True
    r.font.underline = True
    
    p1 = doc.add_paragraph()
    p1.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p1.paragraph_format.space_before = Pt(4)
    p1.paragraph_format.space_after = Pt(12)
    p1.paragraph_format.line_spacing = 1.35
    r1 = p1.add_run("This is to certify that the report entitled “SIMOFFICE: A BROWSER-BASED MULTIPLAYER 3D VIRTUAL OFFICE SIMULATION FOR COLLABORATIVE CYBERSECURITY AND DEBUGGING TRAINING” is prepared and submitted by SAHAL MANSIYA (Reg. No. 21BCE1042) to Vellore Institute of Technology, Chennai, in partial fulfillment of the requirement for the award of the degree of Bachelor of Technology in Computer Science and Engineering is a bonafide record carried out under my guidance. The project fulfills the requirements as per the regulations of this University and in my opinion meets the necessary standards for submission. The contents of this report have not been submitted and will not be submitted either in part or in full, for the award of any other degree or diploma and the same is certified.")
    r1.font.name = 'Times New Roman'
    r1.font.size = Pt(11.5)
    
    # Guide block
    p2 = doc.add_paragraph()
    p2.paragraph_format.space_before = Pt(8)
    p2.paragraph_format.space_after = Pt(2)
    p2.paragraph_format.line_spacing = 1.15
    r2 = p2.add_run("Signature of the Guide: ____________________\nName: ____________________\nDate: November, 2024")
    r2.font.name = 'Times New Roman'
    r2.font.size = Pt(11)
    
    # Examiners block
    table = doc.add_table(rows=3, cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    table.cell(0, 0).width = Cm(7.3)
    table.cell(0, 1).width = Cm(7.35)
    table.cell(1, 0).width = Cm(7.3)
    table.cell(1, 1).width = Cm(7.35)
    table.cell(2, 0).width = Cm(7.3)
    table.cell(2, 1).width = Cm(7.35)
    
    for row in table.rows:
        for cell in row.cells:
            cell.paragraphs[0].paragraph_format.space_before = Pt(1)
            cell.paragraphs[0].paragraph_format.space_after = Pt(1)
            cell.paragraphs[0].paragraph_format.line_spacing = 1.0
            
    table.cell(0, 0).paragraphs[0].add_run("Signature of Examiner 1: ______________").font.name = 'Times New Roman'
    table.cell(0, 1).paragraphs[0].add_run("Signature of Examiner 2: ______________").font.name = 'Times New Roman'
    table.cell(1, 0).paragraphs[0].add_run("Name: _____________________________").font.name = 'Times New Roman'
    table.cell(1, 1).paragraphs[0].add_run("Name: _____________________________").font.name = 'Times New Roman'
    table.cell(2, 0).paragraphs[0].add_run("Date: _____________________________").font.name = 'Times New Roman'
    table.cell(2, 1).paragraphs[0].add_run("Date: _____________________________").font.name = 'Times New Roman'
    
    # HOD Approval
    p_hod = doc.add_paragraph()
    p_hod.paragraph_format.space_before = Pt(12)
    p_hod.paragraph_format.space_after = Pt(2)
    p_hod.paragraph_format.line_spacing = 1.15
    r_hod = p_hod.add_run("Approved by the Head of the Department, Computer Science and Engineering\nName: Prof. Kinjal Patel\nDate: November, 2024")
    r_hod.font.name = 'Times New Roman'
    r_hod.font.size = Pt(11)
    r_hod.font.bold = True
    
    p_seal = doc.add_paragraph()
    p_seal.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p_seal.paragraph_format.space_before = Pt(4)
    p_seal.paragraph_format.space_after = Pt(0)
    r_seal = p_seal.add_run("(Seal of the School of Computer Science and Engineering)")
    r_seal.font.name = 'Times New Roman'
    r_seal.font.size = Pt(10.5)
    r_seal.font.italic = True
    
    doc.add_page_break()

def add_abstract(doc):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(18)
    p.paragraph_format.space_after = Pt(18)
    r = p.add_run("ABSTRACT")
    r.font.name = 'Times New Roman'
    r.font.size = Pt(14)
    r.font.bold = True
    r.font.underline = True
    
    p1 = doc.add_paragraph()
    p1.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p1.paragraph_format.space_before = Pt(4)
    p1.paragraph_format.space_after = Pt(8)
    p1.paragraph_format.line_spacing = 1.35
    r1 = p1.add_run("Modern software engineering education faces a profound structural disconnect between collegiate pedagogical lab assignments and the operational realities of professional engineering practice. While undergraduate computer science curricula emphasize foundational programming and algorithmic reasoning through isolated, single-user exercises, industry incident triage requires real-time diagnostic reasoning, cross-functional collaboration, collective telemetry interpretation, and immediate remediation under operational pressure. Traditional Capture The Flag (CTF) environments and automated code grading platforms isolate students from team communication dynamics and lack spatial workplace presence. This project introduces SimOffice, an open-source, browser-based multiplayer 3D virtual office simulation designed specifically for collaborative cybersecurity and software debugging training.")
    r1.font.name = 'Times New Roman'
    r1.font.size = Pt(11)
    
    p2 = doc.add_paragraph()
    p2.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p2.paragraph_format.space_before = Pt(4)
    p2.paragraph_format.space_after = Pt(8)
    p2.paragraph_format.line_spacing = 1.35
    r2 = p2.add_run("In SimOffice, students operate animated, physics-driven 3D avatars navigating an interactive virtual corporate engineering facility built using Babylon.js and WebGL. An instructor acts as Engineering Director, orchestrating timed classroom sessions, broadcasting contextual hints, injecting targeted logic bugs and security flaws into microservices, and monitoring live team progress via real-time telemetry. Teams interact with departmental computer workstations that mount isolated, multi-tenant execution sandboxes. The architecture employs NestJS, Colyseus WebSocket rooms, PostgreSQL 17, Valkey 8, and self-hosted gVisor (runsc) virtualization. gVisor enforces kernel-level security isolation, strict memory and CPU cgroups, and complete egress network blocking, preventing hostile execution and container escapes.")
    r2.font.name = 'Times New Roman'
    r2.font.size = Pt(11)
    
    p3 = doc.add_paragraph()
    p3.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p3.paragraph_format.space_before = Pt(4)
    p3.paragraph_format.space_after = Pt(12)
    p3.paragraph_format.line_spacing = 1.35
    r3 = p3.add_run("The Phase 0 pilot implementation delivers the complete Backend Department workflow featuring the OmniCart Inventory API scenario, in which students diagnose and patch a critical logic flaw permitting negative inventory underflow. Evaluation across 11 automated test suites and architectural spikes validates sub-50ms multiplayer state synchronization, steady 30+ frames per second rendering on resource-constrained Chromebook hardware, and zero-leak container teardown. SimOffice demonstrates an economically viable ($0–$10/month hosting cost), highly engaging paradigm for collegiate cybersecurity and systems education.")
    r3.font.name = 'Times New Roman'
    r3.font.size = Pt(11)
    
    p_kw = doc.add_paragraph()
    p_kw.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p_kw.paragraph_format.space_before = Pt(6)
    p_kw.paragraph_format.space_after = Pt(0)
    p_kw.paragraph_format.line_spacing = 1.2
    r_kw_bold = p_kw.add_run("Keywords: ")
    r_kw_bold.font.name = 'Times New Roman'
    r_kw_bold.font.size = Pt(11)
    r_kw_bold.font.bold = True
    r_kw = p_kw.add_run("Collaborative Learning, Serious Games, Cybersecurity Education, Multi-Tenant Sandboxing, gVisor, WebGL, Babylon.js, Colyseus, Incident Triage, Virtual Learning Environments.")
    r_kw.font.name = 'Times New Roman'
    r_kw.font.size = Pt(11)
    r_kw.font.italic = True
    
    doc.add_page_break()

def add_acknowledgement(doc):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(18)
    p.paragraph_format.space_after = Pt(18)
    r = p.add_run("ACKNOWLEDGEMENT")
    r.font.name = 'Times New Roman'
    r.font.size = Pt(14)
    r.font.bold = True
    r.font.underline = True
    
    p1 = doc.add_paragraph()
    p1.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p1.paragraph_format.space_before = Pt(4)
    p1.paragraph_format.space_after = Pt(8)
    p1.paragraph_format.line_spacing = 1.35
    r1 = p1.add_run("It is my immense pleasure to express my deepest sense of gratitude to my respected Project Guide, ____________________, School of Computer Science and Engineering, Vellore Institute of Technology, Chennai, for constant guidance, continual encouragement, technical insights, and profound patience throughout the conception, architecture, and realization of this project. The regular discussions, rigorous design reviews, and valuable critiques provided invaluable direction in solving complex distributed systems and sandboxing challenges.")
    r1.font.name = 'Times New Roman'
    r1.font.size = Pt(11.5)
    
    p2 = doc.add_paragraph()
    p2.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p2.paragraph_format.space_before = Pt(4)
    p2.paragraph_format.space_after = Pt(8)
    p2.paragraph_format.line_spacing = 1.35
    r2 = p2.add_run("I extend my sincere gratitude to our visionary leader Dr. G. Viswanathan, Honorable Chancellor, Mr. Sankar Viswanathan, Dr. Sekar Viswanathan, and Dr. G. V. Selvam, Vice Presidents, Dr. Sandhya Pentareddy, Executive Director, Ms. Kadhambari S. Viswanathan, Assistant Vice-President, Dr. V. S. Kanchana Bhaaskaran, Vice-Chancellor, Dr. T. Thyagarajan, Pro-Vice Chancellor, and Dr. P. K. Manoharan, Additional Registrar of Vellore Institute of Technology, Chennai, for establishing world-class infrastructure and providing an inspiring academic ecosystem.")
    r2.font.name = 'Times New Roman'
    r2.font.size = Pt(11.5)
    
    p3 = doc.add_paragraph()
    p3.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p3.paragraph_format.space_before = Pt(4)
    p3.paragraph_format.space_after = Pt(8)
    p3.paragraph_format.line_spacing = 1.35
    r3 = p3.add_run("I express my profound thanks to Dr. Ganesan R, Dean, Dr. Parvathi R, Associate Dean Academics, and Dr. Geetha S, Associate Dean Research, School of Computer Science and Engineering, for their visionary academic leadership and support. In a jubilant state, I extend my wholehearted thanks to Prof. Kinjal Patel, Head of the Department, Computer Science and Engineering, and the Project Coordinators for their encouragement, procedural facilitation, and scholastic backing.")
    r3.font.name = 'Times New Roman'
    r3.font.size = Pt(11.5)
    
    p4 = doc.add_paragraph()
    p4.alignment = WD_ALIGN_PARAGRAPH.JUSTIFY
    p4.paragraph_format.space_before = Pt(4)
    p4.paragraph_format.space_after = Pt(20)
    p4.paragraph_format.line_spacing = 1.35
    r4 = p4.add_run("Finally, I express my heartfelt gratitude to my family for their unconditional love, moral backing, and continuous sacrifices, and to my friends and peers whose intellectual discussions, collaborative brainstorming, and constructive feedback helped bring this project report to fruitful completion.")
    r4.font.name = 'Times New Roman'
    r4.font.size = Pt(11.5)
    
    table = doc.add_table(rows=2, cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    table.cell(0, 0).width = Cm(7.0)
    table.cell(0, 1).width = Cm(7.65)
    table.cell(1, 0).width = Cm(7.0)
    table.cell(1, 1).width = Cm(7.65)
    
    p_pl = table.cell(0, 0).paragraphs[0]
    p_pl.add_run("Place: Chennai").font.name = 'Times New Roman'
    p_nm = table.cell(0, 1).paragraphs[0]
    p_nm.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p_nm.add_run("Sahal Mansiya").font.name = 'Times New Roman'
    
    p_dt = table.cell(1, 0).paragraphs[0]
    p_dt.add_run("Date: November, 2024").font.name = 'Times New Roman'
    p_rg = table.cell(1, 1).paragraphs[0]
    p_rg.alignment = WD_ALIGN_PARAGRAPH.RIGHT
    p_rg.add_run("Reg. No.: 21BCE1042").font.name = 'Times New Roman'
    
    doc.add_page_break()

def add_table_of_contents(doc, toc_entries):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(18)
    p.paragraph_format.space_after = Pt(14)
    r = p.add_run("TABLE OF CONTENTS")
    r.font.name = 'Times New Roman'
    r.font.size = Pt(14)
    r.font.bold = True
    r.font.underline = True
    
    table = doc.add_table(rows=1, cols=3)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    table.cell(0, 0).width = Cm(2.2)
    table.cell(0, 1).width = Cm(10.8)
    table.cell(0, 2).width = Cm(1.65)
    
    hdr = table.rows[0].cells
    hdr[0].paragraphs[0].add_run("Item").font.bold = True
    hdr[1].paragraphs[0].add_run("Title").font.bold = True
    hdr[2].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.RIGHT
    hdr[2].paragraphs[0].add_run("Page").font.bold = True
    
    for item_num, title, page_str in toc_entries:
        row = table.add_row()
        c0, c1, c2 = row.cells
        c0.width = Cm(2.2)
        c1.width = Cm(10.8)
        c2.width = Cm(1.65)
        
        p0 = c0.paragraphs[0]
        p0.paragraph_format.space_before = Pt(1.5)
        p0.paragraph_format.space_after = Pt(1.5)
        p0.paragraph_format.line_spacing = 1.0
        r0 = p0.add_run(item_num)
        r0.font.name = 'Times New Roman'
        r0.font.size = Pt(10)
        if item_num.startswith("CHAPTER") or not item_num:
            r0.font.bold = True
            
        p1 = c1.paragraphs[0]
        p1.paragraph_format.space_before = Pt(1.5)
        p1.paragraph_format.space_after = Pt(1.5)
        p1.paragraph_format.line_spacing = 1.0
        r1 = p1.add_run(title)
        r1.font.name = 'Times New Roman'
        r1.font.size = Pt(10)
        if item_num.startswith("CHAPTER") or "APPENDIX" in item_num or "REFERENCES" in title or "CONCLUSION" in title:
            r1.font.bold = True
            
        p2 = c2.paragraphs[0]
        p2.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        p2.paragraph_format.space_before = Pt(1.5)
        p2.paragraph_format.space_after = Pt(1.5)
        p2.paragraph_format.line_spacing = 1.0
        r2 = p2.add_run(str(page_str))
        r2.font.name = 'Times New Roman'
        r2.font.size = Pt(10)
        if item_num.startswith("CHAPTER") or "APPENDIX" in item_num or "REFERENCES" in title or "CONCLUSION" in title:
            r2.font.bold = True
            
    doc.add_page_break()

def add_list_of_tables(doc, lot_entries):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(18)
    p.paragraph_format.space_after = Pt(14)
    r = p.add_run("LIST OF TABLES")
    r.font.name = 'Times New Roman'
    r.font.size = Pt(14)
    r.font.bold = True
    r.font.underline = True
    
    table = doc.add_table(rows=1, cols=3)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    table.cell(0, 0).width = Cm(2.4)
    table.cell(0, 1).width = Cm(10.6)
    table.cell(0, 2).width = Cm(1.65)
    
    hdr = table.rows[0].cells
    hdr[0].paragraphs[0].add_run("Table No.").font.bold = True
    hdr[1].paragraphs[0].add_run("Title").font.bold = True
    hdr[2].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.RIGHT
    hdr[2].paragraphs[0].add_run("Page").font.bold = True
    
    for t_num, title, p_num in lot_entries:
        row = table.add_row()
        c0, c1, c2 = row.cells
        c0.width = Cm(2.4)
        c1.width = Cm(10.6)
        c2.width = Cm(1.65)
        
        p0 = c0.paragraphs[0]
        p0.paragraph_format.space_before = Pt(1.5)
        p0.paragraph_format.space_after = Pt(1.5)
        p0.paragraph_format.line_spacing = 1.15
        r0 = p0.add_run(t_num)
        r0.font.name = 'Times New Roman'
        r0.font.size = Pt(10)
        
        p1 = c1.paragraphs[0]
        p1.paragraph_format.space_before = Pt(1.5)
        p1.paragraph_format.space_after = Pt(1.5)
        p1.paragraph_format.line_spacing = 1.15
        r1 = p1.add_run(title)
        r1.font.name = 'Times New Roman'
        r1.font.size = Pt(10)
        
        p2 = c2.paragraphs[0]
        p2.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        p2.paragraph_format.space_before = Pt(1.5)
        p2.paragraph_format.space_after = Pt(1.5)
        p2.paragraph_format.line_spacing = 1.15
        r2 = p2.add_run(str(p_num))
        r2.font.name = 'Times New Roman'
        r2.font.size = Pt(10)
        
    doc.add_page_break()

def add_list_of_figures(doc, lof_entries):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(18)
    p.paragraph_format.space_after = Pt(14)
    r = p.add_run("LIST OF FIGURES")
    r.font.name = 'Times New Roman'
    r.font.size = Pt(14)
    r.font.bold = True
    r.font.underline = True
    
    table = doc.add_table(rows=1, cols=3)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    table.cell(0, 0).width = Cm(2.4)
    table.cell(0, 1).width = Cm(10.6)
    table.cell(0, 2).width = Cm(1.65)
    
    hdr = table.rows[0].cells
    hdr[0].paragraphs[0].add_run("Figure No.").font.bold = True
    hdr[1].paragraphs[0].add_run("Title").font.bold = True
    hdr[2].paragraphs[0].alignment = WD_ALIGN_PARAGRAPH.RIGHT
    hdr[2].paragraphs[0].add_run("Page").font.bold = True
    
    for f_num, title, p_num in lof_entries:
        row = table.add_row()
        c0, c1, c2 = row.cells
        c0.width = Cm(2.4)
        c1.width = Cm(10.6)
        c2.width = Cm(1.65)
        
        p0 = c0.paragraphs[0]
        p0.paragraph_format.space_before = Pt(1.5)
        p0.paragraph_format.space_after = Pt(1.5)
        p0.paragraph_format.line_spacing = 1.15
        r0 = p0.add_run(f_num)
        r0.font.name = 'Times New Roman'
        r0.font.size = Pt(10)
        
        p1 = c1.paragraphs[0]
        p1.paragraph_format.space_before = Pt(1.5)
        p1.paragraph_format.space_after = Pt(1.5)
        p1.paragraph_format.line_spacing = 1.15
        r1 = p1.add_run(title)
        r1.font.name = 'Times New Roman'
        r1.font.size = Pt(10)
        
        p2 = c2.paragraphs[0]
        p2.alignment = WD_ALIGN_PARAGRAPH.RIGHT
        p2.paragraph_format.space_before = Pt(1.5)
        p2.paragraph_format.space_after = Pt(1.5)
        p2.paragraph_format.line_spacing = 1.15
        r2 = p2.add_run(str(p_num))
        r2.font.name = 'Times New Roman'
        r2.font.size = Pt(10)
        
    doc.add_page_break()

def add_list_of_abbreviations(doc):
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(18)
    p.paragraph_format.space_after = Pt(14)
    r = p.add_run("LIST OF ABBREVIATIONS")
    r.font.name = 'Times New Roman'
    r.font.size = Pt(14)
    r.font.bold = True
    r.font.underline = True
    
    abbrevs = [
        ("API", "Application Programming Interface"),
        ("AST", "Abstract Syntax Tree"),
        ("Bcrypt", "Blowfish Password Hashing Algorithm"),
        ("B.Tech", "Bachelor of Technology"),
        ("cgroups", "Linux Control Groups"),
        ("CLI", "Command Line Interface"),
        ("CPU", "Central Processing Unit"),
        ("CSCL", "Computer-Supported Collaborative Learning"),
        ("CSP", "Content Security Policy"),
        ("CTF", "Capture The Flag"),
        ("DBD", "Database Design Document"),
        ("DDL", "Data Definition Language"),
        ("DI", "Dependency Injection"),
        ("DNS", "Domain Name System"),
        ("DOM", "Document Object Model"),
        ("E2E", "End-to-End"),
        ("FPS", "Frames Per Second"),
        ("GDD", "Game Design Document"),
        ("GLTF", "GL Transmission Format"),
        ("HOD", "Head of the Department"),
        ("HTTP", "Hypertext Transfer Protocol"),
        ("HTTPS", "Hypertext Transfer Protocol Secure"),
        ("IDE", "Integrated Development Environment"),
        ("IP", "Internet Protocol"),
        ("IPC", "Inter-Process Communication"),
        ("JSON", "JavaScript Object Notation"),
        ("JSONB", "Binary JavaScript Object Notation"),
        ("JWT", "JSON Web Token"),
        ("LCP", "Largest Contentful Paint"),
        ("MMORPG", "Massively Multiplayer Online Role-Playing Game"),
        ("MVP", "Minimum Viable Product"),
        ("NFR", "Non-Functional Requirement"),
        ("ORM", "Object-Relational Mapping"),
        ("OS", "Operating System"),
        ("OOM", "Out of Memory"),
        ("PK", "Primary Key"),
        ("PRD", "Product Requirements Document"),
        ("QA", "Quality Assurance"),
        ("RAM", "Random Access Memory"),
        ("RBAC", "Role-Based Access Control"),
        ("REST", "Representational State Transfer"),
        ("RTT", "Round-Trip Time"),
        ("SAD", "System Architecture Document"),
        ("SDK", "Software Development Kit"),
        ("SOC", "Security Operations Center"),
        ("SPA", "Single Page Application"),
        ("SQL", "Structured Query Language"),
        ("SSH", "Secure Shell"),
        ("SSL", "Secure Sockets Layer"),
        ("TCP", "Transmission Control Protocol"),
        ("TDD", "Technical Design Document"),
        ("TLS", "Transport Layer Security"),
        ("ToC", "Table of Contents"),
        ("TP", "Test Plan"),
        ("TSSD", "Technology Selection & Spike Document"),
        ("UI", "User Interface"),
        ("UUID", "Universally Unique Identifier"),
        ("UX", "User Experience"),
        ("VLE", "Virtual Learning Environment"),
        ("VM", "Virtual Machine"),
        ("VPS", "Virtual Private Server"),
        ("VR", "Virtual Reality"),
        ("WCAG", "Web Content Accessibility Guidelines"),
        ("WebGL", "Web Graphics Library"),
        ("WS", "WebSocket"),
        ("XSS", "Cross-Site Scripting")
    ]
    
    table = doc.add_table(rows=1, cols=2)
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    table.autofit = False
    table.cell(0, 0).width = Cm(3.2)
    table.cell(0, 1).width = Cm(11.45)
    
    hdr = table.rows[0].cells
    hdr[0].paragraphs[0].add_run("Abbreviation").font.bold = True
    hdr[1].paragraphs[0].add_run("Expansion / Definition").font.bold = True
    
    for abbr, desc in abbrevs:
        row = table.add_row()
        c0, c1 = row.cells
        c0.width = Cm(3.2)
        c1.width = Cm(11.45)
        
        p0 = c0.paragraphs[0]
        p0.paragraph_format.space_before = Pt(1.0)
        p0.paragraph_format.space_after = Pt(1.0)
        p0.paragraph_format.line_spacing = 1.15
        r0 = p0.add_run(abbr)
        r0.font.name = 'Times New Roman'
        r0.font.size = Pt(9.5)
        r0.font.bold = True
        
        p1 = c1.paragraphs[0]
        p1.paragraph_format.space_before = Pt(1.0)
        p1.paragraph_format.space_after = Pt(1.0)
        p1.paragraph_format.line_spacing = 1.15
        r1 = p1.add_run(desc)
        r1.font.name = 'Times New Roman'
        r1.font.size = Pt(9.5)
        
    doc.add_page_break()
