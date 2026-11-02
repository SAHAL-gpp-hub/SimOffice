import pypdf
import re

reader = pypdf.PdfReader("/Users/mohammad/Documents/simoffice/SimOffice_Project_Report.pdf")

# Let's inspect where "CHAPTER 2" appears as a main heading
# A heading will typically appear at the very top of a page (line 0 or line 1)
# Let's check each page's first 3 lines!

for i, page in enumerate(reader.pages):
    page_num = i + 1
    text = page.extract_text() or ""
    lines = [l.strip() for l in text.split("\n") if l.strip()]
    if not lines:
        continue
    # print if any of the first 3 lines match a chapter or major heading
    header_block = " ".join(lines[:4]).upper()
    for chap in range(1, 7):
        if f"CHAPTER {chap}" in header_block and page_num > 10:
            print(f"Page {page_num}: CHAPTER {chap} -> {lines[0]} | {lines[1] if len(lines)>1 else ''}")
    if "CONCLUSION AND FUTURE WORK" in header_block and page_num > 10:
        print(f"Page {page_num}: CONCLUSION AND FUTURE WORK -> {lines[0]}")
    if "REFERENCES" in header_block and page_num > 10:
        print(f"Page {page_num}: REFERENCES -> {lines[0]}")
    if "APPENDIX 1" in header_block and page_num > 10:
        print(f"Page {page_num}: APPENDIX 1 -> {lines[0]}")
    if "APPENDIX 2" in header_block and page_num > 10:
        print(f"Page {page_num}: APPENDIX 2 -> {lines[0]}")
