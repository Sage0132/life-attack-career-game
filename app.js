const careerValuesData = window.careerValuesData || [];
const rawCareerJobsData = window.careerJobsData || [];

const ATTR = {
  comfort: { label: '安穩舒適', color: '#00F5D4', title: '躺平界的一級特攻' },
  relationship: { label: '人際情感', color: '#FF007F', title: '靈魂社交終結者' },
  expression: { label: '獨特自我', color: '#7B2CBF', title: '不按牌理出牌的自我玩家' },
  achievement: { label: '挑戰成就', color: '#FF6B00', title: '正面突破的熱血輸出' }
};

const BASELINE_JOB_IDS = [1, 2, 3, 19, 25, 27, 42, 46, 47, 84];
const DEFAULT_VALUE_IDS = [40, 36, 24, 14, 35];
const VALUE_FINAL_LIMIT = 10;
const GRID_PAGE_SIZE = 12;
const GRID_PICK_LIMIT = 3;

const state = {
  valueIndex: 0,
  valueDeck: [],
  wantedValueIds: new Set(),
  refiningValues: false,
  scores: { comfort: 0, relationship: 0, expression: 0, achievement: 0 },
  chosenValueIds: new Set(),
  maxCategory: 'comfort',
  filteredJobs: [],
  selectionPages: [[], []],
  selectionPage: 0,
  selectedGridJobs: [],
  selectedTopJobs: [],
  jobSearchOpen: false,
  jobSearchQuery: '',
  likedJobs: [],
  rankedJobs: [null, null, null]
};

const $ = id => document.getElementById(id);

const today = new Date().toLocaleDateString('zh-TW', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});
$('todayText').textContent = today;
$('reportDate').textContent = today;
$('basicDate').textContent = today;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function normalizeStrategy(strategySkill) {
  if (typeof strategySkill === 'string') {
    const match = strategySkill.match(/^(.+?)[（(](.+)[）)]$/);
    const gameName = match ? match[1] : strategySkill;
    return {
      gameName,
      iepName: gameName,
      description: match ? match[2] : strategySkill,
      fullText: strategySkill
    };
  }

  return {
    gameName: strategySkill?.gameName || '待補特攻技能',
    iepName: strategySkill?.iepName || strategySkill?.gameName || '待補正式特教策略',
    description: strategySkill?.description || '此職業的 richValueId 與 strategySkill 尚未匯入。',
    fullText: strategySkill?.fullText
  };
}

function inferJobCategory(job) {
  if (job.category && ATTR[job.category]) return job.category;
  const text = `${job.title || job.name || ''} ${job.majorCategory || ''} ${job.minorCategory || ''}`;
  if (/設計|美術|插畫|藝術|表演|傳播|節目|主持|影像|時尚|美容|造型|攝影|文案|網站|網頁|調酒|廚|餐/.test(text)) return 'expression';
  if (/教育|社心|客服|服務|護理|醫|藥|牙|導遊|銷售|店|社工|照顧|人群|諮商|宗教|公益|慈善|獸醫|動物/.test(text)) return 'relationship';
  if (/農|林|漁|牧|生產|製造|維修|基層|行政|登錄|資料|倉儲|清潔|保全|駕駛|水手|作業|操作|宅配|郵務|貨運/.test(text)) return 'comfort';
  if (/研究|科學|工程|法律|政治|財經|管理|飛航|警|消防|軍|運動|創業|主管|分析/.test(text)) return 'achievement';
  return 'unclassified';
}

function normalizeJob(job) {
  const category = inferJobCategory(job);
  return {
    ...job,
    title: job.title || job.name,
    name: job.name || job.title,
    category,
    displayCategory: category === 'unclassified' ? '未分類盲盒' : ATTR[category].label,
    richValueId: Array.isArray(job.richValueId) ? job.richValueId : [],
    strategySkill: normalizeStrategy(job.strategySkill)
  };
}

const careerJobsData = rawCareerJobsData.map(normalizeJob);

function getCleanStrategySkill(job) {
  const fallbackByCategory = {
    comfort: {
      gameName: '標準化工作記憶檢核策略',
      iepName: '標準化工作記憶檢核策略',
      description: '利用視覺提示與 SOP 拆解，協助學生在常態勞動中維持視覺專注，降低分心風險'
    },
    relationship: {
      gameName: '人際邊界綠燈指令與同理心溝通劇本',
      iepName: '人際邊界綠燈指令與同理心溝通劇本',
      description: '建立心理防護罩，運用結構化社交退場機制應對職場人際摩擦'
    },
    expression: {
      gameName: '零起點靈感加工與視覺化心智圖',
      iepName: '零起點靈感加工與視覺化心智圖',
      description: '利用微調模仿策略與數位輔具，降低從零發想的挫折感，將創意落實為實體計畫'
    },
    achievement: {
      gameName: '後設認知與自我對話策略',
      iepName: '後設認知與自我對話策略',
      description: '訓練學生在高壓或多工作業環境下，運用內部語言自我調節情緒，建立耐挫力'
    },
    unclassified: {
      gameName: '通用學習設計（UDL）工作檢核表',
      iepName: '通用學習設計（UDL）工作檢核表',
      description: '利用圖像化步驟與微型目標拆解，降低工作記憶負擔'
    }
  };

  const clean = normalizeStrategy(job?.strategySkill);
  const combined = `${clean.gameName}${clean.iepName}${clean.description}`;
  if (!combined.trim() || combined.includes('待補')) {
    return fallbackByCategory[job?.category] || fallbackByCategory.unclassified;
  }
  return clean;
}

