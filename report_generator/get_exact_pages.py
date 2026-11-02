import pypdf
import re

reader = pypdf.PdfReader("/Users/mohammad/Documents/simoffice/SimOffice_Project_Report.pdf")

# We want exact page numbers for each entry in TOC, LOT, LOF.
# Let's inspect each page from 15 to 86 and extract:
# 1. Chapters and Major headings:
#    CHAPTER 1 -> page
#    CHAPTER 2 -> page
#    CHAPTER 3 -> page
#    CHAPTER 4 -> page
#    CHAPTER 5 -> page
#    CHAPTER 6 -> page
#    CONCLUSION AND FUTURE WORK -> page
#    REFERENCES -> page
#    APPENDIX 1 — DATABASE SCHEMA -> page
#    APPENDIX 2 — API ENDPOINT SUMMARY -> page

# 2. Sections:
# 1.1, 1.2, 1.3, 1.4, 1.5, 1.6
# 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 2.7
# 3.1, 3.2, 3.3, 3.4, 3.5
# 4.1, 4.2, 4.3, 4.4, 4.5, 4.6, 4.7
# 5.1, 5.2, 5.3, 5.4, 5.5, 5.6
# 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7

# 3. Tables:
# Table 1.1, 2.1, 3.1, 3.2, 3.3, 4.1, 4.2, 6.1, 6.2
# Table A1.1 to A1.14
# Table A2.1

# 4. Figures:
# Figure 1.1, 1.2, 2.1, 4.1, 4.2, 4.3, 4.4, 5.1, 5.2

results = {}

for p in range(14, len(reader.pages)):
    page_num = p + 1
    text = reader.pages[p].extract_text() or ""
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    full_page = " ".join(lines)
    
    # Check for Chapters
    for c in range(1, 7):
        key = f"CHAPTER {c}"
        if key not in results:
            if re.search(rf"\bCHAPTER\s+{c}\b", full_page, re.IGNORECASE):
                results[key] = page_num

    # Check for Major Headings
    if "CONCLUSION" not in results and re.search(r"\bCONCLUSION AND FUTURE WORK\b", full_page, re.IGNORECASE):
        results["CONCLUSION"] = page_num
    if "REFERENCES" not in results and re.search(r"\bREFERENCES\b", full_page, re.IGNORECASE):
        # make sure it's the chapter heading, not just in text
        for line in lines:
            if line.strip().upper() == "REFERENCES" or line.strip().upper().startswith("REFERENCES"):
                results["REFERENCES"] = page_num
                break
    if "APPENDIX 1" not in results and re.search(r"\bAPPENDIX 1\b", full_page, re.IGNORECASE):
        results["APPENDIX 1"] = page_num
    if "APPENDIX 2" not in results and re.search(r"\bAPPENDIX 2\b", full_page, re.IGNORECASE):
        results["APPENDIX 2"] = page_num

    # Check for sections
    # e.g. 1.1, 1.2 ... 6.7
    for c in range(1, 7):
        for s in range(1, 10):
            sec_key = f"{c}.{s}"
            if sec_key not in results:
                # check regex at start of line or with space
                for line in lines:
                    if re.match(rf"^{c}\.{s}\s+[A-Z]", line):
                        results[sec_key] = page_num
                        break

    # Check for Tables
    for t_id in ["1.1", "2.1", "3.1", "3.2", "3.3", "4.1", "4.2", "6.1", "6.2", "A2.1"]:
        t_key = f"Table {t_id}"
        if t_key not in results:
            if re.search(rf"\bTable\s+{re.escape(t_id)}\b", full_page):
                results[t_key] = page_num

    for a_id in range(1, 15):
        t_key = f"Table A1.{a_id}"
        if t_key not in results:
            if re.search(rf"\bTable\s+A1\.{a_id}\b", full_page):
                results[t_key] = page_num

    # Check for Figures
    for f_id in ["1.1", "1.2", "2.1", "4.1", "4.2", "4.3", "4.4", "5.1", "5.2"]:
        f_key = f"Figure {f_id}"
        if f_key not in results:
            if re.search(rf"\bFigure\s+{re.escape(f_id)}\b", full_page):
                results[f_key] = page_num

print("RESULTS:")
for k, v in results.items():
    print(f"'{k}': {v},")
