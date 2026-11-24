"""Read-only QA of neutral PDFs exported through the real local application."""
import json
import os
import subprocess
import sys
from pathlib import Path

import pdfplumber
from pypdf import PdfReader
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
output = root / "tmp/care-qa/pdf"
output.mkdir(parents=True, exist_ok=True)
poppler = Path(os.environ.get("CODEX_POPPLER_BIN", "C:/Users/sebag/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin")) / "pdftoppm.exe"
results = []
samples = [("original", 1, "Pendiente de revisión"), ("reviewed", 2, "Revisado"), ("regenerated", 3, "Pendiente de revisión"), ("monthly-empty", 1, "Pendiente de revisión"), ("professional-private", 1, "Pendiente de revisión")]
if "--include-scheduled" in sys.argv:
    samples.append(("scheduled", 1, "Pendiente de revisión"))
if "--scheduled-only" in sys.argv:
    samples = [("scheduled", 1, "Pendiente de revisión")]
for kind, revision, state in samples:
    source = root / ("tmp/care-qa/step-10-scheduled.pdf" if kind == "scheduled" else f"tmp/care-qa/step-09-{kind}.pdf")
    reader = PdfReader(source)
    assert not reader.is_encrypted
    assert "/JavaScript" not in str(reader.trailer) and "/OpenAction" not in reader.trailer["/Root"]
    assert len(reader.pages) <= 100
    text = "\n".join(page.extract_text() for page in reader.pages)
    assert "RESERVA" not in text
    assert f"Versión {revision} - {state}" in text
    assert text.count("Fuente: ") == (0 if kind == "monthly-empty" else 2 if kind == "scheduled" else 60 if kind == "professional-private" else 59)
    joined = " ".join(text.split())
    if kind == "scheduled":
        assert "Consolidado por una ejecución privada de cron verificada." in joined
    else:
        assert "Este snapshot no acredita una ejecución programada" in joined
    assert "DELIBERACION" not in text
    assert "Pacientes con revisión pendiente documentada" in text
    if kind in ("original", "reviewed"):
        assert "Objetivo ORIGINAL autorizado QA" in text and "ENMENDADO" not in text
    if kind in ("regenerated", "professional-private"):
        assert "Objetivo ENMENDADO autorizado QA" in text and "ORIGINAL" not in text
    if kind == "reviewed":
        assert "Fuentes y pendientes revisados neutral QA" in text
    if kind == "monthly-empty":
        assert "No aplica: N=0" in text and "Sin fuentes registradas" in text
    with pdfplumber.open(source) as pdf:
        for i, page in enumerate(pdf.pages):
            t = page.extract_text()
            assert "SEGUIMIENTO TERAPÉUTICO" in t, (kind, i, "missing header")
            assert f"Página {i + 1} de {len(pdf.pages)}" in t, (kind, i, "incorrect footer")
            assert f"Versión {revision}" in t and len(t) > 250, (kind, i, "empty page")
            for char in page.chars:
                assert char["x0"] >= 40 and char["x1"] <= 551 and char["top"] >= 20 and char["bottom"] <= 825, (kind, i, "text outside bounds")
    prefix = output / f"final-{kind}"
    subprocess.run([str(poppler), "-r", "85", "-png", str(source), str(prefix)], check=True, creationflags=subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0)
    pages = sorted(output.glob(prefix.name + "-*.png"), key=lambda p: int(p.stem.rsplit("-", 1)[1]))
    assert len(pages) == len(reader.pages)
    # Contact sheets assist visual inspection; original rendered pages remain available.
    for offset in range(0, len(pages), 4):
        chosen = pages[offset:offset + 4]
        sheet = Image.new("RGB", (1420, 2040), "#dce6ec")
        draw = ImageDraw.Draw(sheet)
        for index, page in enumerate(chosen):
            im = Image.open(page).convert("RGB")
            im.thumbnail((690, 980))
            x, y = 10 + index % 2 * 710, 30 + index // 2 * 1020
            draw.text((x, y - 20), f"{kind} - page {offset + index + 1}", fill="black")
            sheet.paste(im, (x, y))
        sheet.save(output / f"contact-{kind}-{offset // 4 + 1}.png")
    results.append({"kind": kind, "pages": len(pages), "source_count": text.count("Fuente: "), "text_bounds": "PASS", "header_footer": "PASS", "file": str(source), "rendered": True})
report = {"status": "PASS", "environment": "local-only-neutral-data", "results": results, "total_pages": sum(r["pages"] for r in results), "visual_review": "Requires inspection of all rendered pages; automated checks alone are insufficient."}
(output / ("validation-scheduled.json" if "--scheduled-only" in sys.argv else "validation.json")).write_text(json.dumps(report, indent=2), encoding="utf-8")
print(json.dumps(report, indent=2))