function getTeacherStrategyText(job) {
  const strategy = getCleanStrategySkill(job);
  return strategy.fullText || `${strategy.gameName}（${strategy.description}）`;
}

function jobMark(job) {
  const marks = { comfort: '安', relationship: '情', expression: '我', achievement: '戰', unclassified: '盲' };
  return marks[job?.category] || '職';
}

function formatJobTitle(title) {
  const safeTitle = String(title || '');
  const parts = safeTitle.split(/[／/]/).map(part => part.trim()).filter(Boolean);
  if (parts.length < 2) return escapeHtml(safeTitle);
  return parts.map(part => `<span>${escapeHtml(part)}</span>`).join('<i>／</i>');
}

function chunkTitle(title) {
  const safeTitle = String(title || '').trim();
  if (/[／/]/.test(safeTitle)) return formatJobTitle(safeTitle);
  if (safeTitle.length <= 9) return escapeHtml(safeTitle);

  const suffixes = ['工作人員', '操作員', '處理人員', '登錄人員', '客服人員'];
  const suffix = suffixes.find(item => safeTitle.endsWith(item));
  const body = suffix ? safeTitle.slice(0, -suffix.length) : safeTitle;
  const chunks = [];
  for (let index = 0; index < body.length; index += 5) chunks.push(body.slice(index, index + 5));
  if (suffix) chunks.push(suffix);
  return chunks.map(part => `<span>${escapeHtml(part)}</span>`).join('');
}

function shuffle(items) {
  return [...items].sort(() => 0.5 - Math.random());
}

function addUnique(target, candidates, limit) {
  for (const item of candidates) {
    if (target.length >= limit) break;
    if (!target.some(existing => existing.id === item.id)) target.push(item);
  }
}

function topAttr() {
  return Object.keys(state.scores).sort((a, b) => state.scores[b] - state.scores[a])[0];
}

function chosenValueTotal() {
  return Math.max(state.chosenValueIds.size, 1);
}

function recomputeScoresFromChosenValues() {
  state.scores = { comfort: 0, relationship: 0, expression: 0, achievement: 0 };
  careerValuesData.forEach(value => {
    if (state.chosenValueIds.has(value.id) && ATTR[value.category]) {
      state.scores[value.category] += 1;
    }
  });
}

function getMemeText(id, originalName) {
  const memeMap = {
    1: '誓死捍衛正義',
    10: '內心平靜如老僧入定',
    11: '追求瘋狂的大冒險',
    12: '誰都別想管我的自由',
    14: '毫無後顧之憂的安全感',
    23: '享受孤獨的精緻邊緣人',
    24: '平凡單純的溫馨小日子',
    27: '進入靈魂登出的躺平狀態',
    28: '只做我瘋狂熱愛的事',
    35: '戶頭數字夠用就好了',
    36: '穩到不行的鐵飯碗',
    38: '變成暴發戶賺大錢'
  };
  return memeMap[id] || originalName;
}

function iconForValue(value) {
  const byId = {
    1: 'shield-safe',
    10: 'gravity-bed',
    11: 'adventure-map',
    12: 'laser-eagle',
    14: 'shield-safe',
    23: 'puzzle-solo',
    24: 'lounge',
    27: 'gravity-bed',
    28: 'laser-guitar',
    35: 'coin-piggy',
    36: 'shield-safe',
    38: 'gold-trophy'
  };
  const byCategory = {
    comfort: 'lounge',
    relationship: 'double-hearts',
    expression: 'cool-face',
    achievement: 'crossed-blades'
  };
  return byId[value.id] || byCategory[value.category] || 'cool-face';
}

