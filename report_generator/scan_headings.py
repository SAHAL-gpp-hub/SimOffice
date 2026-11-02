import pypdf
import re

reader = pypdf.PdfReader("/Users/mohammad/Documents/simoffice/SimOffice_Project_Report.pdf")

print(f"Total pages: {len(reader.pages)}")

# Print out lines that look like headings or titles on each page from page 15 onwards
for p in range(14, len(reader.pages)):
    page_num = p + 1
    text = reader.pages[p].extract_text() or ""
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    for line in lines:
        # Check for Chapter heading
        if re.match(r"^CHAPTER\s+\d+", line, re.IGNORECASE):
            print(f"[P.{page_num}] {line}")
        # Check for Major heading (Conclusion, References, Appendices)
        elif re.match(r"^(CONCLUSION|REFERENCES|APPENDIX\s+\d+)", line, re.IGNORECASE):
            print(f"[P.{page_num}] {line}")
        # Check for numbered sections e.g. 1.1, 1.2, 4.3, etc.
        elif re.match(r"^\d+\.\d+(\.\d+)?\s+[A-Z]", line):
            print(f"[P.{page_num}] {line}")
        # Check for Table or Figure
        elif re.match(r"^(Table|Figure)\s+(\d+\.\d+|A\d+\.\d+)", line):
            print(f"[P.{page_num}] {line[:70]}")
