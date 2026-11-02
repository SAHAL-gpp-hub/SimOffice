import os
import sys
import docx
from docx.shared import Pt, Cm, Inches

from report_generator.helpers import create_document
from report_generator.preliminary import (
    add_cover_page, add_title_page, add_declaration, add_certificate,
    add_abstract, add_acknowledgement, add_table_of_contents,
    add_list_of_tables, add_list_of_figures, add_list_of_abbreviations
)
from report_generator.chapter1 import build_chapter1
from report_generator.chapter2 import build_chapter2
from report_generator.chapter3 import build_chapter3
from report_generator.chapter4 import build_chapter4
from report_generator.chapter5 import build_chapter5
from report_generator.chapter6 import build_chapter6
from report_generator.conclusion_refs_appendices import (
    build_conclusion, build_references, build_appendix1, build_appendix2
)

def generate_report(toc_entries=None, lot_entries=None, lof_entries=None):
    doc = create_document()
    
    # Default placeholder TOC entries if none provided
    if not toc_entries:
        toc_entries = [
            ("", "DECLARATION", "iii"),
            ("", "CERTIFICATE", "iv"),
            ("", "ABSTRACT", "v"),
            ("", "ACKNOWLEDGEMENT", "vi"),
            ("", "TABLE OF CONTENTS", "vii"),
            ("", "LIST OF TABLES", "x"),
            ("", "LIST OF FIGURES", "xii"),
            ("", "LIST OF ABBREVIATIONS", "xiii"),
            ("CHAPTER 1", "INTRODUCTION", "15"),
            ("1.1", "OVERVIEW", "15"),
            ("1.2", "PROBLEM STATEMENT", "16"),
            ("1.3", "PRODUCT VISION", "17"),
            ("1.4", "OBJECTIVES OF THE PROJECT", "18"),
            ("1.5", "SCOPE OF THE PROJECT", "19"),
            ("1.6", "REPORT ORGANIZATION", "21"),
            ("CHAPTER 2", "LITERATURE REVIEW", "23"),
            ("2.1", "GAMIFICATION AND SERIOUS GAMES IN COMPUTING", "23"),
            ("2.2", "COMPUTER-SUPPORTED COLLABORATIVE LEARNING", "24"),
            ("2.3", "CYBERSECURITY EDUCATION AND CTF FRAMEWORKS", "25"),
            ("2.4", "3D VIRTUAL LEARNING ENVIRONMENTS", "27"),
            ("2.5", "MULTIPLAYER GAME TECHNOLOGIES AND BROWSER ARCHITECTURES", "28"),
            ("2.6", "COMPARATIVE ANALYSIS OF EXISTING PLATFORMS", "29"),
            ("2.7", "IDENTIFIED RESEARCH GAPS AND NOVEL CONTRIBUTIONS", "30"),
            ("CHAPTER 3", "SYSTEM REQUIREMENTS", "32"),
            ("3.1", "FUNCTIONAL REQUIREMENTS", "32"),
            ("3.2", "NON-FUNCTIONAL REQUIREMENTS", "34"),
            ("3.3", "USER PERSONAS AND BEHAVIORAL ARCHETYPES", "35"),
            ("3.4", "SYSTEM USE CASES AND ACTOR INTERACTIONS", "37"),
            ("3.5", "PHASE 0 SCOPE BOUNDARIES AND SYSTEM EXCLUSIONS", "39"),
            ("CHAPTER 4", "SYSTEM DESIGN AND ARCHITECTURE", "41"),
            ("4.1", "SYSTEM OVERVIEW AND DESIGN PHILOSOPHY", "41"),
            ("4.2", "HIGH-LEVEL ARCHITECTURE (THE 5-SERVICE TOPOLOGY)", "41"),
            ("4.3", "COMPONENT RESPONSIBILITY MATRIX", "43"),
            ("4.4", "DATA ARCHITECTURE AND RELATIONAL MODELING", "44"),
            ("4.5", "TRUST ZONE AND SANDBOX ARCHITECTURE", "46"),
            ("4.6", "REAL-TIME MULTIPLAYER ARCHITECTURE", "47"),
            ("4.7", "SESSION LIFECYCLE STATE MACHINE", "48"),
            ("4.8", "SECURITY ARCHITECTURE AND THREAT MODELING", "49"),
            ("4.9", "RESTFUL AND REAL-TIME API ARCHITECTURE", "50"),
            ("4.10", "DEPLOYMENT ARCHITECTURE AND PHYSICAL TOPOLOGY", "50"),
            ("CHAPTER 5", "IMPLEMENTATION", "51"),
            ("5.1", "DEVELOPMENT ENVIRONMENT AND TOOLS", "51"),
            ("5.2", "BACKEND IMPLEMENTATION", "52"),
            ("5.3", "DATABASE IMPLEMENTATION AND VIEWS", "56"),
            ("5.4", "SANDBOX ORCHESTRATOR MICROSERVICE", "56"),
            ("5.5", "CONTENT ENGINEERING: THE OMNICART SCENARIO", "57"),
            ("5.6", "3D VIRTUAL OFFICE CLIENT IMPLEMENTATION", "58"),
            ("5.7", "DOCKER COMPOSE DEPLOYMENT CONFIGURATION", "59"),
            ("5.8", "KEY IMPLEMENTATION DECISIONS AND DESIGN RATIONALE", "59"),
            ("CHAPTER 6", "TESTING AND RESULTS", "61"),
            ("6.1", "TESTING STRATEGY OVERVIEW", "61"),
            ("6.2", "UNIT TESTING (JEST TEST SUITE EVALUATION)", "61"),
            ("6.3", "INTEGRATION AND SPIKE VALIDATION", "64"),
            ("6.4", "END-TO-END (E2E) TEST SPECIFICATIONS", "65"),
            ("6.5", "SECURITY AND PENETRATION TESTING", "65"),
            ("6.6", "PHASE 0 EXIT CRITERIA ASSESSMENT", "65"),
            ("6.7", "KNOWN DEFECTS AND TECHNICAL LIMITATIONS", "66"),
            ("", "CONCLUSION AND FUTURE WORK", "68"),
            ("7.1", "SUMMARY OF ACCOMPLISHMENTS", "68"),
            ("7.2", "SUMMARY OF TECHNICAL CONTRIBUTIONS", "68"),
            ("7.3", "CRITICAL REFLECTION ON SYSTEM DESIGN", "69"),
            ("7.4", "PHASE 1 ROADMAP", "69"),
            ("7.5", "PHASE 2 ROADMAP", "70"),
            ("7.6", "PHASE 3 ROADMAP", "71"),
            ("", "REFERENCES", "72"),
            ("APPENDIX 1", "DATABASE SCHEMA SPECIFICATION", "75"),
            ("APPENDIX 2", "API ENDPOINT SUMMARY", "84")
        ]
        
    if not lot_entries:
        lot_entries = [
            ("1.1", "SimOffice Phase 0 Pilot Scope vs. Future Roadmap", "20"),
            ("2.1", "Comparative Evaluation of SimOffice Against Existing Platforms", "29"),
            ("3.1", "SimOffice Functional Requirements Matrix", "32"),
            ("3.2", "SimOffice Non-Functional Requirements Matrix", "34"),
            ("3.3", "Phase 0 Pilot Inclusion and Exclusion Boundary Matrix", "39"),
            ("4.1", "SimOffice Component Responsibility and Boundary Matrix", "43"),
            ("4.2", "Session Lifecycle State Machine Transition Specifications", "48"),
            ("6.1", "Jest Automated Unit Test Suite Results Summary", "61"),
            ("6.2", "Phase 0 Pilot Exit Criteria Evaluation Status", "66"),
            ("A1.1", "accounts Table Specification", "75"),
            ("A1.2", "classes Table Specification", "75"),
            ("A1.3", "roster_entries Table Specification", "76"),
            ("A1.4", "sessions Table Specification", "76"),
            ("A1.5", "departments Table Specification", "77"),
            ("A1.6", "teams Table Specification", "78"),
            ("A1.7", "team_memberships Table Specification", "78"),
            ("A1.8", "environment_instances Table Specification", "79"),
            ("A1.9", "verification_checks Table Specification", "79"),
            ("A1.10", "verification_runs Table Specification", "80"),
            ("A1.11", "contribution_events Table Specification", "80"),
            ("A1.12", "scenarios Table Specification", "81"),
            ("A1.13", "scenario_variants Table Specification", "82"),
            ("A1.14", "scenario_usage_log Table Specification", "82"),
            ("A2.1", "SimOffice RESTful API Endpoint Specifications", "84")
        ]
        
    if not lof_entries:
        lof_entries = [
            ("1.1", "Conceptual Overview of the SimOffice Simulation Paradigm", "16"),
            ("1.2", "SimOffice Incident Triage Lifecycle Workflow", "19"),
            ("2.1", "Evolution of Computing Educational Environments", "28"),
            ("4.1", "Five-Service Containerized Deployment Topology and Network Architecture", "42"),
            ("4.2", "Entity-Relationship Diagram of SimOffice Core Schema", "44"),
            ("4.3", "Dual Trust Zone Partitioning and gVisor Syscall Interception Architecture", "46"),
            ("4.4", "SimOffice Session Lifecycle State Machine Transition Flow", "48"),
            ("5.1", "Automated Verification Pipeline and Row-Locking Sequence", "54"),
            ("5.2", "The OmniCart Scenario Architecture and Injected Flaw Point", "57")
        ]

    # 1. Cover Page
    add_cover_page(doc)
    # 2. Title Page
    add_title_page(doc)
    # 3. Declaration
    add_declaration(doc)
    # 4. Certificate
    add_certificate(doc)
    # 5. Abstract
    add_abstract(doc)
    # 6. Acknowledgement
    add_acknowledgement(doc)
    # 7. Table of Contents
    add_table_of_contents(doc, toc_entries)
    # 8. List of Tables
    add_list_of_tables(doc, lot_entries)
    # 9. List of Figures
    add_list_of_figures(doc, lof_entries)
    # 10. List of Abbreviations
    add_list_of_abbreviations(doc)
    
    # 11. Chapters
    build_chapter1(doc)
    build_chapter2(doc)
    build_chapter3(doc)
    build_chapter4(doc)
    build_chapter5(doc)
    build_chapter6(doc)
    
    # 12. Conclusion & References & Appendices
    build_conclusion(doc)
    build_references(doc)
    build_appendix1(doc)
    build_appendix2(doc)
    
    output_docx = "/Users/mohammad/Documents/simoffice/SimOffice_Project_Report.docx"
    doc.save(output_docx)
    print(f"Successfully generated DOCX report at: {output_docx}")
    return output_docx

if __name__ == "__main__":
    generate_report()