function renderMemeIcon(icon) {
  const common = 'viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg"';
  const templates = {
    'lounge': `<svg ${common}><path d="M20 50h50c7 0 12 5 12 12v8H20V50Z" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><path d="M26 50V34h28c8 0 14 6 14 14v2" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><path d="M25 70v8M73 70v8" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><rect x="34" y="38" width="14" height="8" fill="currentColor" opacity=".55"/></svg>`,
    'crossed-blades': `<svg ${common}><path d="M24 76 72 28l8-14-14 8-48 48 6 6Z" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><path d="M72 76 24 28l-8-14 14 8 48 48-6 6Z" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/></svg>`,
    'double-hearts': `<svg ${common}><path d="M33 34c0-8 10-12 16-5 6-7 16-3 16 5 0 12-16 22-16 22S33 46 33 34Z" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><path d="M16 48c0-6 8-9 12-4 4-5 12-2 12 4 0 9-12 16-12 16S16 57 16 48ZM62 52c0-6 8-9 12-4 4-5 12-2 12 4 0 9-12 16-12 16S62 61 62 52Z" stroke="currentColor" stroke-width="4" opacity=".72"/></svg>`,
    'cool-face': `<svg ${common}><path d="M24 38h48l-8 18H32L24 38Z" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><path d="M33 70h30M18 30h60M30 30l-6 8M66 30l6 8" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><path d="M40 46h8M57 46h8" stroke="currentColor" stroke-width="4"/></svg>`,
    'pixel-flame': `<svg ${common}><path d="M50 12v18h12v12h10v18c0 14-11 24-24 24S24 74 24 60c0-14 8-21 16-31v17h10V12Z" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><path d="M45 61h10v15H45z" fill="currentColor" opacity=".6"/></svg>`,
    'laser-eagle': `<svg ${common}><path d="M12 50 48 22l36 28-24-4-12 28-12-28-24 4Z" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><path d="M35 46h26M48 22v52" stroke="currentColor" stroke-width="4" opacity=".65"/></svg>`,
    'shield-safe': `<svg ${common}><path d="M48 12 78 24v22c0 20-12 32-30 40-18-8-30-20-30-40V24l30-12Z" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><rect x="34" y="38" width="28" height="22" rx="2" stroke="currentColor" stroke-width="4"/><circle cx="48" cy="49" r="5" fill="currentColor"/></svg>`,
    'family-silhouette': `<svg ${common}><circle cx="48" cy="24" r="8" stroke="currentColor" stroke-width="5"/><circle cx="27" cy="36" r="7" stroke="currentColor" stroke-width="4"/><circle cx="69" cy="36" r="7" stroke="currentColor" stroke-width="4"/><path d="M33 72V58c0-8 6-14 15-14s15 6 15 14v14M16 72V58c0-7 5-12 11-12M80 72V58c0-7-5-12-11-12" stroke="currentColor" stroke-width="5" stroke-linecap="round"/></svg>`,
    'puzzle-solo': `<svg ${common}><path d="M22 28h20c0-8 12-8 12 0h20v18c-8 0-8 12 0 12v18H54c0-8-12-8-12 0H22V58c8 0 8-12 0-12V28Z" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/></svg>`,
    'spotlight-mic': `<svg ${common}><path d="M48 16v26M36 42h24M28 76l20-34 20 34M18 76h60" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 24 8 16M78 24l10-8M48 8V0" stroke="currentColor" stroke-width="4" opacity=".7"/></svg>`,
    'team-hands': `<svg ${common}><path d="M16 48h18l10 10 10-10h26M24 48v18h16l8-8 8 8h16V48" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><path d="M36 31c0-6 8-8 12-3 4-5 12-3 12 3 0 8-12 15-12 15S36 39 36 31Z" stroke="currentColor" stroke-width="4"/></svg>`,
    'gold-trophy': `<svg ${common}><path d="M32 18h32v20c0 12-7 22-16 22S32 50 32 38V18Z" stroke="currentColor" stroke-width="5"/><path d="M32 26H18v8c0 10 7 16 17 16M64 26h14v8c0 10-7 16-17 16M48 60v14M34 78h28" stroke="currentColor" stroke-width="5" stroke-linecap="round"/></svg>`,
    'adventure-map': `<svg ${common}><path d="M18 22 38 14l20 8 20-8v60l-20 8-20-8-20 8V22Z" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><path d="M38 14v60M58 22v60M46 30l8 8-8 8-8-8 8-8Z" stroke="currentColor" stroke-width="4"/></svg>`,
    'gravity-bed': `<svg ${common}><path d="M16 58h64v16H16V58ZM16 42h24v16H16V42ZM40 48h34c6 0 10 4 10 10" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><path d="M60 22h14l-14 14h14M35 22h12l-12 12h12" stroke="currentColor" stroke-width="4" opacity=".7"/></svg>`,
    'drama-mask': `<svg ${common}><path d="M18 26c18-8 31-8 48 0v22c0 14-10 24-24 24S18 62 18 48V26Z" stroke="currentColor" stroke-width="5"/><path d="M30 42h10M52 42h10M34 58c8 6 16 6 24 0" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>`,
    'laser-guitar': `<svg ${common}><path d="M22 66c-8-8-2-22 10-22 4-10 18-9 22 0l26-26 8 8-26 26c9 4 10 18 0 22-5 10-22 9-28 0-4 0-8-2-12-8Z" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><circle cx="45" cy="59" r="6" stroke="currentColor" stroke-width="4"/></svg>`,
    'hooded-hacker': `<svg ${common}><path d="M24 72V44c0-16 10-28 24-28s24 12 24 28v28H24Z" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><path d="M34 46h28l-8 16H42l-8-16Z" stroke="currentColor" stroke-width="4"/><path d="M39 54h6M51 54h6" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg>`,
    'champion-medal': `<svg ${common}><path d="M34 14h28l-8 28H42L34 14Z" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><circle cx="48" cy="62" r="18" stroke="currentColor" stroke-width="5"/><path d="M48 50v24M38 62h20" stroke="currentColor" stroke-width="4" opacity=".75"/></svg>`,
    'coin-piggy': `<svg ${common}><path d="M20 56c0-13 12-24 30-24h16l10 8h8v18h-8c-3 10-14 18-30 18H28l-8-8V56Z" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><path d="M44 24h18M38 76v8M62 76v8M72 48h2" stroke="currentColor" stroke-width="5" stroke-linecap="round"/></svg>`,
    'battle-buddies': `<svg ${common}><circle cx="34" cy="30" r="8" stroke="currentColor" stroke-width="5"/><circle cx="62" cy="30" r="8" stroke="currentColor" stroke-width="5"/><path d="M20 76V58c0-10 6-16 14-16s14 6 14 16v18M48 76V58c0-10 6-16 14-16s14 6 14 16v18M38 52h20" stroke="currentColor" stroke-width="5" stroke-linecap="round"/></svg>`
  };
  return templates[icon] || templates['cool-face'];
}

function showStage(id, updateHash = true) {
  document.querySelectorAll('.stage').forEach(stage => stage.classList.remove('active'));
  $(id).classList.add('active');
  const stageNumber = id === 'stage1' || id === 'reveal' ? '1' : id === 'stage2' ? '2' : '3';
  document.querySelectorAll('[data-stage-pill]').forEach(pill => {
    pill.classList.toggle('active', pill.dataset.stagePill === stageNumber);
  });
  if (updateHash && location.hash !== `#${id}`) history.pushState({ stage: id }, '', `#${id}`);
}

