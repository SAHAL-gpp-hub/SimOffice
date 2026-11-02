import pypdf
import re

reader = pypdf.PdfReader("/Users/mohammad/Documents/simoffice/SimOffice_Project_Report.pdf")

# We want exact page numbers for:
# Preliminary:
# DECLARATION
# CERTIFICATE
# ABSTRACT
# ACKNOWLEDGEMENT
# TABLE OF CONTENTS
# LIST OF TABLES
# LIST OF FIGURES
# LIST OF ABBREVIATIONS

# Chapters:
# CHAPTER 1 - INTRODUCTION
# 1.1 BACKGROUND AND MOTIVATION
# 1.2 PROBLEM STATEMENT
# 1.3 PRODUCT VISION AND CORE VALUE PROPOSITION
# 1.4 PROJECT OBJECTIVES
# 1.5 SCOPE AND BOUNDARIES
# 1.6 PROJECT ORGANIZATION

# CHAPTER 2 - LITERATURE REVIEW
# 2.1 SERIOUS GAMES IN CYBERSECURITY AND CS EDUCATION
# 2.2 COMPUTER-SUPPORTED COLLABORATIVE LEARNING (CSCL) AND PAIR DEBUGGING
# 2.3 CYBERSECURITY CAPTURE THE FLAG (CTF) PLATFORMS
# 2.4 THREE-DIMENSIONAL VIRTUAL LEARNING ENVIRONMENTS (VLES)
# 2.5 MODERN MULTIPLAYER NETWORKING ENGINES
# 2.6 SUMMARY OF EXTANT PLATFORMS AND BENCHMARKING
# 2.7 IDENTIFIED RESEARCH GAPS AND SIMOFFICE DIFFERENTIATORS

# CHAPTER 3 - SYSTEM REQUIREMENTS SPECIFICATIONS
# 3.1 TARGET USER PERSONAS AND STAKEHOLDER PROFILES
# 3.2 CORE USE CASES AND INTERACTION WORKFLOWS
# 3.3 FUNCTIONAL REQUIREMENTS SPECIFICATION
# 3.4 NON-FUNCTIONAL REQUIREMENTS SPECIFICATION
# 3.5 SCOPE AND SYSTEM BOUNDARIES

# CHAPTER 4 - SYSTEM DESIGN AND ARCHITECTURE
# 4.1 HIGH-LEVEL SYSTEM ARCHITECTURE
# 4.2 MICROSERVICES TOPOLOGY AND CONTAINER INFRASTRUCTURE
# 4.3 MULTIPLAYER STATE SYNCHRONIZATION WITH COLYSEUS
# 4.4 DATA ARCHITECTURE AND RELATIONAL MODELING
# 4.5 SANDBOX ISOLATION AND EXECUTION RUNTIME (GVISOR)
# 4.6 SCENARIO LIFECYCLE AND VERIFICATION STATE MACHINE
# 4.7 COMMUNICATION PROTOCOLS AND SECURITY ARCHITECTURE

# CHAPTER 5 - IMPLEMENTATION DETAILS
# 5.1 TECHNOLOGY SELECTION MATRIX
# 5.2 BACKEND MICROSERVICES ARCHITECTURE
# 5.3 SANDBOX ORCHESTRATOR AND MICROVM INFRASTRUCTURE
# 5.4 OMNICART REFERENCE INCIDENT SCENARIO
# 5.5 THREE-DIMENSIONAL WEB CLIENT WITH BABYLON.JS
# 5.6 CONTAINERIZATION AND INFRASTRUCTURE ORCHESTRATION

# CHAPTER 6 - TESTING, RESULTS, AND EVALUATION
# 6.1 TEST STRATEGY AND METHODOLOGY
# 6.2 UNIT AND INTEGRATION TEST SUITE RESULTS
# 6.3 INTEGRATION AND SPIKE VALIDATION
# 6.4 COMPREHENSIVE END-TO-END VALIDATION
# 6.5 SECURITY EVALUATION AND ATTACK SURFACE ANALYSIS
# 6.6 PHASE 0 EXIT CRITERIA VALIDATION AND DEFECT LOG

