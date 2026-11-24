"""Read-only layout QA of the neutral PDF exported through the real application."""
import json, subprocess
from pathlib import Path
import pdfplumber
from pypdf import PdfReader
from PIL import Image, ImageOps, ImageDraw
root=Path(__file__).resolve().parents[1]
out=root/'tmp/recovery-qa/pdf'
out.mkdir(parents=True,exist_ok=True)
source=root/'tmp/recovery-qa/recovery-monthly-reviewed.pdf'
reader=PdfReader(source)
text='\n'.join(p.extract_text() for p in reader.pages)
labels=['Planificación personal','Cumplimiento','Autonomía cotidiana','Responsabilidad','Iniciativa','Hábitos y constancia','Organización ocupacional','Coherencia conductual']
assert all(s in text for s in labels)
assert 'Versión 5 - Revisado' in text and 'Revisado por Dirección' in text
assert 'Resumen mensual Recovery editado por profesional' in text
assert 'Información insuficiente para concluir' in text
assert 'RESERVA' not in text
professional=text.split('Resumen mensual Recovery editado por profesional',1)[1].split('Cumplimiento y fuentes del periodo',1)[0]
assert 'planificacion_personal' not in professional
assert 'SE - Sin evaluar' in text and '200.0' in text
assert '/JavaScript' not in str(reader.trailer) and not reader.is_encrypted
with pdfplumber.open(source) as pdf:
 for page in pdf.pages:
  assert len(page.extract_text())>100
  assert all(-1<=c['x0']<c['x1']<=page.width+1 and -1<=c['top']<c['bottom']<=page.height+1 for c in page.chars)
poppler=Path('C:/Users/sebag/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin/pdftoppm.exe')
subprocess.run([str(poppler),'-r','110','-png',str(source),str(out/'monthly')],check=True,capture_output=True)
pages=sorted(out.glob('monthly-[0-9]*.png'),key=lambda p:int(p.stem.split('-')[-1]))
assert len(pages)==len(reader.pages)
thumbs=[]
for n,p in enumerate(pages,1):
 im=Image.open(p).convert('RGB');im.thumbnail((595,842));canvas=Image.new('RGB',(615,880),'#ddd');canvas.paste(im,((615-im.width)//2,25));ImageDraw.Draw(canvas).text((10,5),f'Pagina {n}',fill='black');thumbs.append(canvas)
montage=Image.new('RGB',(1230,880*((len(thumbs)+1)//2)),'#ddd')
for i,im in enumerate(thumbs):montage.paste(im,((i%2)*615,(i//2)*880))
montage.save(out/'monthly-contact-sheet.png')
(out/'monthly-text.txt').write_text(text,encoding='utf-8')
(out/'monthly-results.json').write_text(json.dumps({'status':'PASS','pages':len(pages),'dimension_labels':8,'private_http_export':True,'visual_inspection':'pending'}),encoding='utf-8')
print(f'PASS: {len(pages)} páginas renderizadas, etiquetas/estado/fuentes y límites de caracteres verificados; inspección visual pendiente.')