function openStage(id, updateHash = true) {
  document.querySelector('.swipe-zone')?.classList.toggle('selection-mode', id === 'stage2');
  if (id === 'stage2') {
    if (!state.filteredJobs.length) prepare24JobsSelection();
    renderSelectionPage(state.selectionPage || 0);
  }
  if (id === 'stage3') renderLikedJobs();
  if (id === 'reportStage') {
    buildReport(updateHash);
    return;
  }
  showStage(id, updateHash);
}

function stageFromHash() {
  const id = location.hash.replace('#', '');
  return ['stage1', 'reveal', 'stage2', 'stage3', 'reportStage'].includes(id) ? id : 'stage1';
}

function startCareerValueScreening() {
  state.valueDeck = careerValuesData.filter(value => ATTR[value.category]);
  state.valueIndex = 0;
  state.refiningValues = false;
  state.wantedValueIds.clear();
  state.chosenValueIds.clear();
  state.lowFuelDialogOpen = false;
  state.scores = { comfort: 0, relationship: 0, expression: 0, achievement: 0 };
  state.filteredJobs = [];
  state.selectionPages = [[], []];
  state.selectionPage = 0;
  state.selectedGridJobs = [];
  state.selectedTopJobs = [];
  state.jobSearchOpen = false;
  state.jobSearchQuery = '';
  state.likedJobs = [];
  state.rankedJobs = [null, null, null];
  renderCareerValueCard();
}

function renderCareerValueCard() {
  const value = state.valueDeck[state.valueIndex];
  if (!value) return resolveCareerValueScreening();
  const progress = ((state.valueIndex + 1) / state.valueDeck.length) * 100;
  const text = getMemeText(value.id, value.name);

  $('quizCount').textContent = `${state.valueIndex + 1}/${state.valueDeck.length}`;
  $('quizProgress').style.width = `${progress}%`;
  $('duelGrid').innerHTML = `
    <article class="value-screen-card" style="--accent:${ATTR[value.category].color}">
      <span class="option-code">${ATTR[value.category].label}</span>
      <span class="meme-mark" aria-hidden="true">
        <span class="meme-svg meme-svg-${value.category}">${renderMemeIcon(iconForValue(value))}</span>
      </span>
      <strong>${escapeHtml(text)}</strong>
      <small>${escapeHtml(value.name)}</small>
      <p class="value-pick-count">目前已收集 ${state.wantedValueIds.size} 張人生燃料卡</p>
      <div class="value-actions">
        <button class="value-choice want" data-value-answer="want">這是我想要的</button>
        <button class="value-choice skip" data-value-answer="skip">這還好 / 不要</button>
      </div>
      <button class="finish-values-now" id="finishValuesNow">燃料夠了，直接結算</button>
    </article>
  `;

  document.querySelectorAll('[data-value-answer]').forEach(button => {
    button.addEventListener('click', () => handleAnswer(button.dataset.valueAnswer === 'want', button));
  });
  $('finishValuesNow').addEventListener('click', requestFlexibleFinish);
}

function handleAnswer(wantsValue, button) {
  const value = state.valueDeck[state.valueIndex];
  if (!value) return;
  if (wantsValue) state.wantedValueIds.add(value.id);
  button.classList.add('picked');
  document.querySelectorAll('.value-choice').forEach(item => {
    if (item !== button) item.classList.add('faded');
  });

  setTimeout(() => {
    state.valueIndex += 1;
    renderCareerValueCard();
  }, 220);
}

function resolveCareerValueScreening() {
  if (state.wantedValueIds.size > VALUE_FINAL_LIMIT) {
    state.refiningValues = true;
    state.chosenValueIds.clear();
    renderValueRefinement();
    return;
  }
  finalizeCareerValues([...state.wantedValueIds]);
}

function requestFlexibleFinish() {
  const chosenCount = state.wantedValueIds.size;
  if (chosenCount < 3) {
    renderLowFuelDialog();
    return;
  }
  resolveCareerValueScreening();
}

function renderLowFuelDialog() {
  if (document.querySelector('.low-fuel-dialog')) return;
  const dialog = document.createElement('div');
  dialog.className = 'low-fuel-dialog';
  dialog.innerHTML = `
    <div class="low-fuel-box">
      <span class="section-label">LOW FUEL</span>
      <h3>特攻隊長，基地燃料有點少</h3>
      <p>目前只收集 ${state.wantedValueIds.size} 張生涯卡。可以再發掘 1、2 個隱藏超能力；如果想直接出發，系統會自動補上常態標配燃料，讓技能樹不會斷線。</p>
      <div class="low-fuel-actions">
        <button id="keepExploringValues" class="secondary-action">再探索幾張</button>
        <button id="forceFinishValues" class="primary-action">直接出發，自動補燃料</button>
      </div>
    </div>
  `;
  $('duelGrid').appendChild(dialog);
  $('keepExploringValues').addEventListener('click', () => dialog.remove());
  $('forceFinishValues').addEventListener('click', () => {
    autoFillMinimumValues();
    dialog.remove();
    resolveCareerValueScreening();
  });
}

function autoFillMinimumValues() {
  for (const id of DEFAULT_VALUE_IDS) {
    if (state.wantedValueIds.size >= 3) break;
    if (careerValuesData.some(value => value.id === id)) state.wantedValueIds.add(id);
  }
  for (const value of careerValuesData) {
    if (state.wantedValueIds.size >= 3) break;
    if (ATTR[value.category]) state.wantedValueIds.add(value.id);
  }
}

