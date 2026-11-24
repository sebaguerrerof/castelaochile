"""Read-only QA of the neutral PDF exported by the local application."""
import json
import os
import subprocess
from pathlib import Path
from pypdf import PdfReader
import pdfplumber

root = Path(__file__).resolve().parents[1]
output = root / "tmp/personal-autonomy-qa"
source = output / "autonomia-informe.pdf"
reader = PdfReader(source)
text = "\n".join(page.extract_text() for page in reader.pages)
assert "Autorreporte de autonomía personal" in text
assert "Parcialmente cumplida" in text
assert "Sin información" in text
assert "Reservado neutral QA" not in text
assert not reader.is_encrypted
assert "/OpenAction" not in reader.trailer["/Root"]
with pdfplumber.open(source) as pdf:
    for n, page in enumerate(pdf.pages):
        t = page.extract_text()
        assert "SEGUIMIENTO TERAPÉUTICO" in t
        assert f"Página {n + 1} de {len(pdf.pages)}" in t
        for char in page.chars:
            assert char["x0"] >= 40 and char["x1"] <= 551
            assert char["top"] >= 20 and char["bottom"] <= 825
poppler = Path("C:/Users/sebag/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin/pdftoppm.exe")
subprocess.run([str(poppler), "-r", "80", "-png", str(source), str(output / "pdf-page")], check=True, creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
result = {"status": "PASS", "pages": len(reader.pages), "text_bounds": "PASS", "header_footer": "PASS", "reserved_content_excluded": True, "rendered": True, "visual_review": "Pending inspection of all pages"}
(output / "pdf.json").write_text(json.dumps(result, indent=2), encoding="utf-8")
print(json.dumps(result))
