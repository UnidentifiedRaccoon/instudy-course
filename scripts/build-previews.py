"""Local Office to PDF conversion. Originals are never modified."""
import json, pathlib, subprocess, tempfile, shutil, concurrent.futures
from pypdf import PdfReader
root=pathlib.Path(__file__).resolve().parent.parent
catalog=json.loads((root/'data.js').read_text().removeprefix('window.COURSE_DATA = ').rstrip(';'))
items=[x for c in catalog['courses'] for x in c['items'] if x['kind']=='document']
(root/'previews').mkdir(exist_ok=True)
def convert(x):
 try:
  if x['format']=='PDF':path=x['path']
  else:
   path='previews/'+x['id']+'.pdf';out=root/path
   if not out.exists():
    with tempfile.TemporaryDirectory(prefix='course-preview-') as t:
     source=pathlib.Path(t)/(x['id']+'.'+x['format'].lower());shutil.copy2(root/x['path'],source)
     result=subprocess.run(['soffice','--headless','--convert-to',('pdf:calc_pdf_Export:{"SinglePageSheets":{"type":"boolean","value":"true"}}' if x['format']=='XLSX' else 'pdf'),'--outdir',str(root/'previews'),str(source)],capture_output=True,text=True,timeout=240)
     if result.returncode or not out.exists():raise RuntimeError((result.stderr+result.stdout)[-600:])
  pdf=PdfReader(root/path)
  if not len(pdf.pages):raise RuntimeError('Empty PDF')
  return x['id'],dict(path=path,pages=len(pdf.pages),converted=x['format']!='PDF')
 except Exception as e:return x['id'],dict(error=str(e))
with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
 results={}
 for ident,record in pool.map(convert,items):
  results[ident]=record
  print(ident,record.get('pages',record.get('error')),flush=True)
(root/'preview-manifest.js').write_text('window.PREVIEW_MANIFEST = '+json.dumps(results,ensure_ascii=False)+';')
print('TOTAL',len(results),'FAILED',sum('error' in x for x in results.values()),flush=True)