function renderValueRefinement() {
  const wantedValues = careerValuesData.filter(value => state.wantedValueIds.has(value.id));
  $('quizCount').textContent = `${state.chosenValueIds.size}/${VALUE_FINAL_LIMIT}`;
  $('quizProgress').style.width = `${(state.chosenValueIds.size / VALUE_FINAL_LIMIT) * 100}%`;
  $('duelGrid').innerHTML = `
    <section class="value-refine-panel">
      <div class="draft-head">
        <span>想要池太滿了，請精選 10 張人生燃料</span>
        <b>${state.chosenValueIds.size}/${VALUE_FINAL_LIMIT}</b>
      </div>
      <div class="value-refine-grid">
        ${wantedValues.map(value => `
          <button class="value-refine-card ${state.chosenValueIds.has(value.id) ? 'selected' : ''}" style="--accent:${ATTR[value.category].color}" data-value-id="${value.id}">
            <span>${ATTR[value.category].label}</span>
            <strong>${escapeHtml(getMemeText(value.id, value.name))}</strong>
            <small>${escapeHtml(value.name)}</small>
          </button>
        `).join('')}
      </div>
      <button id="finishValueRefine" class="primary-action" ${state.chosenValueIds.size === VALUE_FINAL_LIMIT ? '' : 'disabled'}>鎖定 10 張燃料卡</button>
    </section>
  `;

  document.querySelectorAll('.value-refine-card').forEach(button => {
    button.addEventListener('click', () => toggleRefineValue(Number(button.dataset.valueId)));
  });
  $('finishValueRefine').addEventListener('click', () => {
    if (state.chosenValueIds.size !== VALUE_FINAL_LIMIT) {
      toast('請先選滿 10 張人生燃料卡');
      return;
    }
    finalizeCareerValues([...state.chosenValueIds]);
  });
}

function toggleRefineValue(valueId) {
  if (state.chosenValueIds.has(valueId)) {
    state.chosenValueIds.delete(valueId);
  } else if (state.chosenValueIds.size < VALUE_FINAL_LIMIT) {
    state.chosenValueIds.add(valueId);
  } else {
    toast('精選池已經滿 10 張');
  }
  renderValueRefinement();
}

function finalizeCareerValues(valueIds) {
  state.chosenValueIds = new Set(valueIds);
  recomputeScoresFromChosenValues();
  renderReveal();
}

function prepare24JobsSelection() {
  state.maxCategory = topAttr();
  const finalSelection = [];

  const primaryPool = careerJobsData.filter(job => job.category === state.maxCategory);
  addUnique(finalSelection, shuffle(primaryPool), 12);

  const baselinePool = careerJobsData.filter(job => BASELINE_JOB_IDS.includes(job.id));
  addUnique(finalSelection, shuffle(baselinePool), 18);

  const crossPool = careerJobsData.filter(job => job.category !== state.maxCategory);
  addUnique(finalSelection, shuffle(crossPool), 24);
  addUnique(finalSelection, shuffle(careerJobsData), 24);

  state.filteredJobs = shuffle(finalSelection.slice(0, 24));
  state.selectionPages = [
    state.filteredJobs.slice(0, GRID_PAGE_SIZE),
    state.filteredJobs.slice(GRID_PAGE_SIZE, GRID_PAGE_SIZE * 2)
  ];
  state.selectionPage = 0;
  state.selectedGridJobs = [];
  state.likedJobs = [];
  state.rankedJobs = [null, null, null];
}

function renderReveal() {
  showStage('reveal');
  const top = topAttr();
  state.maxCategory = top;
  $('titleResult').textContent = `稱號解鎖「${ATTR[top].title}」`;
  $('attributeBars').innerHTML = Object.entries(ATTR).map(([key, meta]) => `
    <div class="attr-row" style="--accent:${meta.color}">
      <span>${meta.label}</span>
      <div class="attr-track"><div class="attr-fill" data-score="${state.scores[key]}"></div></div>
      <b>${state.scores[key]}</b>
    </div>
  `).join('');

  requestAnimationFrame(() => {
    document.querySelectorAll('.attr-fill').forEach(fill => {
      const percent = Math.min(100, (Number(fill.dataset.score) / chosenValueTotal()) * 100);
      fill.style.width = `${percent}%`;
    });
  });
}

function selectedCountForPage(pageIndex) {
  const pageIds = new Set(state.selectionPages[pageIndex].map(job => job.id));
  return state.selectedGridJobs.filter(job => pageIds.has(job.id)).length;
}

function requiredSelectionTotal(pageIndex) {
  return (pageIndex + 1) * GRID_PICK_LIMIT;
}

function canFinishSelectionPage(pageIndex) {
  return state.selectedGridJobs.length >= requiredSelectionTotal(pageIndex);
}

function addJobToSelection(job) {
  if (!job || state.selectedGridJobs.some(item => item.id === job.id)) {
    toast('這張職業卡已經在入選池');
    return;
  }
  state.selectedGridJobs.push(job);
  state.likedJobs = [...state.selectedGridJobs];
  $('likedCount').textContent = state.selectedGridJobs.length;
  renderSelectionPage(state.selectionPage);
  renderJobSearchPanel();
  toast(`已加入：${job.title}`);
}

