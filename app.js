const STORAGE_KEY = 'eenhoorn-rekenen-v2';
const levels = [
  ['Cijfers 1 t/m 5', 'mixed', 1, 5, 'Hoeveel zie je?'],
  ['Plaatjes 1 t/m 5', 'mixed', 1, 5, 'Hoeveel zie je?'],
  ['Rekenrek & dobbelsteen', 'mixed', 1, 6, 'Welk cijfer past erbij?'],
  ['Tot en met 10', 'mixed', 6, 10, 'Tel slim: zie je groepjes van 5?'],
  ['Tienframe tot 10', 'tenframe', 1, 10, 'Hoeveel fiches zie je in het frame?'],
  ['Dominostenen tot 10', 'domino', 1, 10, 'Hoeveel stippen tel je samen?'],
  ['Telrij tot 10', 'line', 1, 10, 'Welk getal is roze?'],
  ['Erbij tot 10', 'add', 1, 10, 'Los het sommetje op.'],
  ['Eraf tot 10', 'subtract', 1, 10, 'Los het sommetje op.'],
  ['Mix: rekenen tot 10', 'mathmix', 1, 10, 'Jij kunt al echt rekenen!']
];

let db = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{"lastName":"","profiles":{}}');
let currentName = db.lastName || '';
let game = null;
let activeTheme = 'unicorn';

const $ = (id) => document.getElementById(id);
const screens = ['startScreen','modeScreen','mapScreen','gameScreen','resultScreen'];

function setTheme(theme){
  activeTheme = theme === 'dino' ? 'dino' : 'unicorn';
  document.body.dataset.theme = activeTheme;
  const appTitle = $('appTitle');
  if (appTitle) {
    appTitle.textContent = activeTheme === 'dino' ? 'Dino Rekenen' : 'Eenhoorn Rekenen';
  }

  const unicornBtn = $('themeUnicornBtn');
  const dinoBtn = $('themeDinoBtn');
  if (unicornBtn && dinoBtn) {
    const isDino = activeTheme === 'dino';
    unicornBtn.classList.toggle('active', !isDino);
    dinoBtn.classList.toggle('active', isDino);
    unicornBtn.setAttribute('aria-pressed', String(!isDino));
    dinoBtn.setAttribute('aria-pressed', String(isDino));
  }
  return activeTheme;
}

function getProfileKey(name){ return name.trim().toLowerCase(); }

function getProfile(){
  if(!currentName) return { scores: {} };
  const key = getProfileKey(currentName);
  if(!db.profiles[key]) db.profiles[key] = { displayName: currentName, scores: {}, practiceCompletions: {} };
  if(!db.profiles[key].practiceCompletions) db.profiles[key].practiceCompletions = {};
  return db.profiles[key];
}

function save(){ 
  db.lastName = currentName;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db)); 
}

function show(id){ screens.forEach(s => $(s).classList.toggle('hidden', s !== id)); }
function starsTotal(){ return Object.values(getProfile().scores).reduce((a,b) => a + b, 0); }
function isUnlocked(index){ return true; }

function init(){ 
  if(!$('switchPlayerBtn')) {
    const btn = document.createElement('button');
    btn.id = 'switchPlayerBtn';
    btn.className = 'text-button';
    btn.innerHTML = '👤 Wissel speler';
    btn.style.marginRight = '15px';
    btn.onclick = () => {
      $('playerName').value = '';
      show('startScreen');
    };
    const resetBtn = $('resetButton');
    if (resetBtn && resetBtn.parentNode) {
      resetBtn.parentNode.insertBefore(btn, resetBtn);
    }
  }

  setTheme('unicorn');
  const profile = getProfile();
  $('playerName').value = profile.displayName || currentName; 
  if(currentName) showModeMenu(); else show('startScreen'); 
}

function showModeMenu(){
  const profile = getProfile();
  for(let exercise = 1; exercise <= 11; exercise++){
    const button = $(`level${exercise}Button`);
    if(!button) continue;
    const previousExercise = ['counting', 'friendsOfTen', 'addition', 'neighbourSequence', 'neighbourChoice', 'splitToTen', 'splitToTwenty', 'mathToTwenty', 'skipCounting2', 'skipCounting5'][exercise - 2];
    const isTestPlayer = getProfileKey(currentName) === 'test';
    const unlocked = exercise === 1 || isTestPlayer || profile.practiceCompletions[previousExercise] === true;
    button.disabled = !unlocked;
    button.classList.toggle('is-locked', !unlocked);
    button.setAttribute('aria-disabled', String(!unlocked));
    let lock = button.querySelector('.mode-lock');
    if(!unlocked && !lock){
      lock = document.createElement('span');
      lock.className = 'mode-lock';
      lock.setAttribute('aria-hidden', 'true');
      lock.textContent = '🔒';
      button.appendChild(lock);
    } else if(unlocked && lock){
      lock.remove();
    }
  }
  show('modeScreen');
}

function showMap(){ 
  const profile = getProfile();
  const nameToShow = profile.displayName || currentName || 'rekenmaatje';
  $('welcomeText').textContent = `Hoi ${nameToShow}!`; 
  $('starTotal').textContent = starsTotal(); 
  const grid = $('levelGrid'); 
  grid.innerHTML = ''; 

  levels.forEach((level, index) => { 
    const score = profile.scores[index] || 0; 
    const b = document.createElement('button'); 
    b.className='level-card'; 
    b.disabled=false; 
    b.innerHTML = `<span class="level-number">LEVEL ${index+1}</span><h3>${level[0]}</h3><p>20 opdrachten</p><span class="card-stars">⭐ ${score}/20</span>`; 
    b.onclick=()=>startLevel(index); 
    grid.appendChild(b); 
  }); 
  show('mapScreen'); 
}

