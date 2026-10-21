import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const root=new URL('../',import.meta.url),context={window:{}};
for(const file of ['data.js','preview-manifest.js','attestation-data.js'])vm.runInNewContext(fs.readFileSync(new URL(file,root),'utf8'),context);
const {COURSE_DATA,PREVIEW_MANIFEST,ATTESTATION_DATA:data}=context.window;
const materials=new Map(COURSE_DATA.courses.flatMap(c=>c.items).map(m=>[m.id,m]));
const exercises=data.questions.flatMap(q=>q.quiz?[{id:String(q.id),quiz:q.quiz},...(q.additionalQuizzes||[]).map(quiz=>({id:quiz.key,quiz}))]:[]);
const words=s=>s.toLocaleLowerCase('ru').replace(/[^\p{L}\p{N}]/gu,'');
// Labels are editorial; all quoted/answer words must survive semantic formatting.
function contentText(blocks,owner){
 assert(Array.isArray(blocks)&&blocks.length,`Missing content in ${owner}`);
 return blocks.map(b=>{
  assert(['paragraph','heading','definition','list','comparison'].includes(b.type),`Invalid block in ${owner}`);
  if(b.type==='paragraph'||b.type==='heading'){assert(b.text?.trim(),`Empty text in ${owner}`);return b.text;}
  if(b.type==='comparison'){
   assert(b.head?.length===2&&b.head.every(s=>s.trim()),`Missing comparison headings in ${owner}`);
   assert(!!b.rows!==!!b.columns,`Ambiguous comparison in ${owner}`);
   if(b.rows)assert(b.rows.length&&b.rows.every(row=>row.length===2),`Invalid rows in ${owner}`);
   else assert(b.columns.length===2&&b.columns.every(column=>column.length),`Invalid columns in ${owner}`);
   assert((b.rows||b.columns).flat().every(s=>typeof s==='string'&&s.trim()),`Empty comparison in ${owner}`);
   return b.head.join('')+(b.rows||b.columns).flat().join('');
  }
  assert(b.items?.length,`Empty ${b.type} in ${owner}`);
  if(b.type==='definition')return (b.lead||'')+b.items.map(item=>{assert(item.term?.trim()&&item.text?.trim(),`Empty definition in ${owner}`);return item.term+item.text;}).join('');
  assert(b.items.length>1,`A list needs at least two items in ${owner}`);
  const numbers=b.items.map(item=>(typeof item==='string'?item:item.text).match(/^(\d+)[.)]/));
  if(numbers.some(Boolean)){
   assert(numbers.every(Boolean),`Mixed numbered and unnumbered items in ${owner}`);
   assert(numbers.every((n,i)=>i===0||Number(n[1])===Number(numbers[i-1][1])+1),`Broken list numbering in ${owner}`);
  }
  return (b.lead||'')+b.items.map(item=>{
   const text=typeof item==='string'?item:item.text;
   assert(text?.trim(),`Empty list item in ${owner}`);
   return text+(item.children?contentText(item.children,owner):'');
  }).join('');
 }).join('');
}
assert.equal(data.questions.length,54);
assert.equal(exercises.length,58);
assert.equal(new Set(exercises.map(e=>e.id)).size,exercises.length,'Exercise IDs must stay unique');
assert.equal(new Set(data.questions.map(q=>q.id)).size,54);
assert.deepEqual(data.documents.map(d=>d.id).join(','),'2261-eed0d394e1a83e,3941-76654600921abf');
for(const q of data.questions){
 assert(q.id>=1&&q.id<=54&&q.title&&q.question&&q.answer&&q.sources.length,`Incomplete question ${q.id}`);
 assert(['ready','partial','missing'].includes(q.status));
 if(q.status!=='ready')assert(q.note,`Missing explanation for question ${q.id}`);
 for(const id of q.sources)assert(data.sources[id],`Missing source ${id}`);
 if(q.additionalQuizzes?.length)assert(q.quiz,`Additional exercises need a base exercise ${q.id}`);
 for(const extra of q.additionalQuizzes||[])assert(new RegExp(`^${q.id}-[a-z]+$`).test(extra.key),`Invalid stable exercise ID ${extra.key}`);
 for(const quiz of [q.quiz,...(q.additionalQuizzes||[])].filter(Boolean)){
  assert(quiz.prompt?.trim());assert.equal(quiz.options.length,4);assert.equal(new Set(quiz.options).size,4);assert(Number.isInteger(quiz.correct)&&quiz.correct>=0&&quiz.correct<4);
  if(quiz.externalSource!==undefined){
   assert(Number.isInteger(quiz.externalSource)&&quiz.externalSource>=0,`Invalid quiz source ${q.id}`);
   assert(q.externalSources?.[quiz.externalSource],`Uncited external exercise ${q.id}`);
  }
  if(q.answerBasis==='external')assert(quiz.externalSource!==undefined,`External exercise must be labeled ${q.id}`);
 }
 if(q.status==='missing')assert.equal(q.quiz,null);
 // Formatting must retain every word of the reviewed answer, including qualifications.
 assert(q.study?.length,`No study structure for question ${q.id}`);
 const studyText=contentText(q.study,`question ${q.id}`);
 assert.equal(words(studyText),words(q.answer),`Answer wording changed in question ${q.id}`);
 if(q.externalStudy||q.answerBasis==='external')assert(q.externalSources?.length,`Uncited external answer ${q.id}`);
 for(const block of q.externalStudy||[]){
  contentText([block],`external answer ${q.id}`);
 }
 for(const source of q.externalSources||[]){
  assert(source.title&&source.author&&source.location&&source.description,`Incomplete external source ${q.id}`);
  assert.equal(new URL(source.url).protocol,'https:',`Unsafe external link ${q.id}`);
 }
}
assert.equal(data.questions.filter(q=>q.status!=='ready').map(q=>q.id).join(','),'14,21','Keep the two unresolved exam questions marked');
assert.equal(data.questions.find(q=>q.id===41).answerBasis,'external','Drivers must not be attributed to the course');
const drivers=data.questions.find(q=>q.id===41),driverQuizzes=[drivers.quiz,...drivers.additionalQuizzes];
assert.equal(driverQuizzes.map(q=>q.driver).sort().join('|'),['Будь совершенным','Радуй других','Будь сильным','Старайся','Спеши'].sort().join('|'),'Cover each driver once');
for(const quiz of driverQuizzes){
 const entry=drivers.study.flatMap(b=>b.items||[]).map(item=>typeof item==='string'?item:item.text+contentText(item.children,`driver ${quiz.driver}`)).find(text=>text.startsWith(quiz.driver+' —'));
 assert(entry?.includes(quiz.options[quiz.correct]),`Permission must match the study answer for ${quiz.driver}`);
}
for(const [id,source] of Object.entries(data.sources)){
 const material=materials.get(source.materialId),preview=PREVIEW_MANIFEST[source.materialId];
 assert(material?.kind==='document'&&preview,`Unknown document ${id}`);
 assert(fs.existsSync(new URL(preview.path,root)),`Absent PDF ${id}`);
 assert(source.page>=1&&source.page<=preview.pages,`Invalid page ${id}`);
 assert(source.quote.trim()&&source.section.trim(),`Empty excerpt ${id}`);
 assert.equal(words(contentText(source.content,`source ${id}`)),words(source.quote),`Source wording changed in ${id}`);
 if(source.rect)assert(source.rect.length===4&&source.rect.every(n=>n>=0&&n<=1));
}
console.log(`Validated ${data.questions.length} questions, ${Object.keys(data.sources).length} page references, ${exercises.length} four-option exercises.`);
