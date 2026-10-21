import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url),context={window:{}};
for(const file of ['data.js','preview-manifest.js','attestation-data.js'])vm.runInNewContext(fs.readFileSync(new URL(file,root),'utf8'),context);
const {COURSE_DATA,PREVIEW_MANIFEST,ATTESTATION_DATA:data}=context.window;
const materials=new Map(COURSE_DATA.courses.flatMap(c=>c.items).map(m=>[m.id,m]));
assert.equal(data.questions.length,54);
assert.equal(new Set(data.questions.map(q=>q.id)).size,54);
assert.deepEqual(data.documents.map(d=>d.id).join(','),'2261-eed0d394e1a83e,3941-76654600921abf');
for(const q of data.questions){
 assert(q.id>=1&&q.id<=54&&q.title&&q.question&&q.answer&&q.sources.length,`Incomplete question ${q.id}`);
 assert(['ready','partial','missing'].includes(q.status));
 if(q.status!=='ready')assert(q.note,`Missing explanation for question ${q.id}`);
 for(const id of q.sources)assert(data.sources[id],`Missing source ${id}`);
 if(q.quiz){assert.equal(q.quiz.options.length,4);assert.equal(new Set(q.quiz.options).size,4);assert(Number.isInteger(q.quiz.correct)&&q.quiz.correct>=0&&q.quiz.correct<4)}
 if(q.status==='missing')assert.equal(q.quiz,null);
 // Formatting must retain every word of the reviewed answer, including qualifications.
 assert(q.study?.length,`No study structure for question ${q.id}`);
 const studyText=q.study.map(b=>{
  assert(['paragraph','list'].includes(b.type),`Invalid block in question ${q.id}`);
  if(b.type==='paragraph')return b.text;
  assert(b.items?.length>1,`Empty list in question ${q.id}`);
  return b.lead+b.items.join('');
 }).join('');
 const words=s=>s.toLocaleLowerCase('ru').replace(/[^\p{L}\p{N}]/gu,'');
 assert.equal(words(studyText),words(q.answer),`Answer wording changed in question ${q.id}`);
 if(q.externalStudy||q.answerBasis==='external')assert(q.externalSources?.length,`Uncited external answer ${q.id}`);
 for(const block of q.externalStudy||[]){
  assert(['paragraph','list'].includes(block.type),`Invalid external block ${q.id}`);
  assert(block.type==='paragraph'?block.text?.trim():block.items?.length>1,`Empty external block ${q.id}`);
 }
 for(const source of q.externalSources||[]){
  assert(source.title&&source.author&&source.location&&source.description,`Incomplete external source ${q.id}`);
  assert.equal(new URL(source.url).protocol,'https:',`Unsafe external link ${q.id}`);
 }
}
assert.equal(data.questions.filter(q=>q.status!=='ready').map(q=>q.id).join(','),'14,21','Keep the two unresolved exam questions marked');
assert.equal(data.questions.find(q=>q.id===41).answerBasis,'external','Drivers must not be attributed to the course');
for(const [id,source] of Object.entries(data.sources)){
 const material=materials.get(source.materialId),preview=PREVIEW_MANIFEST[source.materialId];
 assert(material?.kind==='document'&&preview,`Unknown document ${id}`);
 assert(fs.existsSync(new URL(preview.path,root)),`Absent PDF ${id}`);
 assert(source.page>=1&&source.page<=preview.pages,`Invalid page ${id}`);
 assert(source.quote.trim()&&source.section.trim(),`Empty excerpt ${id}`);
 if(source.rect)assert(source.rect.length===4&&source.rect.every(n=>n>=0&&n<=1));
}
console.log(`Validated ${data.questions.length} questions, ${Object.keys(data.sources).length} page references, ${data.questions.filter(q=>q.quiz).length} four-option exercises.`);
