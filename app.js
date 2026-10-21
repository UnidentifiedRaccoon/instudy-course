'use strict';
const data=window.COURSE_DATA || {courses:[],videoStatus:{saved:0,queued:0,downloading:0,paused:0,error:0}};
const $=s=>document.querySelector(s);
const {icon,materialType}=window.CourseUI;
const key='instudy-course-progress-v1';
let state={};let section='all',filter='all',active=null;let libraryScroll=0;let materialContext=new URLSearchParams();
try{state=JSON.parse(localStorage.getItem(key)||'{}')}catch{}
const courses=data.courses, all=courses.flatMap(c=>c.items.map(x=>({...x,course:c.id})));
const known=new Set(all.map(x=>x.id));
function cleanProgress(raw){const out={};if(!raw||typeof raw!=='object')return out;for(const [id,x] of Object.entries(raw)){if(known.has(id)&&x&&typeof x==='object')out[id]={...x,done:x.done===true,repeat:x.repeat===true,note:typeof x.note==='string'?x.note.slice(0,20000):'',backupUrl:safeBackup(x.backupUrl)};}return out;}
// Keep the existing storage key, completion flags and any unrecognised saved fields.
state={...(state&&typeof state==='object'&&!Array.isArray(state)?state:{}),...cleanProgress(state)};
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function localPath(s){return String(s).split('/').map(encodeURIComponent).join('/')}
function href(x){return x.kind==='video'?x.url:x.available&&x.path?localPath(x.path):x.source}
function safeBackup(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:''}catch{return ''}}
function toast(text){$('#toast').textContent=text;$('#toast').style.display='block';setTimeout(()=>$('#toast').style.display='none',3500)}
function save(){try{localStorage.setItem(key,JSON.stringify(state));return true}catch{toast('Не удалось сохранить. Экспортируйте данные в файл.');return false}}
function progress(id){return state[id]||(state[id]={done:false,repeat:false,note:''})}
function selectSection(id){location.hash=id==='all'?'':id}
const navSections=[{id:'all',label:'Все материалы'},{id:'attestation',label:'Аттестация'},...courses.map(c=>c.id==='3941'?{...c,label:'Документы к аттестации'}:c)];
function renderNav(){$('#navigation').innerHTML=navSections.map(c=>`<button data-section="${c.id}" class="${section===c.id?'selected':''}" ${section===c.id?'aria-current="page"':''}>${esc(c.label)}</button>`).join('')}
$('#mobileSection').innerHTML=navSections.map(c=>`<option value="${c.id}">${esc(c.label)}</option>`).join('');
function typeMarkup(item) {
  const type=materialType(item);
  const label=type.label+(item.kind==='video'?'':' · '+item.format);
  return `<span class="material-type" role="img" aria-label="${esc(label)}" title="${esc(label)}">${icon(type.icon)}<span class="type-tooltip" aria-hidden="true">${esc(label)}</span></span>`;
}
function render() {
  const q=$('#query').value.trim().toLocaleLowerCase('ru');
  let count=0;
  const html=[];
  for(const c of courses) {
    if(section!=='all'&&section!==c.id)continue;
    const items=c.items.filter(x=>(filter==='all'||filter===x.kind||(filter==='repeat'&&state[x.id]?.repeat))&&(!q||(x.title+' '+c.title+' '+(state[x.id]?.note||'')).toLocaleLowerCase('ru').includes(q)));
    if(!items.length)continue;
    count+=items.length;
    const title=c.title.replace(/^Дисциплина (\d+)\. /,(_,n)=>n.padStart(2,'0')+' / ');
    html.push(`<section><h2>${esc(title)}</h2><ul class="material-list">${items.map(x=>`<li><a class="row" href="#material/${encodeURIComponent(x.id)}" data-open="${esc(x.id)}">${typeMarkup(x)}<span class="title">${esc(x.title)}</span>${icon('chevron')}</a></li>`).join('')}</ul></section>`);
  }
  $('#results').innerHTML=html.join('')||(all.length?'<p class="empty">Ничего не найдено. Попробуйте другой запрос или фильтр.</p>':'<p class="empty">Материалов пока нет.</p>');
  $('#results').setAttribute('aria-label',`Найдено материалов: ${count}`);
  $('#summary').textContent=`${courses.length} разделов · ${all.filter(x=>x.kind==='document').length} документа · ${all.filter(x=>x.kind==='video').length} видеозапись`;
}
function updateRepeat() {
  const repeat=!!state[active.id]?.repeat;
  $('#repeat').setAttribute('aria-pressed',String(repeat));
  $('#repeatLabel').textContent=repeat?'Убрать из повторения':'Повторить позже';
}
function showDetail(id) {
  active=all.find(x=>x.id===id);
  if(!active){location.hash='';return false}
  $('#materialMenu').open=false;
  $('#libraryMenu').open=false;
  $('#videoSettings').open=false;
  $('#notesPanel').hidden=true;
  document.body.classList.remove('view-notes');
  $('#detailTitle').textContent=active.title;
  $('#detailTitle').title=active.title;
  $('#detailFormat').innerHTML=typeMarkup(active);
  $('#detailOpen').href=href(active);
  $('#note').value=progress(id).note;
  $('#saveStatus').textContent='';
  updateRepeat();
  setupPlayer();setupDocument();
  $('#library').hidden=true;$('#attestation').hidden=true;
  $('#detail').hidden=false;
  document.body.classList.add('view-material');
  document.title=active.title+' — Мой курс';
  window.scrollTo(0,0);
  return true;
}
$('#navigation').addEventListener('click',e=>{const b=e.target.closest('[data-section]');if(b){selectSection(b.dataset.section);window.scrollTo({top:0,behavior:'instant'})}});
$('#mobileSection').addEventListener('change',e=>selectSection(e.target.value));
$('.filters').addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(!b)return;filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));render()});
$('#query').addEventListener('input',render);
$('#results').addEventListener('click',e=>{
  if(e.target.closest('[data-open]')&&!e.ctrlKey&&!e.metaKey&&!e.shiftKey&&!e.altKey&&e.button===0)libraryScroll=window.scrollY;
});
$('.skip-link').onclick=e=>{e.preventDefault();($('#attestation').hidden?$('#libraryTitle'):$('#attTitle'))?.focus();};
$('#note').addEventListener('input',()=>{if(active){progress(active.id).note=$('#note').value;$('#saveStatus').textContent=save()?'':'Не удалось сохранить заметку. Скопируйте её перед закрытием.'}});
$('#repeat').addEventListener('click',()=>{
  if(!active)return;
  progress(active.id).repeat=!progress(active.id).repeat;
  save();updateRepeat();render();
});
function materialHash(notes=false){return 'material/'+encodeURIComponent(active.id)+(notes?'/notes':'')+(materialContext.size?'?'+materialContext.toString():'')}
function detailBack(){const from=materialContext.get('from');return from&&/^attestation(?:\/(?:question\/\d+|answers|test(?:\/run)?))?$/.test(from)?from:(section==='all'?'':section)}
$('#close').addEventListener('click',()=>{if(document.body.classList.contains('view-notes')){location.hash=materialHash();return}location.hash=detailBack()});
function exportProgress(){const blob=new Blob([JSON.stringify({version:1,exported:new Date().toISOString(),progress:state},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='мой-курс-данные.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
$('#export').onclick=()=>{exportProgress();$('#libraryMenu').open=false;$('#libraryMenu>summary').focus()};
$('#import').onclick=()=>{$('#importFile').click();$('#libraryMenu').open=false;$('#libraryMenu>summary').focus()};
$('#importFile').addEventListener('change',async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>10000000)throw Error('Файл слишком большой');const raw=JSON.parse(await file.text());if(raw.version!==1||!raw.progress)throw Error('Это не файл данных курса');state={...state,...cleanProgress(raw.progress)};save();render();toast('Данные импортированы')}catch(err){toast('Не удалось импортировать: '+err.message)}finally{e.target.value=''}});
function route() {
  window.CourseAttestation.captureView();
  const hash=location.hash.slice(1),[path,query='']=hash.split('?');
  document.body.classList.toggle('view-study',/^attestation\/(?:question\/|test\/run)/.test(path));
  if(path.startsWith('material/')) {
    let id;
    try{id=decodeURIComponent(path.slice(9).replace(/\/notes$/,''))}catch{location.hash='';return}
    const oldContext=materialContext.toString();materialContext=new URLSearchParams(query);
    const changed=active?.id!==id||$('#detail').hidden;
    if(changed){if(!showDetail(id))return}else if(oldContext!==materialContext.toString())setupDocument();
    toggleNotes(path.endsWith('/notes'));return;
  }
  const previousId=active?.id;
  stopPlayer();$('#documentReader').removeAttribute('src');active=null;
  $('#detail').hidden=true;
  document.body.classList.remove('view-material','view-document','view-notes');
  const isAttestation=path==='attestation'||path.startsWith('attestation/');
  $('#library').hidden=isAttestation;$('#attestation').hidden=!isAttestation;
  if(isAttestation){section='attestation';$('#mobileSection').value=section;renderNav();window.CourseAttestation.render(hash);return}
  document.title='Мой курс — Гендерная психология';
  const oldSection=section;
  section=courses.some(c=>c.id===path)?path:'all';
  $('#mobileSection').value=section;renderNav();render();
  if(previousId)Array.from(document.querySelectorAll('[data-open]')).find(el=>el.dataset.open===previousId)?.focus({preventScroll:true});
  window.scrollTo(0,oldSection===section?libraryScroll:0);
}
window.addEventListener('hashchange',route);
renderNav();
route();

function stopPlayer(){const v=$('#courseVideo');v.pause();v.removeAttribute('src');v.load()}
function videoSources(){if(!active)return [];const list=[{id:'school',label:'Основной',url:active.url}];if(active.available&&active.path)list.push({id:'local',label:'На этом устройстве',url:localPath(active.path)});const backup=safeBackup(progress(active.id).backupUrl||active.backupUrl);if(backup)list.push({id:'backup',label:'Резервный',url:backup});return list}
function setupPlayer(){stopPlayer();$('#detailOpen').removeAttribute('download');$('#detailOpen').removeAttribute('title');const isVideo=active.kind==='video';$('#videoPanel').hidden=!isVideo;$('#openLabel').textContent=isVideo?'Открыть отдельно':'Открыть материал';$('#openIcon').innerHTML=icon('external');$('#videoSettings').hidden=!isVideo;if(!isVideo)return;$('#backupUrl').value=progress(active.id).backupUrl||active.backupUrl||'';$('#backupStatus').textContent='';fillSources('school');loadVideo()}
function fillSources(selected){$('#sourceChoice').hidden=videoSources().length<2;$('#videoSource').innerHTML=videoSources().map(x=>`<option value="${x.id}">${esc(x.label)}</option>`).join('');$('#videoSource').value=videoSources().some(x=>x.id===selected)?selected:'school'}
function loadVideo(){const source=videoSources().find(x=>x.id===$('#videoSource').value);if(!source)return;const v=$('#courseVideo');v.pause();v.src=source.url;v.load();$('#detailOpen').href=source.url;$('#playerStatus').textContent=''}
$('#videoSource').addEventListener('change',loadVideo);
$('#courseVideo').addEventListener('loadedmetadata',()=>{$('#playerStatus').textContent=''});
$('#courseVideo').addEventListener('playing',()=>{$('#playerStatus').textContent=''});
$('#courseVideo').addEventListener('error',()=>{if(!$('#courseVideo').getAttribute('src'))return;const selected=$('#videoSource').value;$('#playerStatus').textContent=selected==='local'?'Локальная копия недоступна на этом устройстве. Выберите сервер школы или резервное хранилище.':'Не удалось загрузить видео. Попробуйте ещё раз, откройте его в новой вкладке или выберите резервный источник.'});
$('#saveBackup').addEventListener('click',()=>{if(!active)return;const raw=$('#backupUrl').value.trim(),url=safeBackup(raw);if(raw&&!url){$('#backupStatus').textContent='Введите прямую HTTPS-ссылку без логина и пароля в адресе.';return}const selected=$('#videoSource').value;progress(active.id).backupUrl=url;if(!save())return;fillSources(selected);if(selected==='backup')loadVideo();$('#backupStatus').textContent=url?'Ссылка сохранена.':'Ссылка удалена.'});

function setupDocument(){
  const show=active.kind==='document';$('#documentPanel').hidden=!show;document.body.classList.toggle('view-document',show);
  $('#documentReader').removeAttribute('src');$('#sourceContext').hidden=true;if(!show)return;
  $('#openLabel').textContent='Скачать оригинал';$('#detailOpen').title='Скачать оригинал · '+active.format;$('#openIcon').innerHTML=icon('download');$('#detailOpen').setAttribute('download','');
  const preview=window.PREVIEW_MANIFEST?.[active.id];$('#documentReader').hidden=!preview?.path;$('#documentError').hidden=!!preview?.path;
  if(preview?.path){
    const params=new URLSearchParams({file:preview.path});const sourceId=materialContext.get('source'),source=window.ATTESTATION_DATA?.sources[sourceId];
    if(source&&source.materialId===active.id){params.set('page',source.page);params.set('source',sourceId);
      $('#sourceContext').hidden=false;$('#sourceContext').innerHTML=`<p><strong>Источник ответа · страница ${source.page}</strong> · ${esc(source.section)}</p><details><summary>Цитата из ответа</summary><blockquote class="att-source-content">${window.CourseAttestation.sourceContent(source)}</blockquote></details>`;
    }else if(/^\d+$/.test(materialContext.get('page')||''))params.set('page',materialContext.get('page'));
    $('#documentReader').src='reader.html?'+params;$('#documentReader').title=active.title;
  }else $('#documentError').textContent='Предпросмотр пока недоступен. Можно скачать оригинал.';
}

function toggleNotes(show) {
  const wasNotes=document.body.classList.contains('view-notes');
  document.body.classList.toggle('view-notes',show);
  $('#backLabel').textContent=show?'К материалу':detailBack().startsWith('attestation/question/')?'К ответу':detailBack().startsWith('attestation')?'Аттестация':'Материалы';
  $('#close').setAttribute('aria-label',show?'Назад к материалу':'Назад: '+$('#backLabel').textContent);
  $('#notesPanel').hidden=!show;
  $('#materialMenu').open=false;
  if(show){$('#courseVideo').pause();$('#note').focus()}
  else (wasNotes?$('#showNotes'):$('#close')).focus({preventScroll:true});
}
$('#showNotes').onclick=()=>{location.hash=materialHash(true)};
document.addEventListener('keydown',e=>{
  if(e.key!=='Escape')return;
  const openMenu=document.querySelector('.action-menu[open]');
  if(openMenu){openMenu.open=false;openMenu.querySelector('summary').focus();return}
  if(!$('#notesPanel').hidden&&active)location.hash=materialHash();
});
document.addEventListener('click',e=>{
  document.querySelectorAll('.action-menu[open]').forEach(menu=>{if(!menu.contains(e.target))menu.open=false});
});