function pick(min,max){ return Math.floor(Math.random()*(max-min+1))+min; }

function chooseAlternateKind(options, previousKind) {
  const available = previousKind ? options.filter((kind) => kind !== previousKind) : options;
  const pool = available.length ? available : options;
  return pool[Math.floor(Math.random() * pool.length)];
}

function getMixedOptions(levelIndex) {
  if (levelIndex === 0) return ['rekenrek', 'dice'];
  if (levelIndex === 1) return ['apple', 'egg'];
  if (levelIndex === 2) return ['dice', 'rekenrek'];
  if (levelIndex === 3) return ['tenframe', 'domino'];
  return ['rekenrek', 'apple', 'dice'];
}

function makeQuestion(levelIndex, number, prevAnswer, prevKind){ 
  const [,type,min,max,instruction] = levels[levelIndex]; 
  let kind=type, answer, a, b; 
  
  if(type==='mixed') {
    const options = getMixedOptions(levelIndex);
    kind = chooseAlternateKind(options, prevKind);
  }
  if(type==='mathmix') kind = prevKind === 'add' ? 'subtract' : 'add'; 
  
  // Voorkom dubbele vragen achter elkaar
  do {
    if(kind==='add'){ 
      a=pick(1,Math.min(5,max-1)); 
      b=pick(1,max-a); 
      answer=a+b; 
    } else if(kind==='subtract'){ 
      a=pick(2,max); 
      b=pick(1,a-1); 
      answer=a-b; 
    } else { 
      answer=pick(min,max); 
    }
  } while (answer === prevAnswer && (max - min) > 0);

  // Gebruik emoticons alleen voor kleine aantallen.
  if(kind==='apple' && answer > 4){
    kind = 'rekenrek';
  }

  const themeRoll = Math.random();
  const neutralEmoji = '🍎';
  const themedEmoji = activeTheme === 'dino' ? '🦖' : '🦄';
  const emoji = themeRoll < 0.5 ? themedEmoji : neutralEmoji;
  return {kind,answer,a,b,instruction,emoji}; 
}

function makeNeighbourSequenceQuestion(){
  const length = pick(4, 5);
  const start = pick(1, 8);
  const missingIndex = pick(0, length - 1);
  const sequence = Array.from({ length }, (_, index) => start + index);
  const answer = sequence[missingIndex];
  sequence[missingIndex] = null;

  return {
    kind: 'neighbourSequence',
    answer,
    sequence,
    instruction: 'Vul het ontbrekende getal in.',
    hint: 'Kijk goed naar de volgorde van de getallen.'
  };
}

function makeSkipCountingQuestion(step, kind = `skipCounting${step}`){
  const maxStartMultiple = Math.floor(100 / step) - 3;
  const start = step * pick(1, maxStartMultiple);
  const missingIndex = pick(0, 3);
  const sequence = Array.from({length:4}, (_, index) => start + index * step);
  const answer = sequence[missingIndex];
  sequence[missingIndex] = null;
  return {
    kind,
    step,
    sequence,
    answer,
    instruction: 'Vul het ontbrekende getal in.',
    hint: 'Kijk goed naar de getallen.'
  };
}

function makeNeighbourChoiceQuestion(){
  const target = pick(2, 9);
  const mode = Math.random() > 0.5 ? 'large' : 'small';
  const answer = mode === 'large' ? target + 1 : target - 1;

  return {
    kind: 'neighbourChoice',
    answer,
    target,
    mode,
    instruction: mode === 'large' ? 'Wat is de grote buur van dit getal?' : 'Wat is de kleine buur van dit getal?',
    hint: 'Denk aan het getal dat net eerder of later komt.'
  };
}

function makeFriendsOfTenQuestion(){
  const visualKind = chooseAlternateKind(['egg', 'rekenrek'], null);
  const given = pick(1, 9);
  return {
    kind: 'friendsOfTen',
    given,
    visualKind,
    answer: 10 - given,
    instruction: `Het vriendje van 10: hoeveel moet er bij ${given} om 10 te maken?`,
    hint: 'Kijk naar de lege plekken. Hoeveel ontbreken er tot 10?'
  };
}

function makeCountingQuestion(previousKind){
  const kind = chooseAlternateKind(['apple', 'egg', 'dice', 'rekenrek'], previousKind);
  const max = kind === 'apple' ? 4 : kind === 'dice' ? 6 : 10;
  const answer = pick(1, max);
  const themedEmoji = activeTheme === 'dino' ? '🦖' : '🦄';
  const emoji = Math.random() < 0.5 ? themedEmoji : '⭐';
  return {
    kind,
    answer,
    emoji,
    instruction: 'Hoeveel zie je?'
  };
}

function makeAdditionQuestion(){
  const a = pick(1, 9);
  const b = pick(1, 10 - a);
  const themedEmoji = activeTheme === 'dino' ? '🦖' : '🦄';
  return {
    kind: 'add',
    a,
    b,
    answer: a + b,
    emoji: Math.random() < 0.5 ? themedEmoji : '⭐',
    instruction: 'Los het sommetje op.'
  };
}

function makeMathToTwentyQuestion(){
  const operator = Math.random() < 0.5 ? '+' : '-';
  let a, b;
  if(operator === '+'){
    a = pick(11, 18);
    b = pick(1, 20 - a);
  } else {
    a = pick(11, 20);
    b = pick(1, Math.min(9, a - 10));
  }
  return {
    kind: 'mathToTwenty',
    answer: operator === '+' ? a + b : a - b,
    a,
    b,
    operator,
    instruction: 'Los de som op.',
    hint: 'Kijk goed naar de eenheden!'
  };
}