function renderSelectionPage(pageIndex = 0) {
  state.selectionPage = pageIndex;
  document.querySelector('.swipe-zone')?.classList.add('selection-mode');
  const jobs = state.selectionPages[pageIndex] || [];
  const pagePicked = selectedCountForPage(pageIndex);
  const canContinue = canFinishSelectionPage(pageIndex);
  $('jobCursor').textContent = `第 ${pageIndex + 1}/2 輪`;
  $('likedCount').textContent = state.selectedGridJobs.length;
  $('jobCard').innerHTML = `
    <div class="draft-panel">
      <div class="draft-head">
        <span>請選出 3 個你覺得最酷的職業</span>
        <b>${pagePicked}/${GRID_PICK_LIMIT}</b>
      </div>
      <div class="job-draft-grid">
        ${jobs.map(job => `
          <button class="draft-job ${state.selectedGridJobs.some(item => item.id === job.id) ? 'selected' : ''}" data-job-id="${job.id}">
            <span class="mini-mark">${jobMark(job)}</span>
            <strong>${escapeHtml(job.title)}</strong>
            <small>${job.displayCategory}</small>
          </button>
        `).join('')}
      </div>
    </div>
  `;
  $('rejectBtn').style.display = 'none';
  $('likeBtn').style.display = 'none';
  $('finishSwipe').textContent = pageIndex === 0 ? '下一頁：再選 3 張' : '完成選秀，挑前三名';
  $('finishSwipe').disabled = !canContinue;
  renderJobSearchPanel();

  document.querySelectorAll('.draft-job').forEach(button => {
    button.addEventListener('click', () => toggleDraftJob(Number(button.dataset.jobId)));
  });
}

function toggleDraftJob(jobId) {
  const pageJobs = state.selectionPages[state.selectionPage] || [];
  const job = pageJobs.find(item => item.id === jobId);
  if (!job) return;

  const exists = state.selectedGridJobs.some(item => item.id === job.id);
  if (exists) {
    state.selectedGridJobs = state.selectedGridJobs.filter(item => item.id !== job.id);
  } else if (selectedCountForPage(state.selectionPage) < GRID_PICK_LIMIT) {
    state.selectedGridJobs.push(job);
  } else {
    toast('這一輪已經選滿 3 張');
  }
  renderSelectionPage(state.selectionPage);
}

function finishSelectionPage() {
  if (!canFinishSelectionPage(state.selectionPage)) {
    toast('請先選滿 3 張，或從全量職業池補進入選池');
    return;
  }

  if (state.selectionPage === 0) {
    renderSelectionPage(1);
    return;
  }

  state.likedJobs = [...state.selectedGridJobs];
  state.selectedTopJobs = [...state.selectedGridJobs];
  state.rankedJobs = [null, null, null];
  openStage('stage3');
}

function renderJobSearchPanel() {
  const panel = $('jobSearchPanel');
  if (!panel) return;
  panel.hidden = !state.jobSearchOpen;
  if (!state.jobSearchOpen) return;

  const query = state.jobSearchQuery.trim().toLowerCase();
  const queryTerms = expandJobSearchTerms(query);
  const matchedJobs = careerJobsData
    .filter(job => {
      if (!query) return true;
      const text = `${job.title} ${job.majorCategory || ''} ${job.minorCategory || ''} ${job.displayCategory}`.toLowerCase();
      return queryTerms.some(term => text.includes(term));
    })
    .slice(0, 60);

  $('jobSearchInput').value = state.jobSearchQuery;
  $('jobSearchResults').innerHTML = matchedJobs.map(job => {
    const selected = state.selectedGridJobs.some(item => item.id === job.id);
    return `
      <button class="search-job ${selected ? 'selected' : ''}" data-job-id="${job.id}" ${selected ? 'disabled' : ''}>
        <span class="mini-mark">${jobMark(job)}</span>
        <strong>${escapeHtml(job.title)}</strong>
        <small>${escapeHtml(job.majorCategory || '職業憧憬卡')} / ${escapeHtml(job.displayCategory)}</small>
      </button>
    `;
  }).join('');

  document.querySelectorAll('.search-job').forEach(button => {
    button.addEventListener('click', () => {
      const job = careerJobsData.find(item => item.id === Number(button.dataset.jobId));
      addJobToSelection(job);
    });
  });
}

function expandJobSearchTerms(query) {
  if (!query) return [];
  const terms = [query];
  if (/司機|公車|開車|駕駛/.test(query)) terms.push('駕駛', '運輸', '宅配', '快遞', '貨運', '郵務', '水手', '船員');
  if (/超商|便利|店員|收銀|門市/.test(query)) terms.push('門市', '銷售', '售貨', '服務', '餐飲', '櫃檯', '店');
  return [...new Set(terms.map(term => term.toLowerCase()))];
}

function renderLikedJobs() {
  const pool = state.likedJobs.length ? state.likedJobs : state.selectedGridJobs;
  $('likedJobs').innerHTML = pool.map(job => `
    <button class="liked-job ${state.rankedJobs.some(item => item?.id === job.id) ? 'selected' : ''}" data-job-id="${job.id}">
      <strong><span class="mini-mark">${jobMark(job)}</span>${escapeHtml(job.title)}</strong><br>
      <small>${job.displayCategory}</small>
    </button>
  `).join('');

  document.querySelectorAll('.liked-job').forEach(button => {
    button.addEventListener('click', () => rankJob(Number(button.dataset.jobId)));
  });
  renderRankSlots();
  renderSkillTree();
}

function rankJob(jobId) {
  const job = careerJobsData.find(item => item.id === jobId);
  if (!job) return;
  state.rankedJobs = state.rankedJobs.filter(item => item?.id !== jobId);
  state.rankedJobs.push(job);
  state.rankedJobs = state.rankedJobs.filter(Boolean).slice(0, 3);
  while (state.rankedJobs.length < 3) state.rankedJobs.push(null);
  state.selectedTopJobs = state.rankedJobs.filter(Boolean);
  renderLikedJobs();
}