# CONCLUSION AND FUTURE WORK
# REFERENCES
# APPENDIX 1 - DATABASE SCHEMA SPECIFICATION
# APPENDIX 2 - API ENDPOINT SPECIFICATION

# Also:
# Tables:
# Table 1.1: SimOffice System Scope Matrix
# Table 2.1: Comparative Feature Matrix of Technical Training Platforms
# Table 3.1: Complete Functional Requirements Specification (FR-01 - FR-18)
# Table 3.2: Non-Functional Requirements Specification (NFR-01 - NFR-14)
# Table 3.3: Project Scope and Feature Inclusions/Exclusions
# Table 4.1: Microservices Subsystem Responsibility Matrix
# Table 4.2: Scenario Lifecycle State Machine Transitions
# Table 6.1: Unit and Integration Test Suite Execution Results
# Table 6.2: Phase 0 Verification and Validation Exit Criteria Matrix
# Table A1.1 to Table A1.14
# Table A2.1

# Figures:
# Figure 1.1: SimOffice High-Level System Architecture and Component Interactions.
# Figure 1.2: End-to-End Incident Triage and Debugging Workflow.
# Figure 2.1: Conceptual Positioning of SimOffice Across Pedagogical and Immersion Dimensions.
# Figure 4.1: SimOffice Five-Service Docker Architecture.
# Figure 4.2: Entity-Relationship Diagram of SimOffice Core Schema.
# Figure 4.3: Three-Tier Security Isolation Architecture with gVisor MicroVMs.
# Figure 4.4: Scenario Execution and Verification State Machine Diagram.
# Figure 5.1: Automated Verification Pipeline Architecture.
# Figure 5.2: OmniCart Distributed Scenario Topology.

print("Starting scan...")
page_records = {}

for p_idx, page in enumerate(reader.pages):
    page_num = p_idx + 1
    text = page.extract_text() or ""
    # Normalize spaces
    norm_text = " ".join(text.split())
    page_records[page_num] = (text, norm_text)

