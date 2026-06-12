const careerValuesData = window.careerValuesData || [];
const rawCareerJobsData = window.careerJobsData || [];

const ATTR = {
  comfort: { label: '安穩舒適', color: '#00F5D4', title: '躺平界的一級特攻' },
  relationship: { label: '人際情感', color: '#FF007F', title: '靈魂社交終結者' },
  expression: { label: '獨特自我', color: '#7B2CBF', title: '不按牌理出牌的自我玩家' },
  achievement: { label: '挑戰成就', color: '#FF6B00', title: '正面突破的熱血輸出' }
};

const QUESTIONS = [
  ['comfort', '徹底躺平', 'lounge', 'achievement', '正面對決', 'crossed-blades'],
  ['relationship', '粉紅泡泡', 'double-hearts', 'expression', '我行我素', 'cool-face'],
  ['achievement', '死磕夢想', 'pixel-flame', 'expression', '單飛人生', 'laser-eagle'],
  ['comfort', '鐵飯碗在手', 'shield-safe', 'relationship', '家人100分', 'family-silhouette'],
  ['comfort', '邊緣人萬歲', 'puzzle-solo', 'expression', '全場我最 C', 'spotlight-mic'],
  ['relationship', '有福同享', 'team-hands', 'achievement', '我要贏到最後', 'gold-trophy'],
  ['achievement', '世界很大想去看看', 'adventure-map', 'comfort', '床的重力太強了', 'gravity-bed'],
  ['relationship', '戴上面具配合演出', 'drama-mask', 'expression', '靈魂不妥協', 'laser-guitar'],
  ['expression', '低調的隱藏強者', 'hooded-hacker', 'achievement', '受盡萬人景仰', 'champion-medal'],
  ['comfort', '錢夠用就好了啦', 'coin-piggy', 'relationship', '義氣相挺衝一波', 'battle-buddies']
].map(q => [{ attr: q[0], text: q[1], icon: q[2] }, { attr: q[3], text: q[4], icon: q[5] }]);

const BASELINE_JOB_IDS = [1, 2, 3, 19, 25, 27, 42, 46, 47, 84];

