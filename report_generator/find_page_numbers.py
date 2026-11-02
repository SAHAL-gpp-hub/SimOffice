import pypdf
import re

reader = pypdf.PdfReader("/Users/mohammad/Documents/simoffice/SimOffice_Project_Report.pdf")
print("Total pages:", len(reader.pages))

# Print first 15 pages first line or text summary to see the structure of preliminary pages
print("--- Preliminary Pages Analysis ---")
for i in range(min(15, len(reader.pages))):
    text = reader.pages[i].extract_text() or ""
    first_lines = [l.strip() for l in text.split("\n") if l.strip()][:3]
    print(f"Page {i+1}: {first_lines}")

print("\n--- Finding Main Sections ---")
# To find where chapters start, look for "CHAPTER 1", "CHAPTER 2", etc. as standalone headings
# and ensure it is not in the Table of Contents (TOC is usually pages 6-8)
for i, page in enumerate(reader.pages):
    text = page.extract_text() or ""
    page_num = i + 1
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    for line in lines:
        if re.match(r"^CHAPTER\s+[1-6]\b", line):
            print(f"{line} -> Page {page_num}")
        elif re.match(r"^(CONCLUSION AND FUTURE WORK|REFERENCES|APPENDIX 1|APPENDIX 2)\b", line):
            print(f"{line} -> Page {page_num}")

print("\n--- Finding Headings (Sections) ---")
# Search for specific section headings after page 10
section_patterns = [
    r"^1\.[1-6]\s+",
    r"^2\.[1-7]\s+",
    r"^3\.[1-5]\s+",
    r"^4\.[1-6]\s+",
    r"^5\.[1-6]\s+",
    r"^6\.[1-7]\s+"
]
for i in range(8, len(reader.pages)):
    page_num = i + 1
    text = reader.pages[i].extract_text() or ""
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    for line in lines:
        for pat in section_patterns:
            if re.match(pat, line):
                print(f"{line} -> Page {page_num}")

print("\n--- Finding Tables & Figures ---")
for i in range(8, len(reader.pages)):
    page_num = i + 1
    text = reader.pages[i].extract_text() or ""
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    for line in lines:
        if re.match(r"^Table\s+(\d+\.\d+|A1\.\d+|A2\.\d+)\b", line):
            print(f"{line[:40]}... -> Page {page_num}")
        elif re.match(r"^Figure\s+\d+\.\d+\b", line):
            print(f"{line[:40]}... -> Page {page_num}")
