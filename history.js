'use strict';
// Local exploration rounds. A new round keeps the earlier dated record intact.
const HISTORY_KEY=KEY+'-history-v1';
let rounds=[];
const roundId=()=>Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,11);
function ensureRound(){if(!s.profileId)s.profileId='student-'+roundId();if(!s.roundId)s.roundId='round-'+roundId();}
function cleanText(value,max=1000){return typeof value==='string'?value.slice(0,max):'';}
function cleanRecord(raw){
  if(!raw||raw.version!==2||typeof raw!=='object'||Array.isArray(raw))throw Error('不支援這份作答檔案。');
  const record=fresh();
  record.name=cleanText(raw.name,40);record.source=cleanText(raw.source,300);record.teacherNote=cleanText(raw.teacherNote,1500);
  record.created=/^\d{4}-\d{2}-\d{2}$/.test(raw.created||'')?raw.created:today();
  record.profileId=cleanText(raw.profileId,100)||'student-'+roundId();record.roundId=cleanText(raw.roundId,100)||'round-'+roundId();
  record.parentRoundId=cleanText(raw.parentRoundId,100);record.savedAt=cleanText(raw.savedAt,40);
  const answers=raw.answers&&typeof raw.answers==='object'?raw.answers:{};
  for(const v of VALUES)if(['yes','no','unsure'].includes(answers[v.id]))record.answers[v.id]=answers[v.id];
  const ids=(input,valid,max)=>[...new Set((Array.isArray(input)?input:[]).filter(id=>Number.isInteger(id)&&valid(id)))].slice(0,max);
  record.priorities=ids(raw.priorities,id=>valueById(id)&&record.answers[id]==='yes',3);
  record.jobs=ids(raw.jobs,id=>jobById(id),6);record.ranked=ids(raw.ranked,id=>record.jobs.includes(id),3);
  for(const id of record.jobs){const reason=raw.reasons?.[id];if(REASONS.includes(reason))record.reasons[id]=reason;}
  for(const v of VALUES)if(typeof raw.conditions?.[v.id]==='string')record.conditions[v.id]=cleanText(raw.conditions[v.id],500);
  record.questions=ids(raw.questions,i=>i>=0&&i<QUESTIONS.length,QUESTIONS.length);
  record.task=TASKS.some(t=>t.id===raw.task)?raw.task:'';record.taskJobId=jobById(Number(raw.taskJobId))?String(raw.taskJobId):'';
  record.taskDetail=cleanText(raw.taskDetail,1000);record.reviewDate=/^\d{4}-\d{2}-\d{2}$/.test(raw.reviewDate||'')?raw.reviewDate:'';
  for(const key of ['enjoy','difficulty','support','next'])record.observations[key]=cleanText(raw.observations?.[key],1000);
  record.cursor=Math.max(0,Math.min(VALUES.length,Number(raw.cursor)||0));record.reviewMode=!!raw.reviewMode;
  record.reviewFilter=['all','yes','no','unsure','unanswered'].includes(raw.reviewFilter)?raw.reviewFilter:'all';
  record.stage=['home','values','priority','jobs','plan','report','history'].includes(raw.stage)?raw.stage:'home';
  return record;
}
try{const saved=JSON.parse(localStorage.getItem(HISTORY_KEY)||'[]');if(Array.isArray(saved))rounds=saved.slice(0,100).map(cleanRecord);}catch{rounds=[];}
ensureRound();
function hasAnswers(record=s){return Object.keys(record.answers||{}).length>0||(record.jobs||[]).length>0||!!record.task||!!record.taskDetail;}
function writeRounds(next){try{localStorage.setItem(HISTORY_KEY,JSON.stringify(next));rounds=next;return true;}catch{notify('這個瀏覽器目前無法保存歷程，請先下載作答備份。');return false;}}
function rememberCurrent(){
  ensureRound();if(!hasAnswers())return true;
  const copy=cleanRecord({...s,savedAt:new Date().toISOString()});
  const existing=rounds.findIndex(r=>r.roundId===s.roundId);
  if(existing<0&&rounds.length>=100){notify('目前已保留 100 份紀錄，請先下載備份，再整理紀錄。');return false;}
  const next=rounds.filter(r=>r.roundId!==copy.roundId);next.unshift(copy);return writeRounds(next);
}
function startLaterRound(mode){
  ensureRound();const before=cleanRecord(s);if(!rememberCurrent())return;
  if(mode==='values')s={...fresh(),name:before.name,source:before.source,profileId:before.profileId};
  else s={...before,questions:[],task:'',taskJobId:'',taskDetail:'',reviewDate:'',observations:fresh().observations,teacherNote:''};
  s.roundId='round-'+roundId();s.parentRoundId=before.roundId;s.created=today();s.savedAt='';s.stage=mode==='values'?'values':'jobs';
  if(mode==='values')s.cursor=0;
  $('studentName').value=s.name;query='';category='';save();render();$('main').focus({preventScroll:true});window.scrollTo({top:0,behavior:'smooth'});
  notify('上次紀錄已保留，現在填的是這次的新紀錄。');
}
function loadRound(id){
  const found=rounds.find(r=>r.roundId===id);if(!found)return;
  const target=cleanRecord(found);
  if(s.roundId!==id&&!rememberCurrent())return;
  s=target;$('studentName').value=s.name;query='';category='';go('plan');notify('已載入這份紀錄，可回各步驟修改。');
}
function backupPayload(){ensureRound();return {format:'career-exploration-backup',version:1,exportedAt:new Date().toISOString(),current:cleanRecord(s),records:rounds.map(cleanRecord)};}
function exportBackup(){download(new Blob([JSON.stringify(backupPayload(),null,2)],{type:'application/json;charset=utf-8'}),`生涯探索_作答備份_${today()}.json`);}
function parseBackup(raw){
  if(!raw||raw.format!=='career-exploration-backup'||raw.version!==1||!Array.isArray(raw.records)||raw.records.length>100)throw Error('請選擇「下載作答備份」產生的檔案。');
  return {current:cleanRecord(raw.current),records:raw.records.map(cleanRecord)};
}
function importBackup(data){
  if(!rememberCurrent())return false;
  const byId=new Map(rounds.map(r=>[r.roundId,r]));
  for(const record of data.records){const local=byId.get(record.roundId);if(!local||(record.savedAt||'')>=(local.savedAt||''))byId.set(record.roundId,record);}
  if(byId.size>100){notify('合併後超過 100 份紀錄，請先整理備份；目前紀錄沒有被取代。');return false;}
  if(!writeRounds([...byId.values()]))return false;
  s=cleanRecord(data.current);$('studentName').value=s.name;query='';category='';go('history');notify('已載入作答備份，可以繼續修改或新增本次探索。');return true;
}
function revisitPanel(){return `<section class="panel revisit-panel"><div><span class="section-label">RETURN AFTER A WHILE</span><h3>隔一段時間，想法變了？</h3><p class="muted">先保留上次，再開始這次的探索。可以沿用價值卡，只調整想了解的工作；也可以重新看看自己在乎什麼。</p></div><div class="revisit-actions"><button class="primary-action" id="repeatJobs">保留上次，重新選工作 →</button><button class="secondary-action" id="repeatValues">保留上次，重新看價值卡 →</button></div><p class="context-note">本次任務與探索後的觀察會留白，避免把上次經驗當成這次結果。上次的完整內容仍可在歷程查看。</p></section>`;}
function backupTools(){return `<section class="panel backup-panel"><div><h3>把作答帶到幾個月後</h3><p class="muted">紀錄保存在這個瀏覽器。請下載「作答備份」自行保管；換裝置或之後再回來，都能載入繼續。報告圖片與文字不能用來還原作答。</p></div><div class="action-row"><button class="secondary-action" id="exportBackup">下載作答備份</button><label class="file-action">載入作答備份<input id="importBackup" type="file" accept=".json,application/json"></label></div><p id="importStatus" class="context-note" role="status"></p></section>`;}
function bindHistoryTools(){
  bind('repeatJobs',()=>startLaterRound('jobs'));bind('repeatValues',()=>startLaterRound('values'));bind('exportBackup',exportBackup);
  bind('saveRound',()=>{if(rememberCurrent()){renderHistory();notify('目前紀錄已保留。');}});
  buttons('[data-load-round]',button=>loadRound(button.dataset.loadRound));
  $('importBackup')?.addEventListener('change',async event=>{
    const file=event.target.files?.[0];if(!file)return;
    try{if(file.size>2000000)throw Error('檔案過大，請選擇這個工具產生的作答備份。');const pending=parseBackup(JSON.parse(await file.text()));
      pendingBackup=pending;$('backupImportName').textContent=pending.current.name||'未填暱稱的隊員';$('backupImportDialog').showModal();
    }catch(error){$('importStatus').textContent=error.message==='Unexpected end of JSON input'?'檔案不完整，請重新選擇作答備份。':(error instanceof SyntaxError?'檔案格式不正確，請選擇作答備份。':error.message);}
    event.target.value='';
  });
}
const ANSWER_LABELS={yes:'在乎',no:'目前還好',unsure:'還不確定'};
function compareRounds(before,now){
  const comparable=VALUES.filter(v=>before.answers[v.id]&&now.answers[v.id]).length;
  const changed=VALUES.filter(v=>before.answers[v.id]&&now.answers[v.id]&&before.answers[v.id]!==now.answers[v.id]);
  const pending=VALUES.filter(v=>before.answers[v.id]&&!now.answers[v.id]).length;
  const oldRank=before.ranked.map(title).join(' → ')||'尚未排序';
  const newRank=now.ranked.map(title).join(' → ')||'本次尚未排序';
  return `<div class="round-comparison"><h4>和目前這次（${esc(now.created)}）比較</h4><p>價值卡：${changed.length?`已有作答的卡片中，${changed.length} 張選擇不同。`:comparable?'兩次都有回答的價值卡，目前選擇相同。':'本次尚無可和上次對照的作答。'}${pending?`本次有 ${pending} 張尚未回答，先不比較。`:''}</p>${changed.length?`<ul>${changed.map(v=>`<li>${esc(v.name)}：${ANSWER_LABELS[before.answers[v.id]]} → ${ANSWER_LABELS[now.answers[v.id]]}</li>`).join('')}</ul>`:''}<p><b>上次探索順序：</b>${esc(oldRank)}</p><p><b>目前探索順序：</b>${esc(newRank)}</p><small>這裡只記錄選擇的變化，不評分，也不判定進步或退步。</small></div>`;
}
function renderHistory(){
  ensureRound();document.querySelectorAll('[data-stage]').forEach(b=>{const active=b.dataset.stage==='history';b.classList.toggle('active',active);b.setAttribute('aria-current',active?'step':'false');});
  const mine=rounds.filter(r=>r.profileId===s.profileId).sort((a,b)=>(b.savedAt||'').localeCompare(a.savedAt||''));
  $('main').innerHTML=head('EXPLORATION OVER TIME','我的探索歷程','當時想做的工作和現在不一樣，也值得留下來。修改當次答案，和隔一段時間重新探索，可以分開記錄。')+`<div class="panel current-round"><div><span class="section-label">CURRENT ROUND</span><h3>${esc(s.name||'未填暱稱的隊員')} · ${esc(s.created)}</h3><p class="muted">目前作答：${Object.keys(s.answers).length} 張價值卡、${s.jobs.length} 個好奇的工作。</p></div><div class="action-row"><button id="continueRound" class="secondary-action">繼續修改目前這份</button><button id="saveRound" class="primary-action">保留目前紀錄</button></div></div>${revisitPanel()}<section class="history-list"><h3>這位隊員保留的紀錄 <span>${mine.length} 份</span></h3>${mine.map(r=>`<article class="panel saved-round"><div class="saved-round-head"><div><span class="section-label">${esc(r.created)}</span><h3>${esc(r.name||'未填暱稱的隊員')}${r.roundId===s.roundId?' · 目前這份':''}</h3></div><button class="secondary-action" data-load-round="${esc(r.roundId)}">載入這份繼續修改</button></div><p class="muted">當時在乎：${esc(VALUES.filter(v=>r.answers[v.id]==='yes').map(v=>v.name).join('、')||'尚未選擇')}</p><p>當時想探索：${esc(r.ranked.map(title).join(' → ')||'尚未排序')}</p>${r.roundId!==s.roundId?compareRounds(r,s):'<p class="context-note">這是目前這一份作答所保留的紀錄。</p>'}</article>`).join('')||'<div class="empty-state">還沒有保留紀錄。可以先按「保留目前紀錄」，或開始一次新的探索；系統會先保留目前作答。</div>'}</section>${backupTools()}${rounds.some(r=>r.profileId!==s.profileId)?`<details class="teacher-panel"><summary>這個瀏覽器中其他隊員的紀錄</summary><p>請確認暱稱與日期，再載入要繼續的紀錄。</p><div class="other-records">${rounds.filter(r=>r.profileId!==s.profileId).map(r=>`<button class="secondary-action" data-load-round="${esc(r.roundId)}">${esc(r.name||'未填暱稱')} · ${esc(r.created)}</button>`).join('')}</div></details>`:''}`;
  bind('continueRound',()=>go('plan'));bindHistoryTools();
}
const baseRenderHome=renderHome;
renderHome=function(){baseRenderHome();ensureRound();$('main').insertAdjacentHTML('beforeend',revisitPanel()+`<div class="action-row"><button id="historyHome" class="secondary-action">查看過往紀錄／下載作答備份 →</button></div>`);bind('historyHome',()=>go('history'));bindHistoryTools();};
const baseRender=render;
render=function(){ensureRound();if(s.stage==='history')renderHistory();else baseRender();};
window.careerHistory={beforeReset:rememberCurrent};
document.querySelector('.stage-nav').insertAdjacentHTML('beforeend','<button class="stage-pill" data-stage="history" id="openHistory">探索歷程</button>');
bind('openHistory',()=>go('history'));
document.body.insertAdjacentHTML('beforeend',`<dialog id="backupImportDialog"><h2>載入這份作答備份？</h2><p>隊員：<b id="backupImportName"></b></p><p>目前作答會先保留到歷程，再載入備份中的作答。</p><div class="action-row"><button class="secondary-action" id="cancelBackupImport">先不要</button><button class="primary-action" id="confirmBackupImport">載入並繼續</button></div></dialog>`);
let pendingBackup=null;
bind('cancelBackupImport',()=>{pendingBackup=null;$('backupImportDialog').close();});
bind('confirmBackupImport',()=>{if(pendingBackup&&importBackup(pendingBackup)){pendingBackup=null;$('backupImportDialog').close();}});
save();render();
