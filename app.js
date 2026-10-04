'use strict';
const data=window.COURSE_DATA || {courses:[],videoStatus:{saved:0,queued:0,downloading:0,paused:0,error:0}};
const $=s=>document.querySelector(s);
const key='instudy-course-progress-v1';
let state={};let section='all',filter='all',active=null;let libraryScroll=0;
try{state=JSON.parse(localStorage.getItem(key)||'{}')}catch{}
const courses=data.courses, all=courses.flatMap(c=>c.items.map(x=>({...x,course:c.id})));
const known=new Set(all.map(x=>x.id));
function cleanProgress(raw){const out={};if(!raw||typeof raw!=='object')return out;for(const [id,x] of Object.entries(raw)){if(known.has(id)&&x&&typeof x==='object')out[id]={done:x.done===true,repeat:x.repeat===true,note:typeof x.note==='string'?x.note.slice(0,20000):'',backupUrl:safeBackup(x.backupUrl)};}return out;}
state=cleanProgress(state);
function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function localPath(s){return String(s).split('/').map(encodeURIComponent).join('/')}
function href(x){return x.kind==='video'?x.url:x.available&&x.path?localPath(x.path):x.source}
function safeBackup(value){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:''}catch{return ''}}
function toast(text){$('#toast').textContent=text;$('#toast').style.display='block';setTimeout(()=>$('#toast').style.display='none',3500)}
function save(){try{localStorage.setItem(key,JSON.stringify(state));return true}catch{toast('Не удалось сохранить. Экспортируйте прогресс в файл.');return false}}
function progress(id){return state[id]||(state[id]={done:false,repeat:false,note:''})}
function selectSection(id){location.hash=id==='all'?'':id}
function renderNav(){$('#navigation').innerHTML=[{id:'all',label:'Все материалы'},...courses].map(c=>`<button data-section="${c.id}" class="${section===c.id?'selected':''}" ${section===c.id?'aria-current="page"':''}>${esc(c.label)}</button>`).join('')}
$('#mobileSection').innerHTML=[{id:'all',label:'Все материалы'},...courses].map(c=>`<option value="${c.id}">${esc(c.label)}</option>`).join('');
function render(){const q=$('#query').value.trim().toLocaleLowerCase('ru');let count=0;const html=[];
for(const c of courses){if(section!=='all'&&section!==c.id)continue;const items=c.items.filter(x=>(filter==='all'||filter===x.kind||(filter==='repeat'&&state[x.id]?.repeat))&&(!q||(x.title+' '+c.title+' '+(state[x.id]?.note||'')).toLocaleLowerCase('ru').includes(q)));if(!items.length&&!(c.unavailable.length&&!q&&filter==='all'))continue;count+=items.length;html.push(`<section><h2>${esc(c.title.replace(/^Дисциплина (\d+)\. /,'0$1 / '))}</h2>${items.map(x=>`<div class="row ${state[x.id]?.done?'completed':''}"><span class="format ${x.kind==='video'?'video':x.format.toLowerCase()}">${esc(x.format)}</span><div><button class="title" data-detail="${x.id}">${esc(x.title)}</button></div><a class="open-link" href="${esc(href(x))}" target="_blank" rel="noopener" data-open="${x.id}">${x.kind==='video'?'Смотреть':'Открыть'}</a><label class="done"><input type="checkbox" data-done="${x.id}" ${state[x.id]?.done?'checked':''} aria-label="Пройдено: ${esc(x.title)}">Пройдено</label></div>`).join('')}</section>`)}
$('#results').innerHTML=html.join('')||(all.length?'<p class="empty">Ничего не найдено. Попробуйте другой запрос или фильтр.</p>':'<p class="empty">Материалов пока нет.</p>');$('#results').setAttribute('aria-label',`Найдено материалов: ${count}`);
$('#summary').textContent=`${courses.length} разделов · ${all.filter(x=>x.kind==='document').length} документа · ${all.filter(x=>x.kind==='video').length} видеозапись`;
}
function openDetail(id){libraryScroll=window.scrollY;location.hash='material/'+encodeURIComponent(id)}
function showDetail(id){active=all.find(x=>x.id===id);if(!active){location.hash='';return}$('#detailTitle').textContent=active.title;$('#detailFormat').textContent=active.format;$('#detailOpen').href=href(active);$('#note').value=progress(id).note;$('#repeat').checked=progress(id).repeat;$('#saveStatus').textContent='';$('#detailDone').checked=progress(id).done;$('#detailCourse').textContent=courses.find(c=>c.id===active.course)?.label||'';setupPlayer();$('#detailOpen').classList.toggle('primary',active.kind!=='video');$('#library').hidden=true;$('#detail').hidden=false;document.body.classList.add('view-material');document.title=active.title+' — Мой курс';window.scrollTo(0,0);$('#close').focus({preventScroll:true})}
$('#navigation').addEventListener('click',e=>{const b=e.target.closest('[data-section]');if(b){selectSection(b.dataset.section);window.scrollTo({top:0,behavior:'instant'})}});
$('#mobileSection').addEventListener('change',e=>selectSection(e.target.value));
$('.filters').addEventListener('click',e=>{const b=e.target.closest('[data-filter]');if(!b)return;filter=b.dataset.filter;document.querySelectorAll('[data-filter]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));render()});
$('#query').addEventListener('input',render);
$('#results').addEventListener('click',e=>{const b=e.target.closest('[data-detail]');if(b)openDetail(b.dataset.detail);const link=e.target.closest('[data-open]');if(link&&all.find(x=>x.id===link.dataset.open)?.kind==='video'){e.preventDefault();openDetail(link.dataset.open)}});
$('#results').addEventListener('change',e=>{const id=e.target.dataset.done;if(id){progress(id).done=e.target.checked;save();e.target.closest('.row').classList.toggle('completed',e.target.checked)}});
$('#note').addEventListener('input',()=>{if(active){progress(active.id).note=$('#note').value;$('#saveStatus').textContent=save()?'':'Не удалось сохранить заметку. Скопируйте её перед закрытием.'}});
$('#repeat').addEventListener('change',()=>{if(active){progress(active.id).repeat=$('#repeat').checked;save();render()}});
$('#detailDone').addEventListener('change',()=>{if(active){progress(active.id).done=$('#detailDone').checked;save();render()}});
$('#close').addEventListener('click',()=>{history.replaceState(null,'',location.pathname+location.search+(section==='all'?'':'#'+section));route()});
function exportProgress(){const blob=new Blob([JSON.stringify({version:1,exported:new Date().toISOString(),progress:state},null,2)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='мой-курс-прогресс.json';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)}
$('#export').onclick=exportProgress;$('#mobileExport').onclick=exportProgress;
$('#import').onclick=$('#mobileImport').onclick=()=>$('#importFile').click();
$('#importFile').addEventListener('change',async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>10000000)throw Error('Файл слишком большой');const raw=JSON.parse(await file.text());if(raw.version!==1||!raw.progress)throw Error('Это не файл прогресса');state={...state,...cleanProgress(raw.progress)};save();render();toast('Прогресс импортирован')}catch(err){toast('Не удалось импортировать: '+err.message)}finally{e.target.value=''}});
function route(){const hash=location.hash.slice(1);if(hash.startsWith('material/')){let id;try{id=decodeURIComponent(hash.slice(9))}catch{location.hash='';return}showDetail(id);return}stopPlayer();active=null;$('#detail').hidden=true;$('#library').hidden=false;document.body.classList.remove('view-material');document.title='Мой курс — Гендерная психология';const oldSection=section;section=courses.some(c=>c.id===hash)?hash:'all';$('#mobileSection').value=section;renderNav();render();window.scrollTo(0,oldSection===section?libraryScroll:0);}
window.addEventListener('hashchange',route);
renderNav();
route();

function stopPlayer(){const v=$('#courseVideo');v.pause();v.removeAttribute('src');v.load()}
function videoSources(){if(!active||active.kind!=='video')return [];const list=[{id:'school',label:'Основной',url:active.url}];if(active.available&&active.path)list.push({id:'local',label:'На этом устройстве',url:localPath(active.path)});const backup=safeBackup(progress(active.id).backupUrl||active.backupUrl);if(backup)list.push({id:'backup',label:'Резервный',url:backup});return list}
function setupPlayer(){stopPlayer();const isVideo=active.kind==='video';$('#videoPanel').hidden=!isVideo;$('#detailOpen').textContent=isVideo?'Открыть отдельно':'Открыть материал';if(!isVideo)return;$('#backupUrl').value=progress(active.id).backupUrl||active.backupUrl||'';$('#backupStatus').textContent='';fillSources('school');loadVideo()}
function fillSources(selected){$('#sourceChoice').hidden=videoSources().length<2;$('#videoSource').innerHTML=videoSources().map(x=>`<option value="${x.id}">${esc(x.label)}</option>`).join('');$('#videoSource').value=videoSources().some(x=>x.id===selected)?selected:'school'}
function loadVideo(){const source=videoSources().find(x=>x.id===$('#videoSource').value);if(!source)return;const v=$('#courseVideo');v.pause();v.src=source.url;v.load();$('#detailOpen').href=source.url;$('#playerStatus').textContent=''}
$('#videoSource').addEventListener('change',loadVideo);
$('#courseVideo').addEventListener('loadedmetadata',()=>{$('#playerStatus').textContent=''});
$('#courseVideo').addEventListener('playing',()=>{$('#playerStatus').textContent=''});
$('#courseVideo').addEventListener('error',()=>{if(!$('#courseVideo').getAttribute('src'))return;const selected=$('#videoSource').value;$('#playerStatus').textContent=selected==='local'?'Локальная копия недоступна на этом устройстве. Выберите сервер школы или резервное хранилище.':'Не удалось загрузить видео. Попробуйте ещё раз, откройте его в новой вкладке или выберите резервный источник.'});
$('#saveBackup').addEventListener('click',()=>{if(!active)return;const raw=$('#backupUrl').value.trim(),url=safeBackup(raw);if(raw&&!url){$('#backupStatus').textContent='Введите прямую HTTPS-ссылку без логина и пароля в адресе.';return}const selected=$('#videoSource').value;progress(active.id).backupUrl=url;if(!save())return;fillSources(selected);if(selected==='backup')loadVideo();$('#backupStatus').textContent=url?'Ссылка сохранена.':'Ссылка удалена.'});
