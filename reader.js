import * as pdfjs from './vendor/pdfjs/pdf.mjs';
pdfjs.GlobalWorkerOptions.workerSrc=new URL('./vendor/pdfjs/pdf.worker.mjs',import.meta.url).href;
const $=s=>document.querySelector(s), params=new URLSearchParams(location.search);
let doc=null,page=1,zoom=null,epoch=0,task=null,textTask=null;
const file=params.get('file'),storageKey='course-reader-page:'+file;
const setStatus=s=>$('#status').textContent=s;
function controls(){
 $('#page').value=page;$('#page').max=doc?.numPages||1;
 $('#pageCounter').textContent=page+' / '+(doc?.numPages||'…');
 $('#pageCounter').setAttribute('aria-label',`Страница ${page} из ${doc?.numPages||'…'}. Перейти к странице`);
 $('#prev').disabled=!doc||page<=1;$('#next').disabled=!doc||page>=doc.numPages;
 $('#pageCounter').disabled=!doc;$('#resetZoom').hidden=zoom===null;
}
async function render(){if(!doc)return;const token=++epoch;task?.cancel();textTask?.cancel();controls();setStatus('');$('#sheet').dataset.ready='false';try{const p=await doc.getPage(page);if(token!==epoch)return;const natural=p.getViewport({scale:1});const width=$('#viewport').clientWidth-(innerWidth<=440?16:32);const fit=natural.width>natural.height?Math.min(width/natural.width,($('#viewport').clientHeight-32)/natural.height):width/natural.width;const scale=zoom||Math.max(.1,fit);const view=p.getViewport({scale});const ratio=Math.min(devicePixelRatio||1,2,8192/Math.max(view.width,view.height),Math.sqrt(16000000/(view.width*view.height)));const canvas=document.createElement('canvas');canvas.setAttribute('aria-label',`Страница ${page} из ${doc.numPages}`);canvas.width=Math.ceil(view.width*ratio);canvas.height=Math.ceil(view.height*ratio);canvas.style.width=view.width+'px';canvas.style.height=view.height+'px';const layer=document.createElement('div');layer.className='textLayer';$('#sheet').replaceChildren(canvas,layer);$('#sheet').style.width=view.width+'px';$('#sheet').style.height=view.height+'px';$('#sheet').style.setProperty('--scale-factor',scale);$('#sheet').style.setProperty('--total-scale-factor',scale);task=p.render({canvasContext:canvas.getContext('2d'),viewport:view,transform:ratio===1?null:[ratio,0,0,ratio,0,0]});await task.promise;if(token!==epoch)return;textTask=new pdfjs.TextLayer({textContentSource:await p.getTextContent(),container:layer,viewport:view});await textTask.render();if(token!==epoch)return;$('#sheet').dataset.ready='true';try{localStorage.setItem(storageKey,String(page))}catch{}}catch(e){if(token===epoch&&e.name!=='RenderingCancelledException'&&e.name!=='AbortException'){setStatus('Не удалось показать страницу. Попробуйте другую страницу или скачайте оригинал.');console.error(e)}}}
function go(n){if(!doc)return;page=Math.max(1,Math.min(doc.numPages,Math.trunc(Number(n))||1));$('#viewport').scrollTo(0,0);render()}
$('#prev').onclick=()=>go(page-1);$('#next').onclick=()=>go(page+1);
function jump(open){$('#pageJump').hidden=!open;$('#pageCounter').setAttribute('aria-expanded',String(open));if(open){$('#page').value=page;$('#page').focus();$('#page').select()}else $('#pageCounter').focus()}
$('#pageCounter').onclick=()=>jump($('#pageJump').hidden);
$('#cancelJump').onclick=()=>jump(false);
$('#pageJump').onsubmit=e=>{e.preventDefault();go($('#page').value);jump(false)};
$('#resetZoom').onclick=()=>{zoom=null;render()};
// Two-finger zoom inside the page; one finger retains ordinary scrolling.
const viewport=$('#viewport');let pinch=null;
function distance(t){return Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY)}
viewport.addEventListener('touchstart',e=>{if(e.touches.length!==2||!doc)return;
 e.preventDefault();pinch={distance:distance(e.touches),scale:parseFloat($('#sheet').style.getPropertyValue('--scale-factor')),factor:1};
},{passive:false});
viewport.addEventListener('touchmove',e=>{if(!pinch||e.touches.length!==2)return;e.preventDefault();pinch.factor=Math.max(.5,Math.min(4,distance(e.touches)/pinch.distance));$('#sheet').style.transform=`scale(${pinch.factor})`;$('#sheet').style.transformOrigin='0 0';},{passive:false});
function endPinch(){if(!pinch)return;zoom=Math.max(.15,Math.min(4,pinch.scale*pinch.factor));pinch=null;$('#sheet').style.transform='';render()}
viewport.addEventListener('touchend',endPinch);viewport.addEventListener('touchcancel',endPinch);
// Double click / double tap enlarges a page and returns it to fit width.
viewport.addEventListener('dblclick',()=>{if(!doc)return;zoom=zoom===null?parseFloat($('#sheet').style.getPropertyValue('--scale-factor'))*2:null;render()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('#pageJump').hidden)jump(false)});
let resizeTimer;new ResizeObserver(()=>{clearTimeout(resizeTimer);resizeTimer=setTimeout(()=>render(),120)}).observe($('#viewport'));
document.addEventListener('keydown',e=>{if(e.target.tagName==='INPUT')return;if(e.key==='ArrowRight'){e.preventDefault();go(page+1)}if(e.key==='ArrowLeft'){e.preventDefault();go(page-1)}});
controls();
try{const url=new URL(file,location.href);if(!file||url.origin!==location.origin||!url.pathname.toLowerCase().endsWith('.pdf'))throw Error('Invalid PDF path');doc=await pdfjs.getDocument({url:url.href,cMapUrl:new URL('./vendor/pdfjs/cmaps/',import.meta.url).href,cMapPacked:true,standardFontDataUrl:new URL('./vendor/pdfjs/standard_fonts/',import.meta.url).href,wasmUrl:new URL('./vendor/pdfjs/wasm/',import.meta.url).href,isEvalSupported:false}).promise;try{page=Math.min(doc.numPages,Math.max(1,Number(localStorage.getItem(storageKey))||1))}catch{}await render()}catch(e){setStatus('Не удалось открыть документ. Скачайте оригинал через меню «Действия с материалом».');console.error(e)}