# Let us search for each item specifically
targets = [
    # Preliminaries
    ("Declaration", "DECLARATION"),
    ("Certificate", "CERTIFICATE"),
    ("Abstract", "ABSTRACT"),
    ("Acknowledgement", "ACKNOWLEDGEMENT"),
    ("Table of Contents", "TABLE OF CONTENTS"),
    ("List of Tables", "LIST OF TABLES"),
    ("List of Figures", "LIST OF FIGURES"),
    ("List of Abbreviations", "LIST OF ABBREVIATIONS"),
    # Chapters
    ("CHAPTER 1", "CHAPTER 1"),
    ("1.1", "1.1 BACKGROUND"),
    ("1.2", "1.2 PROBLEM STATEMENT"),
    ("1.3", "1.3 PRODUCT VISION"),
    ("1.4", "1.4 PROJECT OBJECTIVES"),
    ("1.5", "1.5 SCOPE"),
    ("1.6", "1.6 PROJECT ORGANIZATION"),
    
    ("CHAPTER 2", "CHAPTER 2"),
    ("2.1", "2.1 SERIOUS GAMES"),
    ("2.2", "2.2 COMPUTER-SUPPORTED COLLABORATIVE"),
    ("2.3", "2.3 CYBERSECURITY CAPTURE"),
    ("2.4", "2.4 THREE-DIMENSIONAL VIRTUAL"),
    ("2.5", "2.5 MODERN MULTIPLAYER NETWORKING"),
    ("2.6", "2.6 SUMMARY OF EXTANT"),
    ("2.7", "2.7 IDENTIFIED RESEARCH GAPS"),
    
    ("CHAPTER 3", "CHAPTER 3"),
    ("3.1", "3.1 TARGET USER PERSONAS"),
    ("3.2", "3.2 CORE USE CASES"),
    ("3.3", "3.3 FUNCTIONAL REQUIREMENTS"),
    ("3.4", "3.4 NON-FUNCTIONAL REQUIREMENTS"),
    ("3.5", "3.5 SCOPE AND SYSTEM BOUNDARIES"),
    
    ("CHAPTER 4", "CHAPTER 4"),
    ("4.1", "4.1 HIGH-LEVEL SYSTEM ARCHITECTURE"),
    ("4.2", "4.2 MICROSERVICES TOPOLOGY"),
    ("4.3", "4.3 MULTIPLAYER STATE SYNCHRONIZATION"),
    ("4.4", "4.4 DATA ARCHITECTURE"),
    ("4.5", "4.5 SANDBOX ISOLATION"),
    ("4.6", "4.6 SCENARIO LIFECYCLE"),
    ("4.7", "4.7 COMMUNICATION PROTOCOLS"),
    
    ("CHAPTER 5", "CHAPTER 5"),
    ("5.1", "5.1 TECHNOLOGY SELECTION"),
    ("5.2", "5.2 BACKEND MICROSERVICES"),
    ("5.3", "5.3 SANDBOX ORCHESTRATOR"),
    ("5.4", "5.4 OMNICART REFERENCE"),
    ("5.5", "5.5 THREE-DIMENSIONAL WEB CLIENT"),
    ("5.6", "5.6 CONTAINERIZATION AND INFRASTRUCTURE"),
    
    ("CHAPTER 6", "CHAPTER 6"),
    ("6.1", "6.1 TEST STRATEGY"),
    ("6.2", "6.2 UNIT AND INTEGRATION TEST"),
    ("6.3", "6.3 INTEGRATION AND SPIKE VALIDATION"),
    ("6.4", "6.4 COMPREHENSIVE END-TO-END VALIDATION"),
    ("6.5", "6.5 SECURITY EVALUATION"),
    ("6.6", "6.6 PHASE 0 EXIT CRITERIA"),
    
    ("Conclusion", "CONCLUSION AND FUTURE WORK"),
    ("References", "REFERENCES"),
    ("Appendix 1", "APPENDIX 1"),
    ("Appendix 2", "APPENDIX 2"),
    
    # Tables
    ("Table 1.1", "Table 1.1"),
    ("Table 2.1", "Table 2.1"),
    ("Table 3.1", "Table 3.1"),
    ("Table 3.2", "Table 3.2"),
    ("Table 3.3", "Table 3.3"),
    ("Table 4.1", "Table 4.1"),
    ("Table 4.2", "Table 4.2"),
    ("Table 6.1", "Table 6.1"),
    ("Table 6.2", "Table 6.2"),
    
    ("Table A1.1", "Table A1.1"),
    ("Table A1.2", "Table A1.2"),
    ("Table A1.3", "Table A1.3"),
    ("Table A1.4", "Table A1.4"),
    ("Table A1.5", "Table A1.5"),
    ("Table A1.6", "Table A1.6"),
    ("Table A1.7", "Table A1.7"),
    ("Table A1.8", "Table A1.8"),
    ("Table A1.9", "Table A1.9"),
    ("Table A1.10", "Table A1.10"),
    ("Table A1.11", "Table A1.11"),
    ("Table A1.12", "Table A1.12"),
    ("Table A1.13", "Table A1.13"),
    ("Table A1.14", "Table A1.14"),
    ("Table A2.1", "Table A2.1"),
    
    # Figures
    ("Figure 1.1", "Figure 1.1"),
    ("Figure 1.2", "Figure 1.2"),
    ("Figure 2.1", "Figure 2.1"),
    ("Figure 4.1", "Figure 4.1"),
    ("Figure 4.2", "Figure 4.2"),
    ("Figure 4.3", "Figure 4.3"),
    ("Figure 4.4", "Figure 4.4"),
    ("Figure 5.1", "Figure 5.1"),
    ("Figure 5.2", "Figure 5.2"),
]

# For each target, find the page where it occurs OUTSIDE the TOC/LOT/LOF pages (pages 6-8)
# If target is preliminary, search pages 1-8.
for key, term in targets:
    is_prelim = key in ["Declaration", "Certificate", "Abstract", "Acknowledgement", "Table of Contents", "List of Tables", "List of Figures", "List of Abbreviations"]
    found_page = None
    for p_num in range(1, len(reader.pages) + 1):
        if not is_prelim and p_num <= 8:
            continue
        raw, norm = page_records[p_num]
        if term.upper() in norm.upper():
            # For section headings, make sure it's not just a cross reference like "see section 1.1"
            # It should appear at the start of a line or after a heading
            found_page = p_num
            break
    print(f"'{key}': {found_page},")