function makeSplitQuestion(maxTotal, kind){
  const total = pick(2, maxTotal);
  const given = pick(1, total - 1);
  return {
    kind,
    total,
    given,
    answer: total - given,
    instruction: `Splits ${total} in ${given} en ?`,
    hint: 'Kijk hoeveel fiches er nog bij moeten.'
  };
}

function makeSplitToTenQuestion(){
  return makeSplitQuestion(10, 'splitToTen');
}

function makeSplitToTwentyQuestion(){
  return makeSplitQuestion(20, 'splitToTwenty');
}

function getQuestionSignature(question){
  switch(question.kind){
    case 'neighbourSequence':
      return JSON.stringify([question.kind, question.sequence]);
    case 'skipCounting':
    case 'skipCounting2':
    case 'skipCounting5':
    case 'skipCounting10':
      return JSON.stringify([question.kind, question.step, question.sequence]);
    case 'neighbourChoice':
      return JSON.stringify([question.kind, question.target, question.mode]);
    case 'friendsOfTen':
      return JSON.stringify([question.kind, question.given]);
    case 'counting':
      return JSON.stringify([question.kind, question.answer, question.emoji]);
    case 'addition':
      return JSON.stringify([question.kind, question.a, question.b]);
    case 'add':
    case 'subtract':
      return JSON.stringify([question.kind, question.a, question.b]);
    case 'mathToTwenty':
      return JSON.stringify([question.kind, question.a, question.operator, question.b]);
    case 'splitToTen':
    case 'splitToTwenty':
      return JSON.stringify([question.kind, question.total, question.given]);
    default:
      return JSON.stringify([question.kind, question.answer, question.a, question.b, question.emoji, question.sequence]);
  }
}

function makeAlternativeQuestion(previousQuestion, question){
  if(question.kind === 'neighbourChoice'){
    question.mode = previousQuestion.mode === 'large' ? 'small' : 'large';
    question.answer = question.mode === 'large' ? question.target + 1 : question.target - 1;
  } else if(question.kind === 'neighbourSequence'){
    const missingIndex = previousQuestion.sequence.indexOf(null);
    const firstKnownIndex = previousQuestion.sequence.findIndex((value) => value !== null);
    const start = previousQuestion.sequence[firstKnownIndex] - firstKnownIndex;
    const nextStart = start === 8 ? 1 : start + 1;
    question.sequence = Array.from({length:previousQuestion.sequence.length}, (_, index) => nextStart + index);
    question.answer = question.sequence[missingIndex];
    question.sequence[missingIndex] = null;
  } else if(question.kind === 'skipCounting' || ['skipCounting2', 'skipCounting5', 'skipCounting10'].includes(question.kind)){
    const missingIndex = previousQuestion.sequence.indexOf(null);
    const firstKnownIndex = previousQuestion.sequence.findIndex((value) => value !== null);
    const previousStart = previousQuestion.sequence[firstKnownIndex] - firstKnownIndex * previousQuestion.step;
    const maxStart = (Math.floor(100 / previousQuestion.step) - 3) * previousQuestion.step;
    const start = previousStart >= maxStart ? previousQuestion.step : previousStart + previousQuestion.step;
    question.step = previousQuestion.step;
    question.sequence = Array.from({length:4}, (_, index) => start + index * question.step);
    question.answer = question.sequence[missingIndex];
    question.sequence[missingIndex] = null;
  } else if(question.kind === 'friendsOfTen'){
    question.given = previousQuestion.given === 9 ? 1 : previousQuestion.given + 1;
    question.visualKind = previousQuestion.visualKind === 'egg' ? 'rekenrek' : 'egg';
    question.answer = 10 - question.given;
    question.instruction = `Het vriendje van 10: hoeveel moet er bij ${question.given} om 10 te maken?`;
  } else if(question.kind === 'addition' || question.kind === 'add'){
    question.a = previousQuestion.a === 9 ? 1 : previousQuestion.a + 1;
    question.b = 1;
    question.answer = question.a + question.b;
  } else if(question.kind === 'mathToTwenty'){
    question.operator = previousQuestion.operator;
    const maxA = question.operator === '+' ? 18 : 20;
    question.a = previousQuestion.a === maxA ? 11 : previousQuestion.a + 1;
    question.b = 1;
    question.answer = question.operator === '+' ? question.a + question.b : question.a - question.b;
  } else if(question.kind === 'splitToTen' || question.kind === 'splitToTwenty'){
    const maxTotal = question.kind === 'splitToTen' ? 10 : 20;
    question.total = previousQuestion.total === maxTotal ? 2 : previousQuestion.total + 1;
    question.given = 1;
    question.answer = question.total - question.given;
    question.instruction = `Splits ${question.total} in ${question.given} en ?`;
  } else if(question.kind === 'counting'){
    const kinds = ['apple', 'egg', 'dice', 'rekenrek'];
    question.kind = kinds[(kinds.indexOf(previousQuestion.kind) + 1) % kinds.length];
    question.answer = 1;
  }
  return question;
}

function makeQuestionSeries(count, makeQuestionAt){
  const questions = [];
  for(let index = 0; index < count; index++){
    const previousQuestion = questions[index - 1] || null;
    let question = makeQuestionAt(previousQuestion, index);
    let attempts = 0;
    while(previousQuestion && getQuestionSignature(question) === getQuestionSignature(previousQuestion) && attempts < 100){
      question = makeQuestionAt(previousQuestion, index);
      attempts++;
    }
    if(previousQuestion && getQuestionSignature(question) === getQuestionSignature(previousQuestion)){
      question = makeAlternativeQuestion(previousQuestion, question);
    }
    questions.push(question);
  }
  return questions;
}