const state = {
  quizIndex: 0,
  scores: { comfort: 0, relationship: 0, expression: 0, achievement: 0 },
  chosenValueIds: new Set(),
  maxCategory: 'comfort',
  filteredJobs: [],
  jobIndex: 0,
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

function normalizeStrategy(strategySkill) {
  if (typeof strategySkill === 'string') {
    const match = strategySkill.match(/^(.+?)[（(](.+)[）)]$/);
    const gameName = match ? match[1] : strategySkill;
    return {
      gameName,
      iepName: gameName,
      description: match ? match[2] : strategySkill
    };
  }

  return {
    gameName: strategySkill?.gameName || '待補特攻技能',
    iepName: strategySkill?.iepName || strategySkill?.gameName || '待補正式特教策略',
    description: strategySkill?.description || '此職業的 richValueId 與 strategySkill 尚未匯入。'
  };
}

function getCleanStrategySkill(job) {
  const fallbackByCategory = {
    comfort: {
      gameName: '規律節奏工作檢核表',
      iepName: '自動化感官調節與規律節奏勞動策略',
      description: '利用定時番茄鐘與環境結構化減低分心風險，維持高度工作專注力'
    },
    relationship: {
      gameName: '人際邊界溝通劇本',
      iepName: '人際邊界綠燈指令與同理心溝通劇本',
      description: '建立心理防護罩，運用結構化社交退場機制應對職場人際摩擦'
    },
    expression: {
      gameName: '視覺化靈感加工術',
      iepName: '零起點靈感加工與視覺化心智圖',
      description: '利用微調模仿策略與數位輔具，降低從零發想的挫折感，將創意落實為實體計畫'
    },
    achievement: {
      gameName: '高壓任務拆解指令',
      iepName: '高挫折耐受自我對話與高階後設認知策略',
      description: '將大型繁複任務拆解為微型目標，透過自我增強指令控制高壓環境下的衝動'
    },
    unclassified: {
      gameName: 'UDL 工作檢核表',
      iepName: '通用學習設計（UDL）工作檢核表',
      description: '利用圖像化步驟與微型目標拆解，降低工作記憶負擔，提升職場適應力'
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
  const strategy = normalizeStrategy(job?.strategySkill);
  const exactStrategy = strategy.fullText || `${strategy.gameName}（${strategy.description}）`;
  const plainText = String(exactStrategy || '').trim();

  if (plainText && !plainText.includes('待補')) return plainText;

  switch (job?.category) {
    case 'comfort':
      return '標準化工作記憶檢核策略（利用視覺提示與 SOP 拆解，協助學生在常態勞動中維持視覺專注，降低分心風險）';
    case 'relationship':
      return '人際邊界綠燈指令與同理心溝通劇本（建立心理防護罩，運用結構化社交退場機制應對職場人際摩擦）';
    case 'expression':
      return '零起點靈感加工與視覺化心智圖（利用微調模仿策略與數位輔具，降低從零發想的挫折感，將創意落實為實體計畫）';
    case 'achievement':
      return '後設認知與自我對話策略（訓練學生在高壓或多工作業環境下，運用內部語言自我調節情緒，建立耐挫力）';
    default:
      return '通用學習設計（UDL）工作檢核表（利用圖像化步驟與微型目標拆解，降低工作記憶負擔）';
  }
}

function inferJobCategory(job) {
  if (job.category && ATTR[job.category]) return job.category;

  const text = `${job.title || job.name || ''} ${job.majorCategory || ''} ${job.minorCategory || ''}`;
  if (/設計|美術|插畫|藝術|表演|傳播|節目|主持|影像|時尚|美容|造型|攝影|文案|網站|網頁|調酒|廚|餐/.test(text)) {
    return 'expression';
  }
  if (/教育|社心|客服|服務|護理|醫|藥|牙|導遊|銷售|店|社工|照顧|人群|諮商/.test(text)) {
    return 'relationship';
  }
  if (/農|林|漁|牧|生產|製造|維修|基層|行政|登錄|資料|倉儲|清潔|保全|駕駛|水手|作業|操作/.test(text)) {
    return 'comfort';
  }
  if (/研究|科學|工程|法律|政治|財經|管理|飛航|警|消防|軍|運動|創業|主管|分析/.test(text)) {
    return 'achievement';
  }
  return 'unclassified';
}

function normalizeJob(job) {
  const category = inferJobCategory(job);
  return {
    ...job,
    title: job.title || job.name,
    category,
    displayCategory: category === 'unclassified' ? '未分類盲盒' : ATTR[category].label,
    richValueId: Array.isArray(job.richValueId) ? job.richValueId : [],
    strategySkill: normalizeStrategy(job.strategySkill)
  };
}

const careerJobsData = rawCareerJobsData.map(normalizeJob);

function jobMark(job) {
  const marks = { comfort: '安', relationship: '情', expression: '我', achievement: '戰', unclassified: '盲' };
  return marks[job?.category] || '職';
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

function formatJobTitle(title) {
  const safeTitle = String(title || '');
  const parts = safeTitle.split(/[／/]/).map(part => part.trim()).filter(Boolean);
  if (parts.length < 2) return escapeHtml(safeTitle);
  return parts.map(part => `<span>${escapeHtml(part)}</span>`).join('<i>／</i>');
}

function chunkTitle(title) {
  const safeTitle = String(title || '').trim();
  const hasDivider = /[／/]/.test(safeTitle);
  if (hasDivider) return formatJobTitle(safeTitle);
  if (safeTitle.length <= 9) return escapeHtml(safeTitle);

  const suffixes = ['工作人員', '操作員', '處理人員', '登錄人員', '客服人員'];
  const suffix = suffixes.find(item => safeTitle.endsWith(item));
  const body = suffix ? safeTitle.slice(0, -suffix.length) : safeTitle;
  const chunks = [];
  for (let index = 0; index < body.length; index += 5) {
    chunks.push(body.slice(index, index + 5));
  }
  if (suffix) chunks.push(suffix);
  return chunks.map(part => `<span>${escapeHtml(part)}</span>`).join('');
}

function renderMemeIcon(icon) {
  const common = 'viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg"';
  const templates = {
    'lounge': `<svg ${common}><path d="M20 50h50c7 0 12 5 12 12v8H20V50Z" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><path d="M26 50V34h28c8 0 14 6 14 14v2" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><path d="M25 70v8M73 70v8" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><rect x="34" y="38" width="14" height="8" fill="currentColor" opacity=".55"/></svg>`,
    'crossed-blades': `<svg ${common}><path d="M24 76 72 28l8-14-14 8-48 48 6 6Z" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><path d="M72 76 24 28l-8-14 14 8 48 48-6 6Z" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><path d="M34 62 24 72M62 62l10 10" stroke="currentColor" stroke-width="5" stroke-linecap="square"/></svg>`,
    'double-hearts': `<svg ${common}><path d="M33 34c0-8 10-12 16-5 6-7 16-3 16 5 0 12-16 22-16 22S33 46 33 34Z" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><path d="M16 48c0-6 8-9 12-4 4-5 12-2 12 4 0 9-12 16-12 16S16 57 16 48ZM62 52c0-6 8-9 12-4 4-5 12-2 12 4 0 9-12 16-12 16S62 61 62 52Z" stroke="currentColor" stroke-width="4" opacity=".72"/></svg>`,
    'cool-face': `<svg ${common}><path d="M24 38h48l-8 18H32L24 38Z" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><path d="M33 70h30M18 30h60M30 30l-6 8M66 30l6 8" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><path d="M40 46h8M57 46h8" stroke="currentColor" stroke-width="4"/></svg>`,
    'pixel-flame': `<svg ${common}><path d="M50 12v18h12v12h10v18c0 14-11 24-24 24S24 74 24 60c0-14 8-21 16-31v17h10V12Z" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><path d="M45 61h10v15H45z" fill="currentColor" opacity=".6"/></svg>`,
    'laser-eagle': `<svg ${common}><path d="M12 50 48 22l36 28-24-4-12 28-12-28-24 4Z" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><path d="M35 46h26M48 22v52" stroke="currentColor" stroke-width="4" opacity=".65"/></svg>`,
    'shield-safe': `<svg ${common}><path d="M48 12 78 24v22c0 20-12 32-30 40-18-8-30-20-30-40V24l30-12Z" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><rect x="34" y="38" width="28" height="22" rx="2" stroke="currentColor" stroke-width="4"/><circle cx="48" cy="49" r="5" fill="currentColor"/></svg>`,
    'family-silhouette': `<svg ${common}><circle cx="48" cy="24" r="8" stroke="currentColor" stroke-width="5"/><circle cx="27" cy="36" r="7" stroke="currentColor" stroke-width="4"/><circle cx="69" cy="36" r="7" stroke="currentColor" stroke-width="4"/><path d="M33 72V58c0-8 6-14 15-14s15 6 15 14v14M16 72V58c0-7 5-12 11-12M80 72V58c0-7-5-12-11-12" stroke="currentColor" stroke-width="5" stroke-linecap="round"/></svg>`,
    'puzzle-solo': `<svg ${common}><path d="M22 28h20c0-8 12-8 12 0h20v18c-8 0-8 12 0 12v18H54c0-8-12-8-12 0H22V58c8 0 8-12 0-12V28Z" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/></svg>`,
    'spotlight-mic': `<svg ${common}><path d="M48 16v26M36 42h24M28 76l20-34 20 34M18 76h60" stroke="currentColor" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/><path d="M18 24 8 16M78 24l10-8M48 8V0" stroke="currentColor" stroke-width="4" opacity=".7"/></svg>`,
    'team-hands': `<svg ${common}><path d="M16 48h18l10 10 10-10h26M24 48v18h16l8-8 8 8h16V48" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><path d="M36 31c0-6 8-8 12-3 4-5 12-3 12 3 0 8-12 15-12 15S36 39 36 31Z" stroke="currentColor" stroke-width="4"/></svg>`,
    'gold-trophy': `<svg ${common}><path d="M32 18h32v20c0 12-7 22-16 22S32 50 32 38V18Z" stroke="currentColor" stroke-width="5"/><path d="M32 26H18v8c0 10 7 16 17 16M64 26h14v8c0 10-7 16-17 16M48 60v14M34 78h28" stroke="currentColor" stroke-width="5" stroke-linecap="round"/><path d="M42 30h12v12H42z" fill="currentColor" opacity=".55"/></svg>`,
    'adventure-map': `<svg ${common}><path d="M18 22 38 14l20 8 20-8v60l-20 8-20-8-20 8V22Z" stroke="currentColor" stroke-width="5" stroke-linejoin="round"/><path d="M38 14v60M58 22v60M28 40h8M62 56h8M46 30l8 8-8 8-8-8 8-8Z" stroke="currentColor" stroke-width="4"/></svg>`,
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
  if (updateHash && location.hash !== `#${id}`) {
    history.pushState({ stage: id }, '', `#${id}`);
  }
}

function openStage(id, updateHash = true) {
  if (id === 'stage2') {
    if (!state.filteredJobs.length) buildRecommendedDeck();
    renderJobCard();
  }

  if (id === 'stage3') {
    if (!state.filteredJobs.length) buildRecommendedDeck();
    renderLikedJobs();
  }

  if (id === 'reportStage') {
    buildReport();
    return;
  }

  showStage(id, updateHash);
}

function stageFromHash() {
  const id = location.hash.replace('#', '');
  return ['stage1', 'reveal', 'stage2', 'stage3', 'reportStage'].includes(id) ? id : 'stage1';
}

function valuesFor(attr) {
  return careerValuesData.filter(value => value.category === attr);
}

function pickOneValueId(attr) {
  const matchedValues = valuesFor(attr);
  if (!matchedValues.length) return;
  const randomValue = matchedValues[Math.floor(Math.random() * matchedValues.length)];
  state.chosenValueIds.add(randomValue.id);
}

function renderQuestion() {
  const pair = QUESTIONS[state.quizIndex];
  $('quizCount').textContent = `${state.quizIndex + 1}/10`;
  $('quizProgress').style.width = `${((state.quizIndex + 1) / QUESTIONS.length) * 100}%`;
  $('duelGrid').innerHTML = pair.map((option, index) => `
    <button class="duel-button" style="--accent:${ATTR[option.attr].color}" data-choice="${index}">
      <span class="option-code">${ATTR[option.attr].label}</span>
      <span class="meme-mark" aria-hidden="true">
        <span class="meme-svg meme-svg-${option.attr}">${renderMemeIcon(option.icon)}</span>
      </span>
      <strong>${option.text}</strong>
      <small>${index === 0 ? '左邊派' : '右邊派'}</small>
    </button>
  `).join('');

  document.querySelectorAll('.duel-button').forEach(button => {
    button.addEventListener('click', () => chooseOption(pair[Number(button.dataset.choice)].attr, button));
  });
}

function chooseOption(attr, button) {
  state.scores[attr] += 1;
  pickOneValueId(attr);
  button.classList.add('picked');
  document.querySelectorAll('.duel-button').forEach(item => {
    if (item !== button) item.classList.add('faded');
  });

  setTimeout(() => {
    state.quizIndex += 1;
    if (state.quizIndex >= QUESTIONS.length) renderReveal();
    else renderQuestion();
  }, 290);
}

function topAttr() {
  return Object.keys(state.scores).sort((a, b) => state.scores[b] - state.scores[a])[0];
}

function shuffle(items) {
  return [...items].sort(() => 0.5 - Math.random());
}

function addUnique(target, candidates, limit) {
  for (const job of candidates) {
    if (target.length >= limit) break;
    if (!target.some(item => item.id === job.id)) target.push(job);
  }
}

function buildRecommendedDeck() {
  state.maxCategory = topAttr();
  const finalSelection = [];

  const primaryJobPool = careerJobsData.filter(job => job.category === state.maxCategory);
  const featuredPrimaryPool = primaryJobPool.filter(job => job.dataStatus === 'added-from-discussion');
  addUnique(finalSelection, shuffle(featuredPrimaryPool), 5);
  addUnique(finalSelection, shuffle(primaryJobPool), 5);

  const baselinePool = careerJobsData.filter(job => BASELINE_JOB_IDS.includes(job.id));
  addUnique(finalSelection, shuffle(baselinePool), 8);

  const crossJobPool = careerJobsData.filter(job => job.category !== state.maxCategory);
  addUnique(finalSelection, shuffle(crossJobPool), 10);

  addUnique(finalSelection, shuffle(careerJobsData), 10);

  state.filteredJobs = shuffle(finalSelection.slice(0, 10));
  state.jobIndex = 0;
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
      fill.style.width = `${Number(fill.dataset.score) * 20}%`;
    });
  });
}

function currentDeck() {
  return state.filteredJobs.length ? state.filteredJobs : careerJobsData;
}

function renderJobCard() {
  const deck = currentDeck();
  const job = deck[state.jobIndex];
  $('likedCount').textContent = state.likedJobs.length;

  if (!job) {
    $('jobCursor').textContent = `${deck.length}/${deck.length}`;
    $('jobCard').innerHTML = '<div><span class="job-mark">OK</span><h3>快篩完成</h3><p>可以挑前三名了</p></div>';
    return;
  }

  $('jobCursor').textContent = `${state.jobIndex + 1}/${deck.length}`;
  $('jobCard').innerHTML = `
    <div>
      <span class="job-mark">${jobMark(job)}</span>
      <h3 class="job-title">${chunkTitle(job.title)}</h3>
      <p>${job.majorCategory || '職業憧憬卡'}${job.minorCategory ? '｜' + job.minorCategory : ''}｜${job.displayCategory}</p>
    </div>
  `;
}

function moveJob(like) {
  const deck = currentDeck();
  const job = deck[state.jobIndex];
  if (job && like && !state.likedJobs.some(item => item.id === job.id)) {
    state.likedJobs.push(job);
  }

  state.jobIndex = Math.min(state.jobIndex + 1, deck.length);
  $('jobCard').animate([
    { transform: `translateX(${like ? 48 : -48}px) rotate(${like ? 3 : -3}deg)`, opacity: 0.2 },
    { transform: 'none', opacity: 1 }
  ], { duration: 220 });
  renderJobCard();
}

function renderLikedJobs() {
  const pool = state.likedJobs.length ? state.likedJobs : currentDeck();
  $('likedJobs').innerHTML = pool.map(job => `
    <button class="liked-job ${state.rankedJobs.some(item => item?.id === job.id) ? 'selected' : ''}" data-job-id="${job.id}">
      <strong><span class="mini-mark">${jobMark(job)}</span>${job.title}</strong><br>
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
  const center = `<div class="core-node"><span class="mini-mark">${jobMark(first)}</span><br>${first.title}</div>`;
  const placed = nodes.map((value, index) => {
    const angle = (Math.PI * 2 / Math.max(nodes.length, 1)) * index - Math.PI / 2;
    const x = 50 + Math.cos(angle) * 34;
    const y = 50 + Math.sin(angle) * 34;
    const deg = angle * 180 / Math.PI;
    return `
      <div class="link-line" style="--accent:${ATTR[value.category].color};left:50%;top:50%;width:110px;transform:rotate(${deg}deg)"></div>
      <div class="value-node" style="--accent:${ATTR[value.category].color};left:calc(${x}% - 58px);top:calc(${y}% - 37px)">${value.name}</div>
    `;
  }).join('');

  $('skillTree').innerHTML = center + placed;
  const strategy = getCleanStrategySkill(first);
  if (overlaps.length) {
    $('synergyText').textContent = `大成功！這份工作能滋養你渴望的「${overlaps.map(v => v.name).join('、')}」生活。已裝備特攻護盾：${strategy.gameName}`;
  } else if (first.richValueId?.length) {
    $('synergyText').textContent = '這張職業卡已有 richValueId，但和本次選出的價值沒有交集。可以作為諮詢討論點。';
  } else {
    $('synergyText').textContent = '這張職業卡尚未匯入正式 richValueId。畫面先用本次生涯屬性做示意，補齊資料後會自動改成精準連線。';
  }
}

function buildReport(updateHash = true) {
  const student = $('studentName').value.trim() || '未命名隊員';
  const top = topAttr();
  $('reportName').textContent = student;
  $('basicName').textContent = student;
  $('basicTitle').textContent = ATTR[top].title;
  const vals = careerValuesData.filter(value => state.chosenValueIds.has(value.id));
  $('reportValues').innerHTML = vals.slice(0, 18).map(value => `<span class="value-chip">${value.name}</span>`).join('');
  const ranked = state.rankedJobs.filter(Boolean);
  let iepListHtml = '';
  ranked.forEach((job, index) => {
    const finalStrategy = getTeacherStrategyText(job);
    const categoryLabel = job.category ? job.category.toUpperCase() : 'UNCLASSIFIED';
    iepListHtml += `
      <div class="iep-job-block" style="margin-bottom:20px;padding:15px;border-left:4px solid #00F5D4;background-color:rgba(255,255,255,0.03);border-radius:0 8px 8px 0;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:8px;">
          <span style="color:#FF007F;font-weight:bold;font-size:14px;letter-spacing:1px;">MISSION ${index + 1}</span>
          <span style="color:#888;font-size:12px;">屬性標籤：${categoryLabel}</span>
        </div>
        <h3 style="color:#ffffff;margin:0 0 10px 0;font-size:20px;font-weight:600;">
          ${escapeHtml(job.name || job.title)}
        </h3>
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
    const r = maxR * (state.scores[key] / 5 || 0.05);
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
    .map((job, index) => {
      const finalStrategy = getTeacherStrategyText(job);
      return `【志願 ${index + 1}】${job.name || job.title}：轉銜授課策略：${finalStrategy}`;
    })
    .join('\n');
}

function toast(text) {
  $('toast').textContent = text;
  $('toast').classList.add('show');
  setTimeout(() => $('toast').classList.remove('show'), 1600);
}

$('startSwipe').addEventListener('click', () => openStage('stage2'));
$('rejectBtn').addEventListener('click', () => moveJob(false));
$('likeBtn').addEventListener('click', () => moveJob(true));
$('finishSwipe').addEventListener('click', () => {
  openStage('stage3');
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

document.addEventListener('keydown', event => {
  if (!$('stage2').classList.contains('active')) return;
  if (event.key === 'ArrowLeft') moveJob(false);
  if (event.key === 'ArrowRight') moveJob(true);
});

document.querySelectorAll('[data-stage-pill]').forEach(pill => {
  pill.addEventListener('click', () => {
    const stageId = pill.dataset.stagePill === '1' ? 'stage1' : pill.dataset.stagePill === '2' ? 'stage2' : 'stage3';
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

renderQuestion();
if (location.hash) {
  const target = stageFromHash();
  if (target === 'reportStage') buildReport(false);
  else openStage(target, false);
} else {
  history.replaceState({ stage: 'stage1' }, '', '#stage1');
}
