Drop your book files here, organized into subfolders by scholar/collection:

books/
  sistani/          <- Sayyid Sistani's books (PDF, DOCX, or TXT)
  khamenei/         <- Khamenei's books
  khomeini/         <- Khomeini's books
  sihah_sitta/      <- The six Sunni hadith collections (Bukhari, Muslim, etc.)

You can rename these folders or add new ones — just add a matching entry in
config.py's SCHOLAR_DISPLAY_NAMES if you want a nicer display name. Any folder
name works even without an entry there; it will just show the raw folder name.

Supported file types: .pdf, .docx, .doc, .txt
Scanned/image PDFs are handled automatically via OCR (Urdu language pack).
