'use strict';
/* A quiet study desk: question → structured answer → recall → next question.
   Preserve the course's Manrope/navy visual language and verbatim evidence.
   Source details are optional; uncertainty remains visible beside the answer. */
window.CourseAttestation = (() => {
  const data=window.ATTESTATION_DATA, host=document.querySelector('#attestation');
  const {icon}=window.CourseUI;
  const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const key='instudy-attestation-practice-v1',readingKey='instudy-attestation-reading-v1';
  const questions=data.questions,byId=new Map(questions.map(q=>[q.id,q])),groups=[...new Set(questions.map(q=>q.group))];
  const views=new Map(),inlineChecks=new Map();
  let search='',group='all',coverage='all',run=null,lastQuestion=null,currentRoute='',recall=false;
  const shuffled=a=>{a=[...a];for(let i=a.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
  function readRun(raw){
    if(!raw||raw.version!==data.version||!Array.isArray(raw.ids)||!raw.ids.length||raw.ids.length>questions.length)return null;
    if(new Set(raw.ids).size!==raw.ids.length||raw.ids.some(id=>!byId.get(id)?.quiz))return null;
    if(!Number.isInteger(raw.index)||raw.index<0||raw.index>raw.ids.length)return null;
    if(!raw.orders||typeof raw.orders!=='object'||!raw.answers||typeof raw.answers!=='object')return null;
    for(const id of raw.ids){if(!Array.isArray(raw.orders[id])||[...raw.orders[id]].sort().join()!=='0,1,2,3')return null;
      if(raw.answers[id]!==undefined&&(!Number.isInteger(raw.answers[id])||raw.answers[id]<0||raw.answers[id]>3))return null;}
    return raw;
  }
  try{run=readRun(JSON.parse(localStorage.getItem(key)||'null'))}catch{}
  try{const id=Number(localStorage.getItem(readingKey));if(byId.has(id))lastQuestion=id}catch{}
  function save(){try{localStorage.setItem(key,JSON.stringify(run))}catch{const n=host.querySelector('#practiceNotice');if(n)n.textContent='Браузер не сохранил попытку. Она доступна, пока открыта эта вкладка.'}}
  function captureView(){
    if(host.hidden||!currentRoute)return;
    const focused=host.contains(document.activeElement)?document.activeElement:null;
    views.set(currentRoute,{scroll:window.scrollY,open:[...host.querySelectorAll('details[open][data-fold]')].map(el=>el.dataset.fold),focus:focused?.getAttribute('href')||null});
  }
  function frame(title,body,back='attestation',label='Аттестация'){
    return `<a class="att-back" href="#${back}">${icon('back')}${label}</a><header class="att-heading"><h1 id="attTitle" tabindex="-1">${title}</h1></header>${body}`;
  }
  function badge(q){return q.status==='missing'?'<span class="att-status">Нет ответа</span>':q.status==='partial'?'<span class="att-status">Требует уточнения</span>':q.answerBasis==='external'?'<span class="att-caption att-basis">Внешний источник</span>':''}
  function overview(){
    const partial=questions.filter(q=>q.status!=='ready');
    host.innerHTML=frame('Аттестация',`<p class="att-lead">Гендерная психология 2 · 54 вопроса</p>
      <div class="att-actions"><a class="att-primary" href="#attestation/${lastQuestion?'question/'+lastQuestion:'answers'}">${lastQuestion?'Продолжить с вопроса '+lastQuestion:'Изучать ответы'} ${icon('forward')}</a><a class="att-secondary" href="#attestation/test">Тренировка</a></div>
      ${lastQuestion?'<a class="att-all-questions" href="#attestation/answers">Все 54 вопроса</a>':''}
      <p class="att-intro">Планы ответов и точные цитаты с переходом к странице источника.</p>
      <details class="att-disclosure" data-fold="documents"><summary>Документы с вопросами <span>2</span></summary><ul class="material-list">${data.documents.map(d=>`<li><a class="row" href="#material/${d.id}?from=attestation">${icon('document')}<span class="title">${escape(d.title)}</span>${icon('chevron')}</a></li>`).join('')}</ul></details>
      <details class="att-disclosure" data-fold="coverage"><summary>Требуют уточнения <span>${partial.length} вопроса</span></summary><p class="att-caption">По этим вопросам в материалах нет полного или однозначного ответа.</p><ul class="att-gap-list">${partial.map(q=>`<li><a href="#attestation/question/${q.id}">${q.id}. ${escape(q.title)}</a>${badge(q)}</li>`).join('')}</ul></details>
      <p class="att-caption att-footnote">«Вопросы в МИП 2.0» — исходный документ. Ответы и тренировка подготовлены для «Гендерной психологии 2».</p>`,'','Все материалы');
  }
  function listing(){
    host.innerHTML=frame('Вопросы и ответы',`<div class="att-search search">${icon('search')}<input type="search" id="attQuery" aria-label="Поиск по вопросам и ответам" placeholder="Номер вопроса или тема" value="${escape(search)}"></div>
      <div class="att-selects"><label>Тема<select id="attGroup"><option value="all">Все темы</option>${groups.map(g=>`<option ${g===group?'selected':''}>${escape(g)}</option>`).join('')}</select></label><label>Показывать<select id="attCoverage"><option value="all">Все вопросы</option><option value="gaps" ${coverage==='gaps'?'selected':''}>Требуют уточнения</option></select></label></div><p id="attCount" class="att-caption" role="status"></p><div id="attList"></div>`);
    updateList();
  }
  function updateList(){
    const term=search.trim().toLocaleLowerCase('ru'),number=/^\d+$/.test(term)?Number(term):null;
    const found=questions.filter(q=>(group==='all'||q.group===group)&&(coverage==='all'||q.status!=='ready')&&(!term||(number!==null?q.id===number:`${q.title} ${q.question} ${q.answer} ${(q.externalStudy||[]).map(b=>b.text||[b.lead,...b.items].join(' ')).join(' ')}`.toLocaleLowerCase('ru').includes(term))));
    host.querySelector('#attCount').textContent=`${found.length} из 54 вопросов`;
    host.querySelector('#attList').innerHTML=groups.map(g=>{const entries=found.filter(q=>q.group===g);return entries.length?`<section class="att-section"><h2>${escape(g)}</h2><ol class="att-question-list">${entries.map(q=>`<li><a href="#attestation/question/${q.id}"><span class="att-number">${q.id}.</span><span>${escape(q.title)}${badge(q)}</span>${icon('chevron')}</a></li>`).join('')}</ol></section>`:''}).join('')||'<p class="empty">Ничего не найдено. Измените запрос или выберите все темы.</p>';
  }
  function emphasize(text){
    const match=text.match(/^(.{1,28}?)( — |: )/);
    return match?`<strong>${escape(match[1])}</strong>${escape(text.slice(match[1].length))}`:escape(text);
  }
  function studyMarkup(q,blocks=q.study||[{type:'paragraph',text:q.answer}]){
    return blocks.map(block=>{
      const heading=block.label?`<h3>${escape(block.label)}</h3>`:'';
      if(block.type==='paragraph')return `<div class="att-answer-block">${heading}<p>${emphasize(block.text)}</p></div>`;
      const numbered=block.items.every(s=>/^\d+\. /.test(s)),tag=block.ordered||numbered?'ol':'ul';
      return `<div class="att-answer-block">${heading}${block.lead?`<p>${emphasize(block.lead)}</p>`:''}<${tag}>${block.items.map(s=>`<li>${emphasize(numbered?s.replace(/^\d+\. /,''):s)}</li>`).join('')}</${tag}></div>`;
    }).join('');
  }
  function sourceMarkup(id,q){
    const source=data.sources[id],link=`#material/${source.materialId}?page=${source.page}&source=${id}&from=attestation/question/${q.id}`;
    return `<section class="att-source"><h4>${escape(source.section)}</h4><blockquote>${escape(source.quote)}</blockquote><a class="att-source-link" href="${link}">${icon('document')}Открыть страницу ${source.page}${icon('forward')}</a></section>`;
  }
  function sourcesMarkup(q){
    const docs=new Map();for(const id of q.sources){const s=data.sources[id];if(!docs.has(s.materialId))docs.set(s.materialId,[]);docs.get(s.materialId).push(id)}
    return [...docs.values()].map(ids=>`<section class="att-source-document"><h3>${escape(data.sources[ids[0]].title)}</h3><p class="att-caption">${escape(data.sources[ids[0]].course)}</p>${ids.map(id=>sourceMarkup(id,q)).join('')}</section>`).join('');
  }
  function externalSourcesMarkup(q){
    if(!q.externalSources?.length)return '';
    return `<section class="att-external-sources"><h3>Внешние источники</h3><p class="att-caption">Материалы вне курса. Ссылки открываются в новой вкладке.</p>${q.externalSources.map(s=>`<section class="att-source"><h4>${escape(s.title)}</h4><p class="att-caption">${escape(s.author)}<br>${escape(s.location)}</p><p>${escape(s.description)}</p><a class="att-source-link" href="${escape(s.url)}" target="_blank" rel="noopener noreferrer" aria-label="Открыть внешний источник: ${escape(s.title)} (новая вкладка)">Открыть источник ↗</a></section>`).join('')}</section>`;
  }
  function evidenceMarkup(q){
    const external=!!q.externalSources?.length;
    const course=`${external?'<h3 class="att-evidence-label">Материалы курса</h3>':''}<p class="att-caption">${q.courseSourceNote?escape(q.courseSourceNote):q.status==='missing'?escape(q.note):'Ниже — дословные цитаты из курса.'} Ссылки открывают нужную страницу и выделяют фрагмент.</p>${sourcesMarkup(q)}`;
    return `<details class="att-disclosure att-evidence" data-fold="sources"><summary>${q.status==='missing'?'Связанный материал':'Цитаты и источники'} <span>${external?'курс и внешние':`${q.sources.length} ${q.sources.length===1?'фрагмент':q.sources.length<5?'фрагмента':'фрагментов'}`}</span></summary>${externalSourcesMarkup(q)}${course}</details>`;
  }
  function optionsMarkup(q,order,selected){
    const checked=selected!==undefined;
    return `<fieldset><legend>${escape(q.quiz.prompt)}</legend><div class="att-options">${order.map(choice=>`<label class="att-option ${checked?(choice===q.quiz.correct?'is-correct':choice===selected?'is-wrong':''):''}"><input type="radio" name="answer" value="${choice}" ${selected===choice?'checked':''} ${checked?'disabled':''}><span>${escape(q.quiz.options[choice])}${checked&&choice===q.quiz.correct?'<small>Правильный ответ</small>':checked&&choice===selected?'<small>Ваш ответ</small>':''}</span></label>`).join('')}</div></fieldset>${checked?'':'<button type="submit" class="att-primary" data-check disabled>Проверить</button>'}`;
  }
  function inlineMarkup(q){
    if(!inlineChecks.has(q.id))inlineChecks.set(q.id,{order:shuffled([0,1,2,3])});
    const state=inlineChecks.get(q.id),checked=state.selected!==undefined;
    return `<form id="inlineQuiz" data-question="${q.id}">${optionsMarkup(q,state.order,state.selected)}</form>${checked?`<p id="inlineFeedback" class="att-inline-feedback ${state.selected===q.quiz.correct?'is-correct':'is-wrong'}" role="status" tabindex="-1"><strong>${state.selected===q.quiz.correct?'Да, верно.':'Нет, неверно.'}</strong>${state.selected===q.quiz.correct?'':` Правильный ответ: ${escape(q.quiz.options[q.quiz.correct])}.`}</p>`:''}`;
  }
  function answer(id){
    const q=byId.get(Number(id));if(!q){location.hash='attestation/answers';return}
    lastQuestion=q.id;try{localStorage.setItem(readingKey,String(lastQuestion))}catch{}
    host.innerHTML=frame(escape(q.question),`<p class="att-caption att-question-meta">Вопрос ${q.id} из 54 · ${escape(q.group)} ${badge(q)}</p>
      ${run?.ids.includes(q.id)?`<a class="att-back-to-test" href="#attestation/test/run">${icon('back')}${run.index>=run.ids.length?'К результату тренировки':'Вернуться к тренировке'}</a>`:''}
      <section class="att-study"><div class="att-answer-heading"><h2>${q.status==='missing'?'Что есть в материалах':'План ответа'}</h2>${q.status==='missing'?'':`<button class="att-text-button" id="toggleAnswer" aria-expanded="${!recall}" aria-controls="studyAnswer">${recall?'Показать ответ':'Скрыть ответ'}</button>`}</div>
      ${q.status==='partial'?`<p class="att-note">${escape(q.note)}</p>`:''}
      <div id="studyAnswer" class="att-answer" ${recall&&q.status!=='missing'?'hidden':''}>${q.answerBasis==='external'?`<p class="att-caption">Ответ по внешнему источнику · ${escape(q.externalSources[0].author)}</p>`:''}${studyMarkup(q)}${q.externalStudy?.length?`<section class="att-external-answer"><h3>Дополнение из внешних источников</h3>${studyMarkup(q,q.externalStudy)}</section>`:''}${q.note&&q.status==='ready'?`<p class="att-note">${escape(q.note)}</p>`:''}</div>
      <p id="recallPrompt" class="att-caption" ${recall&&q.status!=='missing'?'':'hidden'}>Ответьте вслух, затем откройте план и сравните.</p></section>
      ${q.quiz?`<details class="att-disclosure att-topic-check" data-fold="topic-check"><summary>Проверить себя <span>1 вопрос</span></summary><div id="topicQuizContent">${inlineMarkup(q)}</div></details>`:''}
      <nav class="att-pagination" aria-label="Вопросы аттестации">${q.id>1?`<a href="#attestation/question/${q.id-1}">${icon('back')}Предыдущий</a>`:'<span></span>'}${q.id<54?`<a href="#attestation/question/${q.id+1}">Следующий${icon('forward')}</a>`:'<a href="#attestation/answers">Все вопросы</a>'}</nav>
      ${evidenceMarkup(q)}`,'attestation/answers','Все вопросы');
  }
  function testStart(params){
    const target=byId.get(Number(params.get('question'))),single=!!target?.quiz;
    host.innerHTML=frame('Тренировка',`<p class="att-lead">Выберите один из четырёх ответов и сразу проверьте себя.</p>
      ${run?`<div class="att-resume"><a class="att-primary" href="#attestation/test/run">${run.index>=run.ids.length?'Результат последней попытки':'Продолжить тренировку'} ${icon('forward')}</a><p class="att-caption">Проверено ${Object.keys(run.answers).length} из ${run.ids.length}</p></div>`:''}
      <form id="testSetup" class="att-setup">${run?'<h2>Новая попытка</h2>':''}<label>Тема<select name="topic"><option value="all">Все темы</option>${groups.map(g=>`<option value="${escape(g)}">${escape(g)}</option>`).join('')}${single?`<option value="q${target.id}" selected>${target.id}. ${escape(target.title)}</option>`:''}</select></label><label>Объём<select name="count"><option value="10">${single?'1 вопрос':'10 вопросов'}</option><option value="all">Все по выбранной теме</option></select></label><button class="${run?'att-secondary':'att-primary'}" type="submit">${run?'Начать заново':'Начать тренировку'} ${icon('forward')}</button>${run?'<p class="att-caption">Новая попытка заменит сохранённую.</p>':''}</form>
      <details class="att-disclosure" data-fold="test-info"><summary>О тренировке</summary><p>53 учебных вопроса по ключевым понятиям курса. Ответ о драйверах дополнен внешним источником и доступен для изучения; в тренировку он не включён. Вопросы № 14 и № 21 проверяют подтверждённые понятия курса, а не версии, требующие уточнения.</p><p class="att-caption">Это не официальный экзамен. Вопросы и варианты перемешиваются. Попытка сохраняется в этом браузере.</p></details>`);
  }
  function score(){return run.ids.filter(id=>run.answers[id]===byId.get(id).quiz.correct).length}
  function testRun(){
    if(!run){location.hash='attestation/test';return}
    if(run.index>=run.ids.length){testResult();return}
    const id=run.ids[run.index],q=byId.get(id),selected=run.answers[id],checked=selected!==undefined;
    host.innerHTML=frame('Тренировка',`<div class="att-test-meta"><span>Вопрос ${run.index+1} из ${run.ids.length}</span><span>Верно: ${score()}</span></div><progress class="att-progress" value="${Object.keys(run.answers).length}" max="${run.ids.length}" aria-label="Проверенные вопросы"></progress>
      <form id="quizForm">${optionsMarkup(q,run.orders[id],selected)}</form><div id="quizFeedback" ${checked?'':'hidden'} role="status" tabindex="-1">${checked?feedback(q,selected):''}</div><p id="practiceNotice" class="att-caption" role="status"></p>`,'attestation/test','К тренировке');
  }
  function feedback(q,selected){const right=selected===q.quiz.correct;return `<div class="att-feedback ${right?'is-correct':'is-wrong'}"><h2>${right?'Да, верно':'Нет, неверно'}</h2>${!right?`<p>Правильный ответ: <strong>${escape(q.quiz.options[q.quiz.correct])}</strong></p>`:''}</div><button class="att-primary" id="nextQuestion">${run.index===run.ids.length-1?'Посмотреть результат':'Следующий вопрос'} ${icon('forward')}</button><div class="att-feedback-more"><a href="#attestation/question/${q.id}">Разобрать тему и источники ${icon('forward')}</a><details data-fold="explanation"><summary>Пояснение</summary><p>${escape(q.answer)}</p></details></div>`}
  function testResult(){
    const wrong=run.ids.filter(id=>run.answers[id]!==byId.get(id).quiz.correct);
    host.innerHTML=frame('Результат тренировки',`<p class="att-result">${score()} <span>из ${run.ids.length} верно</span></p><p>${wrong.length?'Повторите вопросы, которые вызвали затруднения.':'Все ответы верны. Можно перейти к другим темам.'}</p><div class="att-actions">${wrong.length?'<button class="att-primary" id="retryWrong">Повторить ошибки</button>':''}<a class="${wrong.length?'att-secondary':'att-primary'}" href="#attestation/test">Новая тренировка</a></div>
      ${wrong.length?`<section class="att-section"><h2>Что повторить</h2><ul class="att-result-list">${wrong.map(id=>`<li><a href="#attestation/question/${id}">${id}. ${escape(byId.get(id).title)}</a></li>`).join('')}</ul></section>`:''}`);
  }
  function focusTop(){host.querySelector('#attTitle')?.focus({preventScroll:true});window.scrollTo(0,0)}
  function start(ids){run={version:data.version,ids:shuffled(ids),index:0,answers:{},orders:Object.fromEntries(ids.map(id=>[id,shuffled([0,1,2,3])]))};views.delete('attestation/test/run');save();if(location.hash==='#attestation/test/run'){testRun();focusTop()}else location.hash='attestation/test/run'}
  host.addEventListener('input',e=>{if(e.target.id==='attQuery'){search=e.target.value;updateList()}if(e.target.name==='answer'){const button=e.target.form?.querySelector('[data-check]');if(button)button.disabled=false}});
  host.addEventListener('change',e=>{if(e.target.id==='attGroup'){group=e.target.value;updateList()}if(e.target.id==='attCoverage'){coverage=e.target.value;updateList()}if(e.target.name==='topic'){const count=host.querySelector('[name=count] option[value="10"]');if(count)count.textContent=e.target.value.startsWith('q')?'1 вопрос':'10 вопросов'}});
  host.addEventListener('submit',e=>{
    e.preventDefault();
    if(e.target.id==='testSetup'){
      const values=new FormData(e.target),topic=values.get('topic'),count=values.get('count');
      const pool=questions.filter(q=>q.quiz&&(topic==='all'||topic===q.group||topic==='q'+q.id)).map(q=>q.id);
      start(shuffled(pool).slice(0,count==='all'?pool.length:Number(count)));
    }
    if(e.target.id==='quizForm'){
      const choice=new FormData(e.target).get('answer');if(choice===null)return;
      const id=run.ids[run.index];if(run.answers[id]!==undefined)return;
      run.answers[id]=Number(choice);testRun();save();host.querySelector('#quizFeedback').focus({preventScroll:true});host.querySelector('#quizFeedback').scrollIntoView({block:'nearest'});
    }
    if(e.target.id==='inlineQuiz'){
      const q=byId.get(Number(e.target.dataset.question)),choice=new FormData(e.target).get('answer'),state=inlineChecks.get(q.id);if(choice===null||state.selected!==undefined)return;
      state.selected=Number(choice);host.querySelector('#topicQuizContent').innerHTML=inlineMarkup(q);host.querySelector('#inlineFeedback').focus({preventScroll:true});host.querySelector('#inlineFeedback').scrollIntoView({block:'nearest'});
    }
  });
  host.addEventListener('click',e=>{
    if(e.target.closest('#nextQuestion')){run.index++;save();views.delete('attestation/test/run');testRun();focusTop()}
    if(e.target.closest('#retryWrong'))start(run.ids.filter(id=>run.answers[id]!==byId.get(id).quiz.correct));
    if(e.target.closest('#toggleAnswer')){recall=!recall;host.querySelector('#studyAnswer').hidden=recall;host.querySelector('#recallPrompt').hidden=!recall;const b=host.querySelector('#toggleAnswer');b.textContent=recall?'Показать ответ':'Скрыть ответ';b.setAttribute('aria-expanded',String(!recall));if(recall)host.querySelector('[data-fold="sources"]').open=false}
  });
  function render(hash){
    currentRoute=hash;const [path,query]=hash.split('?'),params=new URLSearchParams(query||'');document.title='Аттестация — Мой курс';
    if(path==='attestation/answers')listing();else if(/^attestation\/question\/\d+$/.test(path))answer(path.split('/')[2]);else if(path==='attestation/test/run')testRun();else if(path==='attestation/test')testStart(params);else overview();
    const view=views.get(hash);
    if(view){for(const el of host.querySelectorAll('details[data-fold]'))el.open=view.open.includes(el.dataset.fold);const target=[...host.querySelectorAll('a[href]')].find(a=>a.getAttribute('href')===view.focus);(target||host.querySelector('#attTitle'))?.focus({preventScroll:true});requestAnimationFrame(()=>window.scrollTo(0,view.scroll))}
    else focusTop();
  }
  return {render,captureView};
})();