function renderRankSlots() {
  document.querySelectorAll('.rank-slot').forEach(slot => {
    const job = state.rankedJobs[Number(slot.dataset.rank)];
    slot.querySelector('strong').textContent = job ? `${jobMark(job)} ${job.title}` : '等待選擇';
  });
}

function getOverlaps(job) {
  if (!job?.richValueId?.length) return [];
  return job.richValueId
    .filter(id => state.chosenValueIds.has(id))
    .map(id => careerValuesData.find(value => value.id === id))
    .filter(Boolean);
}

function getFuelMatch(job) {
  const overlaps = getOverlaps(job);
  const richCount = Array.isArray(job?.richValueId) ? job.richValueId.length : 0;
  const percent = richCount ? Math.round((overlaps.length / richCount) * 100) : 0;
  const categoryCounts = overlaps.reduce((acc, value) => {
    acc[value.category] = (acc[value.category] || 0) + 1;
    return acc;
  }, {});
  const focusCategory = Object.keys(categoryCounts).sort((a, b) => categoryCounts[b] - categoryCounts[a])[0] || state.maxCategory || job?.category || 'comfort';
  const focusLabel = ATTR[focusCategory]?.label || '人生目標';
  const matchedNames = overlaps.map(value => value.name).slice(0, 3);
  const lead = percent >= 80 ? '燃料配對成功' : percent >= 45 ? '燃料正在接上' : '燃料還在暖機';
  return {
    percent,
    lead,
    focusLabel,
    matchedNames,
    text: `${lead}！此工作能提供 ${percent}% 燃料，滋養你想過的【${focusLabel}】生活！`
  };
}

function renderSkillTree() {
  const first = state.rankedJobs[0];
  if (!first) {
    $('skillTree').innerHTML = '<div class="core-node">選擇第一志願</div>';
    $('synergyText').textContent = '把職業放進第 1 志願後，會檢查 richValueId 與你的生涯價值是否相遇。';
    return;
  }

  const overlaps = getOverlaps(first);
  const fallback = careerValuesData.filter(value => state.chosenValueIds.has(value.id)).slice(0, 5);
  const nodes = overlaps.length ? overlaps : fallback;
  const center = `<div class="core-node"><span class="mini-mark">${jobMark(first)}</span><br>${escapeHtml(first.title)}</div>`;
  const placed = nodes.map((value, index) => {
    const angle = (Math.PI * 2 / Math.max(nodes.length, 1)) * index - Math.PI / 2;
    const x = 50 + Math.cos(angle) * 34;
    const y = 50 + Math.sin(angle) * 34;
    const deg = angle * 180 / Math.PI;
    return `
      <div class="link-line" style="--accent:${ATTR[value.category].color};left:50%;top:50%;width:110px;transform:rotate(${deg}deg)"></div>
      <div class="value-node" style="--accent:${ATTR[value.category].color};left:calc(${x}% - 58px);top:calc(${y}% - 37px)">${escapeHtml(value.name)}</div>
    `;
  }).join('');

  $('skillTree').innerHTML = center + placed;
  const strategy = getCleanStrategySkill(first);
  const fuel = getFuelMatch(first);
  if (overlaps.length) {
    $('synergyText').textContent = `${fuel.text} 已裝備特攻護盾：${strategy.gameName}`;
  } else if (first.richValueId?.length) {
    $('synergyText').textContent = `${fuel.text} 目前命中的生涯卡較少，可以作為諮詢討論點。`;
  } else {
    $('synergyText').textContent = `${fuel.text} 這張職業卡尚未匯入正式 richValueId，先用本次生涯屬性做示意。`;
  }
}

function buildReport(updateHash = true) {
  const student = $('studentName').value.trim() || '未命名隊員';
  const top = topAttr();
  $('reportName').textContent = student;
  $('basicName').textContent = student;
  $('basicTitle').textContent = ATTR[top].title;
  const vals = careerValuesData.filter(value => state.chosenValueIds.has(value.id));
  $('reportValues').innerHTML = vals.slice(0, 18).map(value => `<span class="value-chip">${escapeHtml(value.name)}</span>`).join('');
  const ranked = state.rankedJobs.filter(Boolean);
  let iepListHtml = '';
  ranked.forEach((job, index) => {
    const finalStrategy = getTeacherStrategyText(job);
    const fuel = getFuelMatch(job);
    const matchedText = fuel.matchedNames.length ? `命中：${fuel.matchedNames.map(escapeHtml).join('、')}` : '尚未命中明確生涯卡，可作為討論起點';
    const categoryLabel = job.category ? job.category.toUpperCase() : 'UNCLASSIFIED';
    iepListHtml += `
      <div class="iep-job-block" style="margin-bottom:20px;padding:16px;border-left:4px solid #00F5D4;background-color:rgba(255,255,255,0.03);border-radius:0 8px 8px 0;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:8px;">
          <span style="color:#FF007F;font-weight:bold;font-size:14px;letter-spacing:1px;">MISSION ${index + 1}</span>
          <span style="color:#888;font-size:12px;">屬性標籤：${categoryLabel}</span>
        </div>
        <h3 style="color:#ffffff;margin:0 0 10px 0;font-size:20px;font-weight:600;">${escapeHtml(job.name || job.title)}</h3>
        <div class="fuel-report" style="margin:0 0 12px 0;padding:10px 12px;border:1px solid rgba(0,245,212,.35);background:rgba(0,245,212,.08);">
          <strong style="color:#00F5D4;font-size:18px;">人生目標滋養度 ${fuel.percent}%</strong>
          <p style="color:#ffffff;margin:6px 0 0;font-size:14px;line-height:1.55;">${escapeHtml(fuel.text)} ${matchedText}</p>
        </div>
        <p style="color:#E0E0E0;margin:0;font-size:15px;line-height:1.6;text-align:justify;">
          <strong style="color:#00F5D4;">轉銜授課策略：</strong>${escapeHtml(finalStrategy)}
        </p>
      </div>
    `;
  });
  $('iepList').innerHTML = iepListHtml || '<div class="iep-job-block">尚未選擇前三志願。</div>';
  drawRadar();
  showStage('reportStage', updateHash);
}