function startLevel(index){
  game = { kind: 'classic', level:index, current:0, correct:0, questions: [], isSubmitting:false};
  const questions = makeQuestionSeries(20, (previousQuestion, questionIndex) =>
    makeQuestion(index, questionIndex, previousQuestion?.answer ?? null, previousQuestion?.kind ?? null)
  );
  game.questions = questions;
  show('gameScreen'); 
  renderQuestion(); 
}

function startNeighbourSequence(){
  const questions = makeQuestionSeries(10, () => makeNeighbourSequenceQuestion());
  game = { kind: 'neighbourSequence', current:0, correct:0, questions, isSubmitting:false };
  show('gameScreen');
  renderQuestion();
}

function startSkipCounting(step){
  const kind = `skipCounting${step}`;
  const questions = makeQuestionSeries(10, () => makeSkipCountingQuestion(step, kind));
  game = { kind, current:0, correct:0, questions, isSubmitting:false };
  show('gameScreen');
  renderQuestion();
}

function startNeighbourChoice(){
  const questions = makeQuestionSeries(10, () => makeNeighbourChoiceQuestion());
  game = { kind: 'neighbourChoice', current:0, correct:0, questions, isSubmitting:false };
  show('gameScreen');
  renderQuestion();
}

function startFriendsOfTen(){
  const questions = makeQuestionSeries(10, () => makeFriendsOfTenQuestion());
  game = { kind: 'friendsOfTen', current:0, correct:0, questions, isSubmitting:false };
  show('gameScreen');
  renderQuestion();
}

function startPractice(kind){
  const generators = {
    counting: makeCountingQuestion,
    friendsOfTen: makeFriendsOfTenQuestion,
    addition: makeAdditionQuestion,
    splitToTen: makeSplitToTenQuestion,
    splitToTwenty: makeSplitToTwentyQuestion
  };
  const questions = makeQuestionSeries(10, (previousQuestion) =>
    kind === 'counting' ? generators[kind](previousQuestion?.kind ?? null) : generators[kind]()
  );
  game = { kind, current:0, correct:0, questions, isSubmitting:false };
  show('gameScreen');
  renderQuestion();
}

function startMathToTwenty(){
  const questions = makeQuestionSeries(10, () => makeMathToTwentyQuestion());
  game = { kind: 'mathToTwenty', current:0, correct:0, questions, isSubmitting:false };
  show('gameScreen');
  renderQuestion();
}

function isStandalonePractice(){
  return game && ['neighbourSequence', 'neighbourChoice', 'friendsOfTen', 'counting', 'addition', 'splitToTen', 'splitToTwenty', 'mathToTwenty', 'skipCounting', 'skipCounting2', 'skipCounting5', 'skipCounting10'].includes(game.kind);
}