function drawRadar() {
  const canvas = $('radarCanvas');
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const cx = w / 2;
  const cy = h / 2 + 8;
  const maxR = 92;
  const keys = Object.keys(ATTR);
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = 'rgba(255,255,255,.18)';
  ctx.lineWidth = 1;

  for (let ring = 1; ring <= 4; ring++) {
    ctx.beginPath();
    keys.forEach((key, index) => {
      const angle = -Math.PI / 2 + index * Math.PI * 2 / keys.length;
      const r = maxR * ring / 4;
      const x = cx + Math.cos(angle) * r;
      const y = cy + Math.sin(angle) * r;
      index ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.closePath();
    ctx.stroke();
  }

  ctx.beginPath();
  keys.forEach((key, index) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / keys.length;
    const r = maxR * (state.scores[key] / chosenValueTotal() || 0.05);
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    index ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
  });
  ctx.closePath();
  ctx.fillStyle = 'rgba(0,245,212,.26)';
  ctx.strokeStyle = '#00F5D4';
  ctx.lineWidth = 3;
  ctx.fill();
  ctx.stroke();
  ctx.font = '700 14px Noto Sans TC';
  ctx.fillStyle = '#f6f7ff';
  keys.forEach((key, index) => {
    const angle = -Math.PI / 2 + index * Math.PI * 2 / keys.length;
    const x = cx + Math.cos(angle) * (maxR + 46);
    const y = cy + Math.sin(angle) * (maxR + 24);
    ctx.textAlign = x < cx - 10 ? 'right' : x > cx + 10 ? 'left' : 'center';
    ctx.fillText(ATTR[key].label, x, y);
  });
}

function iepText() {
  return state.rankedJobs
    .filter(Boolean)
    .map((job, index) => `【志願 ${index + 1}】${job.name || job.title}：轉銜授課策略：${getTeacherStrategyText(job)}`)
    .join('\n');
}

function toast(text) {
  $('toast').textContent = text;
  $('toast').classList.add('show');
  setTimeout(() => $('toast').classList.remove('show'), 1600);
}

$('startSwipe').addEventListener('click', () => {
  prepare24JobsSelection();
  openStage('stage2');
});
$('rejectBtn').addEventListener('click', () => {});
$('likeBtn').addEventListener('click', () => {});
$('finishSwipe').addEventListener('click', finishSelectionPage);
$('openJobSearch').addEventListener('click', () => {
  state.jobSearchOpen = true;
  renderJobSearchPanel();
  $('jobSearchInput').focus();
});
$('closeJobSearch').addEventListener('click', () => {
  state.jobSearchOpen = false;
  renderJobSearchPanel();
});
$('jobSearchInput').addEventListener('input', event => {
  state.jobSearchQuery = event.target.value;
  renderJobSearchPanel();
});
$('buildReport').addEventListener('click', () => buildReport());
$('copyIep').addEventListener('click', async () => {
  const text = iepText();
  try {
    if (navigator.clipboard) await navigator.clipboard.writeText(text);
    else throw new Error('clipboard unavailable');
  } catch (error) {
    const area = document.createElement('textarea');
    area.value = text;
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    area.remove();
  }
  toast('已複製 IEP 策略清單');
});
$('downloadReport').addEventListener('click', async () => {
  if (!window.html2canvas) {
    toast('html2canvas 尚未載入，請確認網路連線');
    return;
  }
  const canvas = await window.html2canvas($('missionReport'), {
    backgroundColor: '#0D0E15',
    scale: 2,
    useCORS: true
  });
  const link = document.createElement('a');
  const reportDate = new Date().toISOString().slice(0, 10);
  link.download = `人生特攻隊_生涯轉銜報告_${reportDate}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
});

document.querySelectorAll('[data-stage-pill]').forEach(pill => {
  pill.addEventListener('click', () => {
    const stageId = pill.dataset.stagePill === '1' ? 'stage1' : pill.dataset.stagePill === '2' ? 'stage2' : 'stage3';
    if (stageId === 'stage1') {
      startCareerValueScreening();
      showStage('stage1');
      return;
    }
    openStage(stageId);
  });
});

window.addEventListener('popstate', () => {
  const target = stageFromHash();
  if (target === 'reportStage') buildReport(false);
  else openStage(target, false);
});

window.addEventListener('hashchange', () => {
  const target = stageFromHash();
  if (target === 'reportStage') buildReport(false);
  else openStage(target, false);
});

startCareerValueScreening();
if (location.hash) {
  const target = stageFromHash();
  if (target === 'reportStage') buildReport(false);
  else openStage(target, false);
} else {
  history.replaceState({ stage: 'stage1' }, '', '#stage1');
}