function getRekenrekSVG(topCount = 5, bottomCount = 0) {
  const w = 600, h = 220;
  const rodY1 = 75, rodY2 = 145;
  const beadW = 24, beadH = 34, beadStep = 25;
  const leftStartX = 67;  // 55px + halve kraalbreedte
  const rightEndX = 533;  // 545px - halve kraalbreedte

  function drawBead(cx, cy, isRed) {
    const grad = isRed ? "url(#redBeadGrad)" : "url(#whiteBeadGrad)";
    const stroke = isRed ? "#991B1B" : "#64748B";
    const x = cx - beadW / 2;
    const y = cy - beadH / 2;
    return `<g>
      <rect x="${x}" y="${y}" width="${beadW}" height="${beadH}" rx="6" fill="${grad}" stroke="${stroke}" stroke-width="1.5" />
      <line x1="${x + 2}" y1="${cy}" x2="${x + beadW - 2}" y2="${cy}" stroke="${stroke}" stroke-width="1" stroke-opacity="0.4" />
    </g>`;
  }

  function drawRow(rowY, countLeft) {
    let html = '';
    // Kraaltjes naar links geschoven
    for (let i = 0; i < countLeft; i++) {
      html += drawBead(leftStartX + i * beadStep, rowY, i < 5);
    }
    // Kraaltjes nog aan de rechterkant
    for (let i = countLeft; i < 10; i++) {
      html += drawBead(rightEndX - (9 - i) * beadStep, rowY, i < 5);
    }
    return html;
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="100%" style="height:auto; max-width:550px; display:block; margin:0 auto;">
      <defs>
        <linearGradient id="woodGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#E5B382" />
          <stop offset="50%" stop-color="#D49A6A" />
          <stop offset="100%" stop-color="#B37848" />
        </linearGradient>
        <linearGradient id="rodGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#F1F5F9" />
          <stop offset="50%" stop-color="#94A3B8" />
          <stop offset="100%" stop-color="#475569" />
        </linearGradient>
        <linearGradient id="redBeadGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#FCA5A5" />
          <stop offset="35%" stop-color="#EF4444" />
          <stop offset="100%" stop-color="#991B1B" />
        </linearGradient>
        <linearGradient id="whiteBeadGrad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stop-color="#FFFFFF" />
          <stop offset="50%" stop-color="#E2E8F0" />
          <stop offset="100%" stop-color="#94A3B8" />
        </linearGradient>
      </defs>

      <!-- Houten liggers achter -->
      <rect x="25" y="25" width="550" height="14" rx="7" fill="url(#woodGrad)" stroke="#8C542B" stroke-width="2" />
      <rect x="25" y="181" width="550" height="14" rx="7" fill="url(#woodGrad)" stroke="#8C542B" stroke-width="2" />

      <!-- Metalen stangen (Boven en Onder) -->
      <rect x="45" y="${rodY1 - 3}" width="510" height="6" rx="3" fill="url(#rodGrad)" />
      <rect x="45" y="${rodY2 - 3}" width="510" height="6" rx="3" fill="url(#rodGrad)" />

      <!-- Kraaltjes -->
      ${drawRow(rodY1, Math.min(topCount, 10))}
      ${drawRow(rodY2, Math.min(bottomCount, 10))}

      <!-- Houten zijpijlers -->
      <rect x="15" y="15" width="32" height="190" rx="10" fill="url(#woodGrad)" stroke="#8C542B" stroke-width="2.5" />
      <line x1="31" y1="20" x2="31" y2="200" stroke="#FFE4C4" stroke-width="1.5" opacity="0.5" />
      <rect x="553" y="15" width="32" height="190" rx="10" fill="url(#woodGrad)" stroke="#8C542B" stroke-width="2.5" />
      <line x1="569" y1="20" x2="569" y2="200" stroke="#FFE4C4" stroke-width="1.5" opacity="0.5" />
    </svg>
  `;
}

function renderVisual(q){ 
  const v=$('visual'); 
  v.innerHTML=''; 
  const item = q.emoji || '🍎';
  
  if(q.kind === 'neighbourSequence' || q.kind.startsWith('skipCounting')){
    const tiles = q.sequence.map((value) => {
      const isMissing = value === null;
      const missingMarker = q.kind.startsWith('skipCounting') ? '?' : '…';
      return `<div class="sequence-box ${isMissing ? 'missing' : ''}">${isMissing ? missingMarker : value}</div>`;
    }).join('');
    v.innerHTML = `<div class="sequence-row">${tiles}</div>`;
    return;
  }

  if(q.kind === 'neighbourChoice'){
    const arrow = q.mode === 'large' ? '→' : '←';
    const answerBox = '<div class="sequence-box answer-slot">?</div>';
    const targetBox = `<div class="sequence-box target">${q.target}</div>`;
    v.innerHTML = `
      <div class="sequence-row neighbour-row">
        ${q.mode === 'large' ? `${targetBox}<div class="arrow-badge">${arrow}</div>${answerBox}` : `${answerBox}<div class="arrow-badge">${arrow}</div>${targetBox}`}
      </div>
    `;
    return;
  }

  if(q.kind === 'mathToTwenty'){
    v.innerHTML = `
      <div class="make-ten-equation math-twenty-equation" role="img" aria-label="${q.a} ${q.operator} ${q.b} is gelijk aan vraagteken">
        <span class="make-ten-given">${q.a}</span>
        <span class="make-ten-operator">${q.operator}</span>
        <span class="make-ten-given">${q.b}</span>
        <span class="make-ten-operator">=</span>
        <span class="make-ten-missing">?</span>
      </div>
    `;
    return;
  }

  if(q.kind === 'splitToTen' || q.kind === 'splitToTwenty'){
    const counters = Array.from({length:q.given}, () => '<span class="split-counter"></span>').join('');
    const splitLabel = q.kind === 'splitToTwenty'
      ? `${q.total} wordt gesplitst. In het eerste deel staat ${q.given}. Het tweede deel ontbreekt.`
      : `${q.total} wordt gesplitst. In het eerste deel zitten ${q.given} fiches. Het tweede deel ontbreekt.`;
    const knownPart = q.kind === 'splitToTwenty'
      ? `<div class="split-part split-known split-known-number">${q.given}</div>`
      : `<div class="split-part split-known">${counters}</div>`;
    v.innerHTML = `
      <div class="split-diagram" role="img" aria-label="${splitLabel}">
        <div class="split-whole make-ten-target">${q.total}</div>
        <div class="split-branch-lines" aria-hidden="true"><span></span><span></span><span></span></div>
        <div class="split-parts">
          ${knownPart}
          <div class="split-part split-unknown" aria-hidden="true">?</div>
        </div>
      </div>
    `;
    return;
  }

  if(q.kind === 'friendsOfTen'){
    const visualQuestion = { ...q, kind: q.visualKind, answer: q.given, emoji: '🥚', completion: true };
    renderVisual(visualQuestion);
    const materials = document.createElement('div');
    materials.className = 'friends-of-ten-materials';
    while(v.firstChild) materials.appendChild(v.firstChild);
    v.innerHTML = `
      <div class="friends-of-ten-visual">
        <div class="make-ten-equation" role="img" aria-label="${q.given} plus het ontbrekende aantal is samen 10">
          <span class="make-ten-given">${q.given}</span>
          <span class="make-ten-operator" aria-hidden="true">+</span>
          <span class="make-ten-missing" aria-hidden="true">?</span>
          <span class="make-ten-operator" aria-hidden="true">=</span>
          <span class="make-ten-target">10</span>
        </div>
      </div>
    `;
    v.querySelector('.friends-of-ten-visual').appendChild(materials);
    return;
  }

  if(q.kind==='apple'){
    const groups = Array.from({length:Math.ceil(q.answer / 5)}, (_, groupIndex) => {
      const count = Math.min(5, q.answer - groupIndex * 5);
      return `<div class="count-group">${`<span class="apple">${item}</span>`.repeat(count)}</div>`;
    }).join('');
    v.innerHTML = `<div class="count-groups">${groups}</div>`;
  }
  else if(q.kind==='dice'){ 
    const renderDiceDots = (num) => {
      const dotPositions = num===1 ? [4] :
                           num===2 ? [0,8] :
                           num===3 ? [0,4,8] :
                           num===4 ? [0,2,6,8] :
                           [0,2,4,6,8];
      return Array.from({length:9}, (_, i) => `<span class="dot ${dotPositions.includes(i) ? '' : 'empty'}"></span>`).join('');
    };
    const dice = q.answer > 5 ? [5, q.answer - 5] : [q.answer];
    v.innerHTML = `<div class="count-groups">${dice.map((value) => `<div class="count-group"><div class="dice">${renderDiceDots(value)}</div></div>`).join('')}</div>`;
  }
  else if(q.kind==='tenframe'){
    // Visueel Tienframe: 2 rijen van 5 vakjes
    const cells = Array.from({length:10}, (_, i) => {
      const filled = i < q.answer;
      return `<div style="width:42px; height:42px; border:2px solid #6d28d9; border-radius:10px; display:flex; align-items:center; justify-content:center; background:#faf5ff;">
        ${filled ? '<span style="width:28px; height:28px; border-radius:50%; background:#ec4899; box-shadow:inset 0 -3px 0 #be185d;"></span>' : ''}
      </div>`;
    }).join('');
    v.innerHTML = `<div style="display:grid; grid-template-columns:repeat(5, 42px); gap:6px; padding:12px; background:#fff; border:3px solid #6d28d9; border-radius:18px; box-shadow:0 6px 0 #ddd6fe;">${cells}</div>`;
  }
  else if(q.kind==='domino'){
    const left = Math.min(q.answer, 5);
    const right = Math.max(0, q.answer - 5);
    const renderDots = (num) => {
      const d = num===1 ? [4] :
                num===2 ? [0,8] :
                num===3 ? [0,4,8] :
                num===4 ? [0,2,6,8] :
                [0,2,4,6,8];
      return Array.from({length:9}, (_, i) => `<span class="dot ${d.includes(i) ? '' : 'empty'}"></span>`).join('');
    };
    v.innerHTML = `<div style="display:flex; gap:6px; background:#fff; padding:8px; border:2px solid #1f2937; border-radius:10px; box-shadow:none;">
      <div class="dice">${renderDots(left)}</div>
      <div class="dice">${right > 0 ? renderDots(right) : ''}</div>
    </div>`;
  }
  else if(q.kind==='egg'){ 
    const cells = q.completion ? 10 : Math.ceil(q.answer / 5) * 5;
    v.innerHTML='<div class="egg-box">'+Array.from({length:cells},(_,i)=>`<span class="egg ${i<q.answer?'':'empty'}"></span>`).join('')+'</div>';
  }
  else if(q.kind==='abacus'){
    const beadCount = q.completion ? 10 : Math.ceil(q.answer / 5) * 5;
    const rows = Array.from({length:Math.ceil(beadCount / 5)}, (_, row) => `<div class="abacus-row">${Array.from({length:Math.min(5, beadCount - row * 5)}, (_, column) => {
      const index = row * 5 + column;
      return `<span class="bead ${index < q.answer ? 'active' : ''}"></span>`;
    }).join('')}</div>`).join('');
    v.innerHTML = `<div class="abacus" aria-label="Telraam met ${q.answer} kralen">${rows}</div>`;
  }
  else if(q.kind==='rekenrek'){
    v.innerHTML = getRekenrekSVG(q.answer, q.bottomCount || 0);
  }
  else if(q.kind==='line'){ 
    v.innerHTML = '<div class="number-line">' + Array.from({length:10}, (_, i) => {
      const number = i + 1;
      const isTarget = number === q.answer;
      return `
        <div class="number-slot ${isTarget ? 'target' : ''}">
          <span class="line-tick" aria-hidden="true"></span>
          <span class="line-value">${number}</span>
        </div>
      `;
    }).join('') + '</div>';
  }
  else { 
    const symbol = q.kind==='add' ? '+' : '−';
    let helperHtml = '';
    
    if (q.kind === 'add') {
      helperHtml = getRekenrekSVG(q.a, q.b);
    } else {
      helperHtml = getRekenrekSVG(q.a - q.b, q.b);
    }
    v.innerHTML = `<div><div class="equation">${q.a} ${symbol} ${q.b} = ?</div>${helperHtml}</div>`;
  } 
}

function renderQuestion(){ 
  const q=game.questions[game.current]; 
  game.isSubmitting = false; 
  $('answerInput').disabled = false;

  if (isStandalonePractice()) {
    const labels = {
      neighbourSequence: 'Buurgetallen',
      neighbourChoice: 'Grote en kleine buur',
      skipCounting: 'Tellen met sprongen',
      skipCounting2: 'Tellen met sprongen +2',
      skipCounting5: 'Tellen met sprongen +5',
      skipCounting10: 'Tellen met sprongen +10',
      friendsOfTen: 'Aanvullen tot 10',
      counting: 'Getallen benoemen',
      addition: 'Rekensommetjes tot 10',
      splitToTen: 'Splitsen tot 10',
      splitToTwenty: 'Splitsen tot 20',
      mathToTwenty: 'Rekenen tot 20'
    };
    const label = labels[game.kind];
    $('levelTitle').textContent = label;
    $('progressText').textContent = `${game.current + 1} van ${game.questions.length}`;
    $('progressBar').style.width = `${((game.current + 1) / game.questions.length) * 100}%`;
    $('instruction').textContent = q.instruction;
    $('questionHint').textContent = q.hint;
    const isVisualOnly = game.kind === 'friendsOfTen' || game.kind === 'splitToTen' || game.kind === 'splitToTwenty';
    $('instruction').classList.toggle('hidden', isVisualOnly);
    $('questionHint').classList.toggle('hidden', isVisualOnly);
    renderVisual(q);
    $('answerInput').value='';
    $('feedback').textContent='';
    $('answerInput').focus();
    return;
  }

  $('levelTitle').textContent=`Level ${game.level+1}: ${levels[game.level][0]}`; 
  $('progressText').textContent=`${game.current+1} van 20`; 
  $('progressBar').style.width=`${(game.current/20)*100}%`; 
  $('instruction').textContent=q.instruction; 
  
  const objectName = q.emoji === '🦄' ? 'eenhoorns' : q.emoji === '🦖' ? 'dino\'s' : 'appeltjes';
  $('questionHint').textContent=q.kind==='add'||q.kind==='subtract'?`Je mag de ${objectName} erbij tellen.`:'Kijk goed, je hoeft niet te haasten.'; 
  
  renderVisual(q); 
  $('answerInput').value=''; 
  $('feedback').textContent='';$('answerInput').focus(); 
}

function submitAnswer(e){ 
  e.preventDefault(); 
  if(game.isSubmitting) return; 
  
  const answer=Number($('answerInput').value), q=game.questions[game.current]; 
  if($('answerInput').value==='') return; 
  
  game.isSubmitting = true; 
  $('answerInput').disabled = true;

  const good=answer===q.answer; 
  if(good) game.correct++; 
  $('feedback').textContent=good?'Goed zo! ⭐':'Nog even kijken… Het antwoord is '+q.answer+'.'; 
  $('feedback').className='feedback '+(good?'correct':'incorrect');
  if(good && game.current < game.questions.length - 1){
    startAnswerFireworks();
  }
  
  setTimeout(()=>{ 
    game.current++; 
    const totalQuestions = game.questions.length;
    if(game.current >= totalQuestions) finishLevel(); else renderQuestion(); 
  }, good?750:1500); 
}

function startConfetti({ particleCount = 190, duration = 5000, particleScale = 1, effect = 'finish' } = {}){
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'confetti-canvas';
  canvas.dataset.effect = effect;
  canvas.dataset.duration = String(duration);
  canvas.dataset.particleCount = String(particleCount);
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);

  const context = canvas.getContext('2d');
  const colors = document.body.dataset.theme === 'dino'
    ? ['#22c55e', '#86efac', '#facc15', '#fb7185', '#38bdf8']
    : ['#8b5cf6', '#f472b6', '#fbbf24', '#34d399', '#60a5fa'];
  const gravity = 380;
  const startedAt = performance.now();
  let previousTime = startedAt;
  let animationFrame;

  const particles = Array.from({length:particleCount}, () => ({
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight * 0.55 - window.innerHeight * 0.2,
    velocityX: (Math.random() - 0.5) * 150,
    velocityY: Math.random() * 100 - 70,
    rotation: Math.random() * Math.PI * 2,
    rotationSpeed: (Math.random() - 0.5) * 9,
    width: (6 + Math.random() * 7) * particleScale,
    height: (8 + Math.random() * 9) * particleScale,
    color: colors[Math.floor(Math.random() * colors.length)],
    round: Math.random() < 0.25
  }));

  function resizeCanvas(){
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * pixelRatio);
    canvas.height = Math.round(window.innerHeight * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  function animate(now){
    const elapsed = now - startedAt;
    if (elapsed >= duration) {
      canvas.remove();
      return;
    }

    if (canvas.width !== Math.round(window.innerWidth * Math.min(window.devicePixelRatio || 1, 2)) ||
        canvas.height !== Math.round(window.innerHeight * Math.min(window.devicePixelRatio || 1, 2))) {
      resizeCanvas();
    }

    const delta = Math.min((now - previousTime) / 1000, 0.05);
    previousTime = now;
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    context.globalAlpha = Math.min(1, (duration - elapsed) / 350);

    for (const particle of particles) {
      particle.velocityY += gravity * delta;
      particle.x += particle.velocityX * delta;
      particle.y += particle.velocityY * delta;
      particle.rotation += particle.rotationSpeed * delta;
      if (particle.x < -20) particle.x = window.innerWidth + 20;
      if (particle.x > window.innerWidth + 20) particle.x = -20;

      context.save();
      context.translate(particle.x, particle.y);
      context.rotate(particle.rotation);
      context.fillStyle = particle.color;
      if (particle.round) {
        context.beginPath();
        context.arc(0, 0, particle.width / 2, 0, Math.PI * 2);
        context.fill();
      } else {
        context.fillRect(-particle.width / 2, -particle.height / 2, particle.width, particle.height);
      }
      context.restore();
    }

    context.globalAlpha = 1;
    animationFrame = requestAnimationFrame(animate);
  }

  resizeCanvas();
  animationFrame = requestAnimationFrame(animate);
}

function startAnswerFireworks(){
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const canvas = document.createElement('canvas');
  canvas.className = 'confetti-canvas';
  canvas.dataset.effect = 'answer-fireworks';
  canvas.dataset.duration = '900';
  canvas.setAttribute('aria-hidden', 'true');
  document.body.appendChild(canvas);

  const context = canvas.getContext('2d');
  const colors = document.body.dataset.theme === 'dino'
    ? ['#22c55e', '#86efac', '#facc15', '#fb7185']
    : ['#8b5cf6', '#f472b6', '#fbbf24', '#34d399'];
  const duration = 900;
  const startedAt = performance.now();
  const bursts = [
    { x: window.innerWidth * 0.4, y: window.innerHeight * 0.36, delay: 0 },
    { x: window.innerWidth * 0.6, y: window.innerHeight * 0.3, delay: 100 }
  ];
  const sparks = bursts.flatMap((burst) => Array.from({length:18}, () => {
    const angle = Math.random() * Math.PI * 2;
    const speed = 65 + Math.random() * 80;
    return {
      ...burst,
      velocityX: Math.cos(angle) * speed,
      velocityY: Math.sin(angle) * speed,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: 1.5 + Math.random() * 1.5
    };
  }));

  function resizeCanvas(){
    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(window.innerWidth * pixelRatio);
    canvas.height = Math.round(window.innerHeight * pixelRatio);
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  function animate(now){
    const elapsed = now - startedAt;
    if (elapsed >= duration) {
      canvas.remove();
      return;
    }

    if (canvas.width !== Math.round(window.innerWidth * Math.min(window.devicePixelRatio || 1, 2)) ||
        canvas.height !== Math.round(window.innerHeight * Math.min(window.devicePixelRatio || 1, 2))) {
      resizeCanvas();
    }

    context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (const spark of sparks) {
      const age = (elapsed - spark.delay) / 1000;
      if (age < 0 || age > duration / 1000) continue;
      const fade = 1 - age / (duration / 1000);
      const x = spark.x + spark.velocityX * age;
      const y = spark.y + spark.velocityY * age + 28 * age * age;

      context.globalAlpha = fade;
      context.strokeStyle = spark.color;
      context.lineWidth = spark.size;
      context.lineCap = 'round';
      context.shadowColor = spark.color;
      context.shadowBlur = 8;
      context.beginPath();
      context.moveTo(x - spark.velocityX * 0.045, y - spark.velocityY * 0.045);
      context.lineTo(x, y);
      context.stroke();
    }
    context.globalAlpha = 1;
    context.shadowBlur = 0;
    animationFrame = requestAnimationFrame(animate);
  }

  resizeCanvas();
  animationFrame = requestAnimationFrame(animate);
}

function finishLevel(){ 
  if (isStandalonePractice()) {
    $('resultEmoji').textContent = game.correct >= 8 ? '🎉' : '🌈';
    $('resultTitle').textContent = game.correct >= 8 ? 'Goed gedaan!' : 'Je bent er bijna!';
    const labels = {
      neighbourSequence: 'buurgetallen',
      neighbourChoice: 'buurgetallen',
      skipCounting: 'reeksen met sprongen',
      skipCounting2: 'reeksen met sprongen van 2',
      skipCounting5: 'reeksen met sprongen van 5',
      skipCounting10: 'reeksen met sprongen van 10',
      friendsOfTen: 'aanvulsommen tot 10',
      counting: 'telvragen',
      addition: 'rekensommen',
      splitToTen: 'splitsommen tot 10',
      splitToTwenty: 'splitsommen tot 20',
      mathToTwenty: 'sommen tot 20'
    };
    const label = labels[game.kind];
    $('resultText').textContent = `Je had ${game.correct} van de ${game.questions.length} ${label} goed.`;
    $('earnedStars').textContent = '⭐'.repeat(Math.min(game.correct, 10)) + (game.correct > 10 ? ' +' + (game.correct - 10) : '');
    if(game.correct === game.questions.length){
      getProfile().practiceCompletions[game.kind] = true;
      save();
    }
    show('resultScreen');
    startConfetti();
    return;
  }

  const profile = getProfile();
  const old=profile.scores[game.level]||0; 
  profile.scores[game.level]=Math.max(old,game.correct); 
  save(); 
  
  const unlocked=game.correct>=14; 
  $('resultEmoji').textContent=unlocked?'🎉':'🌈'; 
  $('resultTitle').textContent=unlocked?'Level gehaald!':'Goed geoefend!';$('resultText').textContent=`Je had ${game.correct} van de 20 opdrachten goed.${unlocked?' Het volgende level is nu vrij!':' Voor het volgende level heb je 14 sterren nodig. Probeer dit level gerust nog eens.'}`; 
  $('earnedStars').textContent='⭐'.repeat(Math.min(game.correct,10))+(game.correct>10?' +'+(game.correct-10):''); 
  show('resultScreen'); 
  startConfetti();
}

$('startButton').onclick=()=>{ 
  const inputName = $('playerName').value.trim(); 
  currentName = inputName || 'rekenmaatje'; 
  
  const profile = getProfile();
  if(!profile.displayName) profile.displayName = currentName;
  
  save(); 
  showModeMenu(); 
};

$('themeUnicornBtn').onclick = () => setTheme('unicorn');
$('themeDinoBtn').onclick = () => setTheme('dino');

$('level1Button').onclick = () => startPractice('counting');
$('level2Button').onclick = () => startPractice('friendsOfTen');
$('level3Button').onclick = () => startPractice('addition');
$('level4Button').onclick = () => startNeighbourSequence();
$('level5Button').onclick = () => startNeighbourChoice();
$('level6Button').onclick = () => startPractice('splitToTen');
$('level7Button').onclick = () => startPractice('splitToTwenty');
$('level8Button').onclick = () => startMathToTwenty();
$('level9Button').onclick = () => startSkipCounting(2);
$('level10Button').onclick = () => startSkipCounting(5);
$('level11Button').onclick = () => startSkipCounting(10);
$('mapBackButton').onclick = () => showModeMenu();

$('answerForm').onsubmit=submitAnswer; 
$('backButton').onclick=() => {
  if (isStandalonePractice()) {
    showModeMenu();
    return;
  }
  showMap();
};
$('againButton').onclick=() => {
  if (isStandalonePractice()) {
    showModeMenu();
    return;
  }
  showMap();
};

$('resetButton').onclick=()=>{ 
  const n1 = pick(6, 9);
  const n2 = pick(6, 9);
  const correctMathAnswer = n1 * n2;
  
  const parentAnswer = prompt(`🔒 Ouder-controle\n\nAls je alle opgeslagen gegevens wilt wissen, los dan eerst deze som op:\n\nHoeveel is ${n1} x ${n2}?`);
  
  if(parentAnswer !== null && Number(parentAnswer) === correctMathAnswer) {
    if(confirm('Weet je heel zeker dat je ALLE opgeslagen profielen en voortgang wilt wissen?')){ 
      db = { lastName: '', profiles: {} };
      currentName = '';
      save(); 
      init(); 
      alert('Alle gegevens zijn succesvol gewist.');
    } 
  } else if(parentAnswer !== null) {
    alert('Dat antwoord is helaas niet juist. Er is niets gewist.');
  }
};

init();