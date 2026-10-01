'use strict';

// ---------- Element refs ----------
const sourceTextEl = document.getElementById('sourceText');
const savedSelect = document.getElementById('savedSelect');
const btnDeleteSaved = document.getElementById('btnDeleteSaved');
const saveLabel = document.getElementById('saveLabel');
const btnSave = document.getElementById('btnSave');
const btnExport = document.getElementById('btnExport');
const btnImport = document.getElementById('btnImport');
const importFile = document.getElementById('importFile');
const saveHint = document.getElementById('saveHint');
const btnStart = document.getElementById('btnStart');
const typedTextEl = document.getElementById('typedText');
const timerEl = document.getElementById('timer');
const btnSubmit = document.getElementById('btnSubmit');
const btnBack = document.getElementById('btnBack');
const submitHint = document.getElementById('submitHint');
const summaryEl = document.getElementById('summary');
const originalOut = document.getElementById('originalOut');
const typedOut = document.getElementById('typedOut');
const btnAgain = document.getElementById('btnAgain');
const btnNew = document.getElementById('btnNew');
const historyList = document.getElementById('historyList');
const btnClearAll = document.getElementById('btnClearAll');
const btnHelp = document.getElementById('btnHelp');
const helpModal = document.getElementById('helpModal');
const btnHelpClose = document.getElementById('btnHelpClose');
const providerSelect = document.getElementById('providerSelect');
const localFields = document.getElementById('localFields');
const localUrl = document.getElementById('localUrl');
const deepseekFields = document.getElementById('deepseekFields');
const deepseekKey = document.getElementById('deepseekKey');
const deepseekModel = document.getElementById('deepseekModel');
const customFields = document.getElementById('customFields');
const customUrl = document.getElementById('customUrl');
const customKey = document.getElementById('customKey');
const customModel = document.getElementById('customModel');
const btnSaveSettings = document.getElementById('btnSaveSettings');
const settingsHint = document.getElementById('settingsHint');
const assistedLevelEl = document.getElementById('assistedLevel');
const practiceHints = document.getElementById('practiceHints');
const practiceHintsList = document.getElementById('practiceHintsList');
const practiceTitleEl = document.getElementById('practiceTitle');

const views = {
  setup: document.getElementById('viewSetup'),
  practice: document.getElementById('viewPractice'),
  result: document.getElementById('viewResult'),
};

// ---------- LLM comparison config ----------
const LLM_TIMEOUT_MS = 120000;
const LLM_SYSTEM_PROMPT = "You are a memorisation coach. Compare the ORIGINAL text with an ATTEMPT written from memory. A point from ORIGINAL counts as REMEMBERED when the ATTEMPT conveys the same meaning, even if it uses different words, synonyms, reordered phrases, or different grammar. Examples: 'The cat sat on the mat' and 'The mat had a cat sitting on it' are the same point. 'It began in 1789' and 'It started in 1789' are the same point. 'It overthrew the monarchy' and 'It got rid of the king' are the same point. A point is MISSING only when the idea itself is absent from the ATTEMPT. Content in the ATTEMPT that is not in ORIGINAL, or that contradicts ORIGINAL, is FABRICATED. Every distinct fact/claim in ORIGINAL is a separate point; if the ATTEMPT omits part of a claim, the missing part is flagged. All quotes must be exact contiguous substrings of the given text, character-for-character.";

// ---------- State ----------
let sourceText = '';
let startTime = null; // null until the first keystroke
let timerInterval = null;

// ---------- Records persistence ----------
// Declared before loadRecords() below: loadRecords reads it at module top,
// and referencing a const before its declaration would throw a TDZ error.
const STORAGE_KEY = 'blurt.records';
let records = loadRecords();

function loadRecords() {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('blurt: could not load records from localStorage', err);
    return [];
  }
}

function persistRecords() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (err) {
    console.warn('blurt: could not save records to localStorage', err);
  }
}

function newRecordId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return 'r' + Date.now().toString(36) + Math.random().toString(36).slice(2);
}

// ---------- Saved texts persistence ----------
const SAVED_KEY = 'blurt.savedTexts';
let savedTexts = loadSavedTexts();

function loadSavedTexts() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SAVED_KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.warn('blurt: could not load saved texts from localStorage', err);
    return [];
  }
}

function persistSavedTexts() {
  try {
    localStorage.setItem(SAVED_KEY, JSON.stringify(savedTexts));
  } catch (err) {
    console.warn('blurt: could not save texts to localStorage', err);
  }
}

// Case-insensitive label lookup (labels are unique ignoring case).
function findSavedByLabel(label) {
  const needle = label.toLowerCase();
  return savedTexts.find((s) => s.label.toLowerCase() === needle);
}

// Exact-text lookup: used at submit time to tag a record with a label.
function findSavedByText(text) {
  return savedTexts.find((s) => s.text === text);
}

// Label of the saved text that `text` was loaded from, or '' when unsaved.
// Saved texts are stored trimmed, so a raw textarea value with surrounding
// whitespace still matches; imported texts may keep their original padding.
function savedLabelForText(text) {
  const match = findSavedByText(text) || findSavedByText(text.trim());
  return match ? match.label : '';
}

// ---------- Provider settings persistence ----------
const SETTINGS_KEY = 'blurt.settings';
const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';
const DEFAULT_LOCAL_URL = 'http://192.168.15.115:8080/v1/chat/completions';

function defaultSettings() {
  return {
    provider: 'local',
    localUrl: DEFAULT_LOCAL_URL,
    deepseekKey: '',
    deepseekModel: 'deepseek-v4-flash',
    customUrl: '',
    customKey: '',
    customModel: '',
  };
}

let settings = loadSettings();

function loadSettings() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SETTINGS_KEY) || 'null');
    return parsed && typeof parsed === 'object'
      ? Object.assign(defaultSettings(), parsed)
      : defaultSettings();
  } catch (err) {
    console.warn('blurt: could not load settings from localStorage', err);
    return defaultSettings();
  }
}

function persistSettings() {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (err) {
    console.warn('blurt: could not save settings to localStorage', err);
  }
}

function syncSettingsFromUI() {
  settings.provider = providerSelect.value;
  settings.localUrl = localUrl.value.trim();
  settings.deepseekKey = deepseekKey.value.trim();
  settings.deepseekModel = deepseekModel.value.trim() || 'deepseek-v4-flash';
  settings.customUrl = customUrl.value.trim();
  settings.customKey = customKey.value.trim();
  settings.customModel = customModel.value.trim();
}

function applySettingsToUI() {
  providerSelect.value = settings.provider;
  localUrl.value = settings.localUrl;
  deepseekKey.value = settings.deepseekKey;
  deepseekModel.value = settings.deepseekModel;
  customUrl.value = settings.customUrl;
  customKey.value = settings.customKey;
  customModel.value = settings.customModel;
  updateProviderFields();
}

function updateProviderFields() {
  localFields.hidden = providerSelect.value !== 'local';
  deepseekFields.hidden = providerSelect.value !== 'deepseek';
  customFields.hidden = providerSelect.value !== 'custom';
}

function validateSettings() {
  if (settings.provider === 'local' && settings.localUrl === '') {
    return 'Enter the local llama.cpp endpoint URL.';
  }
  if (settings.provider === 'deepseek' && settings.deepseekKey === '') {
    return 'Enter your DeepSeek API key.';
  }
  if (settings.provider === 'custom') {
    if (settings.customUrl === '') return 'Enter the custom endpoint URL.';
    if (settings.customModel === '') return 'Enter the model name for the custom endpoint.';
  }
  return '';
}

// Rebuild the saved-texts <select>, preserving the current selection when
// the entry still exists.
function renderSavedSelect() {
  const prev = savedSelect.value;
  savedSelect.replaceChildren();
  const placeholder = document.createElement('option');
  placeholder.value = '';
  placeholder.textContent = '— Saved texts —';
  savedSelect.appendChild(placeholder);
  const sorted = savedTexts.slice().sort((a, b) => a.label.localeCompare(b.label));
  for (const s of sorted) {
    const opt = document.createElement('option');
    opt.value = s.id;
    opt.textContent = s.label;
    savedSelect.appendChild(opt);
  }
  savedSelect.value = sorted.some((s) => s.id === prev) ? prev : '';
  btnDeleteSaved.disabled = savedSelect.value === '';
}

// ---------- Saved texts export/import ----------
function showSaveHint(msg, ok) {
  saveHint.textContent = msg;
  saveHint.classList.toggle('ok', !!ok);
  saveHint.hidden = false;
}

function exportSavedTexts() {
  const payload = {
    version: 1,
    exportedAt: new Date().toISOString(),
    savedTexts: savedTexts,
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'blurt-saved-texts-' + new Date().toISOString().slice(0, 10) + '.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Merge imported entries by label: a label that already exists locally is
// overwritten with the imported text, new labels are appended. Accepts either
// the versioned export shape ({savedTexts: [...]}) or a bare array.
function importSavedTexts(file) {
  const reader = new FileReader();
  reader.onload = () => {
    let parsed;
    try {
      parsed = JSON.parse(String(reader.result));
    } catch (err) {
      showSaveHint('Not a valid JSON file.', false);
      return;
    }
    const entries = Array.isArray(parsed)
      ? parsed
      : parsed && Array.isArray(parsed.savedTexts)
        ? parsed.savedTexts
        : null;
    if (!entries) {
      showSaveHint('Not a valid blurt export file.', false);
      return;
    }
    let added = 0;
    let updated = 0;
    let skipped = 0;
    const now = new Date().toISOString();
    for (const entry of entries) {
      const label = typeof entry.label === 'string' ? entry.label.trim() : '';
      const text = typeof entry.text === 'string' ? entry.text : '';
      if (!label || !text.trim()) {
        skipped++;
        continue;
      }
      const existing = findSavedByLabel(label);
      if (existing) {
        existing.text = text;
        existing.updatedAt = now;
        updated++;
      } else {
        let id = typeof entry.id === 'string' && entry.id !== '' ? entry.id : newRecordId();
        while (savedTexts.some((s) => s.id === id)) id = newRecordId();
        savedTexts.push({
          id: id,
          label: label,
          text: text,
          createdAt: typeof entry.createdAt === 'string' ? entry.createdAt : now,
          updatedAt: now,
        });
        added++;
      }
    }
    persistSavedTexts();
    renderSavedSelect();
    showSaveHint(
      'Imported ' + added + ' new, updated ' + updated +
      (skipped > 0 ? ', skipped ' + skipped : '') + '.', true);
  };
  reader.onerror = () => showSaveHint('Could not read the file.', false);
  reader.readAsText(file);
}

// ---------- Assisted mode preference ----------
const ASSISTED_KEY = 'blurt.assisted';
// Difficulty levels: easy (about half the words shown), normal (about a
// quarter), hard (about a tenth). Keywords — words containing digits — are
// never shown at any level; you must recall those yourself.
const ASSISTED_LEVELS = ['off', 'easy', 'normal', 'hard'];
let assisted = loadAssisted();

function loadAssisted() {
  const raw = localStorage.getItem(ASSISTED_KEY);
  // Legacy boolean preference: '1' was the aggressive cloze (~10% shown),
  // closest to today's hard level.
  if (raw === '1') return 'hard';
  return ASSISTED_LEVELS.includes(raw) ? raw : 'off';
}

function persistAssisted() {
  try {
    localStorage.setItem(ASSISTED_KEY, assisted);
  } catch (err) {
    console.warn('blurt: could not save assisted preference', err);
  }
}

// ---------- Views ----------
function showView(name) {
  if (name === 'practice') {
    enterPractice();
  } else {
    stopTimer();
  }
  for (const key of Object.keys(views)) {
    views[key].hidden = key !== name;
  }
}

function enterPractice() {
  startTime = null;
  typedTextEl.value = '';
  submitHint.hidden = true;
  // Show which saved text is being blurted; unsaved texts show no title.
  const label = savedLabelForText(sourceText);
  practiceTitleEl.textContent = label;
  practiceTitleEl.hidden = label === '';
  assistedLevelEl.value = assisted;
  renderPracticeHints();
  timerEl.textContent = '00:00.0';
  stopTimer();
  timerInterval = setInterval(updateTimer, 100);
  // Defer: a focus() inside a click handler is overridden by the button's
  // default focus action, so run it after the event completes.
  setTimeout(() => typedTextEl.focus(), 0);
}

function stopTimer() {
  if (timerInterval !== null) {
    clearInterval(timerInterval);
    timerInterval = null;
  }
}

function updateTimer() {
  timerEl.textContent =
    startTime === null ? '00:00.0' : formatDuration(performance.now() - startTime);
}

// ---------- Comparison ----------
// Build the provider-specific request. Local llama.cpp needs the thinking
// toggle disabled and omits `model` (server uses whatever is loaded);
// hosted OpenAI-compatible providers (DeepSeek, custom) require `model` and
// must NOT receive llama.cpp-only fields like chat_template_kwargs.
function buildLlmRequest(original, typed) {
  const user = 'ORIGINAL:\n' + original + '\n\nATTEMPT:\n' + typed + '\n\n' +
    'Respond with JSON only:\n' +
    '{"points_total": <number>, "points_missed": <number>, "missing": ["<exact quote from ORIGINAL>", ...], "fabricated": ["<exact quote from ATTEMPT>", ...]}\n\n' +
    '- points_total: number of distinct points/ideas in ORIGINAL.\n' +
    '- points_missed: how many of those are absent from ATTEMPT.\n' +
    '- missing: the smallest contiguous quotes from ORIGINAL covering exactly the forgotten points. Quote the smallest span that contains the omitted idea (a clause, not a whole sentence, when only part is omitted). Empty array if none.\n' +
    '- fabricated: the smallest contiguous quotes from ATTEMPT covering invented or meaning-changing content. Empty array if none.\n' +
    '- missing and fabricated arrays may be empty but must be present.';
  const base = {
    messages: [
      { role: 'system', content: LLM_SYSTEM_PROMPT },
      { role: 'user', content: user },
    ],
    temperature: 0,
    max_tokens: 1024,
    response_format: { type: 'json_object' },
  };
  if (settings.provider === 'local') {
    return {
      url: settings.localUrl,
      headers: { 'Content-Type': 'application/json' },
      body: Object.assign({}, base, { chat_template_kwargs: { enable_thinking: false } }),
    };
  }
  if (settings.provider === 'deepseek') {
    return {
      url: DEEPSEEK_URL,
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + settings.deepseekKey,
      },
      // deepseek-v4 defaults to thinking mode, which returns reasoning_content
      // and can leave content empty; disabled makes it answer directly.
      body: Object.assign({}, base, {
        model: settings.deepseekModel,
        thinking: { type: 'disabled' },
      }),
    };
  }
  const headers = { 'Content-Type': 'application/json' };
  if (settings.customKey) headers.Authorization = 'Bearer ' + settings.customKey;
  return {
    url: settings.customUrl,
    headers: headers,
    body: Object.assign({}, base, { model: settings.customModel }),
  };
}

// Query the configured provider for a meaning-based comparison verdict.
// Any failure throws → caller falls back to the word-level diff.
async function callLlmCompare(original, typed) {
  const req = buildLlmRequest(original, typed);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  let resp;
  try {
    resp = await fetch(req.url, {
      method: 'POST',
      headers: req.headers,
      signal: controller.signal,
      body: JSON.stringify(req.body),
    });
  } finally {
    clearTimeout(timer);
  }
  if (!resp.ok) throw new Error('LLM HTTP ' + resp.status);
  const data = await resp.json();
  let raw = data.choices && data.choices[0] && data.choices[0].message
    ? data.choices[0].message.content : '';
  if (typeof raw !== 'string' || raw === '') throw new Error('LLM empty content');
  raw = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  const parsed = JSON.parse(raw); // throws on invalid → caller falls back
  return {
    pointsTotal: Number(parsed.points_total) || 0,
    pointsMissed: Number(parsed.points_missed) || 0,
    missing: Array.isArray(parsed.missing) ? parsed.missing : [],
    fabricated: Array.isArray(parsed.fabricated) ? parsed.fabricated : [],
  };
}

// Tokenise exactly as compare() does: trim, collapse whitespace, split on single spaces.
function tokenize(text) {
  const trimmed = text.trim();
  if (trimmed === '') return [];
  return trimmed.replace(/\s+/g, ' ').split(' ');
}

// Forgiving equality: case-insensitive, punctuation at word ends ignored.
// Change strictness here and nowhere else.
function tokenEq(a, b) {
  return stripPunct(a) === stripPunct(b);
}

function stripPunct(tok) {
  return tok.toLowerCase().replace(/^[^a-z0-9]+|[^a-z0-9]+$/g, '');
}

function compare(original, typed) {
  const origTokens = tokenize(original);
  const typedTokens = tokenize(typed);
  const total = origTokens.length;
  let missIdx;
  let extraIdx;

  if (origTokens.length <= 2000 && typedTokens.length <= 2000) {
    ({ missIdx, extraIdx } = lcsAlignment(origTokens, typedTokens));
  } else {
    // Positional fallback for very long texts: pair token i with token i;
    // tokens beyond the shorter array's end are unmatched. Non-equal aligned
    // pairs are treated as both miss and extra, keeping "aligned pairs are
    // equal" the invariant in both modes.
    missIdx = [];
    extraIdx = [];
    const n = Math.max(origTokens.length, typedTokens.length);
    for (let i = 0; i < n; i++) {
      const o = origTokens[i];
      const t = typedTokens[i];
      if (o === undefined) {
        extraIdx.push(i);
      } else if (t === undefined) {
        missIdx.push(i);
      } else if (!tokenEq(o, t)) {
        missIdx.push(i);
        extraIdx.push(i);
      }
    }
  }

  const correct = total - missIdx.length;
  const accuracyPct = total === 0 ? 100 : Math.round((correct / total) * 1000) / 10;
  return { total, correct, missIdx, extraIdx, accuracyPct };
}

// Semantic compare: LLM verdict → the same result shape renderResult expects.
function semanticResult(llm) {
  const total = llm.pointsTotal;
  const correct = Math.max(0, total - llm.pointsMissed);
  const accuracyPct = total === 0 ? 100 : Math.round((correct / total) * 1000) / 10;
  return {
    total,
    correct,
    accuracyPct,
    missIdx: quoteToTokenIdx(sourceText, llm.missing),
    extraIdx: quoteToTokenIdx(typedTextEl.value, llm.fabricated),
    fabricatedCount: llm.fabricated.length,
    missingQuotes: llm.missing,
  };
}

// Classic LCS DP over tokens (match = tokenEq), backtrace to aligned pairs.
// Unmatched original tokens = miss; unmatched typed tokens = extra.
function lcsAlignment(a, b) {
  const n = a.length;
  const m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      if (tokenEq(a[i], b[j])) {
        dp[i][j] = dp[i + 1][j + 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i + 1][j], dp[i][j + 1]);
      }
    }
  }
  const missIdx = [];
  const extraIdx = [];
  let i = 0;
  let j = 0;
  while (i < n && j < m) {
    if (tokenEq(a[i], b[j])) {
      i++;
      j++;
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      missIdx.push(i);
      i++;
    } else {
      extraIdx.push(j);
      j++;
    }
  }
  while (i < n) {
    missIdx.push(i);
    i++;
  }
  while (j < m) {
    extraIdx.push(j);
    j++;
  }
  return { missIdx, extraIdx };
}

// Map LLM quotes to contiguous token indices in `text` (tokenized like tokenize()).
// Primary: normalized case-insensitive substring search, whole-token inclusion.
// Fallback: greedy tokenEq sequence match. Unmatched quotes are skipped (console.warn), never fatal.
function quoteToTokenIdx(text, quotes) {
  const toks = tokenize(text);
  const norm = text.trim().replace(/\s+/g, ' ');
  const normLower = norm.toLowerCase();
  const idx = new Set();
  for (const quote of quotes) {
    const q = String(quote || '').trim().replace(/\s+/g, ' ');
    if (!q) continue;
    const pos = normLower.indexOf(q.toLowerCase());
    let start = -1;
    let end = -1;
    if (pos !== -1) {
      // Token covers the quote only if fully inside [pos, pos+q.length).
      let offset = 0;
      let first = -1;
      let last = -1;
      for (let i = 0; i < toks.length; i++) {
        const tEnd = offset + toks[i].length;
        if (offset >= pos && tEnd <= pos + q.length) {
          if (first === -1) first = i;
          last = i;
        }
        offset = tEnd + 1; // +1 for the single separating space
      }
      if (first !== -1) { start = first; end = last; }
    }
    if (start === -1) {
      // Fallback: match the quote's tokens (stripPunct) as a subsequence run.
      const qToks = tokenize(q);
      outer:
      for (let i = 0; i <= toks.length - qToks.length; i++) {
        for (let k = 0; k < qToks.length; k++) {
          if (!tokenEq(toks[i + k], qToks[k])) continue outer;
        }
        start = i;
        end = i + qToks.length - 1;
        break;
      }
    }
    if (start === -1) {
      console.warn('blurt: LLM quote not found in text:', q);
      continue;
    }
    for (let i = start; i <= end; i++) idx.add(i);
  }
  return Array.from(idx).sort((a, b) => a - b);
}

// ---------- Formatting ----------
function formatDuration(ms) {
  const tenths = Math.floor(ms / 100);
  const secs = Math.floor(tenths / 10);
  const minutes = Math.floor(secs / 60);
  const seconds = secs % 60;
  const tenth = tenths % 10;
  return minutes + ':' + String(seconds).padStart(2, '0') + '.' + tenth;
}

// Render one side of the diff: each token a span, mismatched tokens get cls.
function renderDiff(container, text, badIdx, cls) {
  const tokens = tokenize(text);
  const frag = document.createDocumentFragment();
  tokens.forEach((tok, i) => {
    if (i > 0) frag.appendChild(document.createTextNode(' '));
    const span = document.createElement('span');
    span.textContent = tok;
    if (badIdx.includes(i)) span.className = cls;
    frag.appendChild(span);
  });
  container.replaceChildren(frag);
}

function renderResult(result, durationMs, note, mode) {
  summaryEl.textContent =
    (mode === 'semantic'
      ? 'You remembered ' + result.correct + ' of ' + result.total + ' points (' + result.accuracyPct + '%).'
      : 'You got ' + result.correct + ' of ' + result.total + ' words right (' + result.accuracyPct + '%).') +
    ' Time: ' + formatDuration(durationMs) +
    (note ? ' ' + note : '') +
    (result.fabricatedCount > 0
      ? ' You added ' + result.fabricatedCount + ' thing' + (result.fabricatedCount === 1 ? '' : 's') + ' not in the original.'
      : '');
  renderDiff(originalOut, sourceText, result.missIdx, 'w-miss');
  renderDiff(typedOut, typedTextEl.value, result.extraIdx, 'w-extra');
}

// ---------- Assisted mode ----------
// Hints from the most recent semantic comparison: the missed points, cloze'd
// at the chosen difficulty level during the NEXT practice attempt.
let hintPoints = [];
let hintText = '';

// Fraction of non-keyword words shown at each level.
const ASSISTED_FRACTIONS = { easy: 0.5, normal: 0.25, hard: 0.1 };

// Cloze a missed quote at the chosen difficulty: the level's fraction of the
// non-keyword words is shown, picked at random. Keywords — tokens containing
// digits (dates, years, quantities) — are always blanked: they are the facts
// to recall. Short quotes still get at least one word shown when any exists.
function clientCloze(quote, level) {
  const toks = tokenize(quote);
  const fraction = ASSISTED_FRACTIONS[level] ?? 0.1;
  const candidates = [];
  for (let i = 0; i < toks.length; i++) {
    if (/\d/.test(stripPunct(toks[i]))) continue; // keyword: never shown
    candidates.push(i);
  }
  const count =
    candidates.length === 0 ? 0 : Math.max(1, Math.round(candidates.length * fraction));
  // Fisher–Yates shuffle, then keep the first `count` indices.
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }
  const keep = new Set(candidates.slice(0, count));
  return toks.map((tok, i) => keep.has(i) ? tok : '___').join(' ');
}

// Render one cloze string; ___ runs become highlighted spans.
function renderCloze(container, text) {
  const frag = document.createDocumentFragment();
  text.split('___').forEach((part, i) => {
    if (i > 0) {
      const blank = document.createElement('span');
      blank.className = 'cloze-blank';
      blank.textContent = '___';
      frag.appendChild(blank);
    }
    frag.appendChild(document.createTextNode(part));
  });
  container.appendChild(frag);
}

function renderPracticeHints() {
  practiceHintsList.replaceChildren();
  if (assisted === 'off' || hintPoints.length === 0 || hintText !== sourceText) {
    practiceHints.hidden = true;
    return;
  }
  for (const point of hintPoints) {
    const p = document.createElement('p');
    p.className = 'cloze';
    renderCloze(p, point);
    practiceHintsList.appendChild(p);
  }
  practiceHints.hidden = false;
}

// ---------- Events ----------
function updateStartEnabled() {
  btnStart.disabled = sourceTextEl.value.trim() === '';
}

sourceTextEl.addEventListener('input', () => {
  updateStartEnabled();
  saveHint.hidden = true;
});

savedSelect.addEventListener('change', () => {
  const entry = savedTexts.find((s) => s.id === savedSelect.value);
  if (entry) {
    sourceTextEl.value = entry.text;
    updateStartEnabled();
    saveHint.hidden = true;
  }
  btnDeleteSaved.disabled = savedSelect.value === '';
});

btnDeleteSaved.addEventListener('click', () => {
  const entry = savedTexts.find((s) => s.id === savedSelect.value);
  if (!entry) return;
  if (!confirm('Delete saved text "' + entry.label + '"?')) return;
  savedTexts = savedTexts.filter((s) => s.id !== entry.id);
  persistSavedTexts();
  renderSavedSelect();
});

btnSave.addEventListener('click', () => {
  const text = sourceTextEl.value.trim();
  const label = saveLabel.value.trim();
  if (text === '') {
    showSaveHint('Paste or type the text you want to save first.', false);
    return;
  }
  if (label === '') {
    showSaveHint('Enter a label for this text.', false);
    return;
  }
  const existing = findSavedByLabel(label);
  const now = new Date().toISOString();
  let entry;
  if (existing) {
    if (!confirm('Replace saved text "' + existing.label + '" with this text?')) return;
    entry = existing;
    entry.text = text;
    entry.updatedAt = now;
  } else {
    entry = { id: newRecordId(), label, text, createdAt: now, updatedAt: now };
    savedTexts.push(entry);
  }
  saveHint.hidden = true;
  persistSavedTexts();
  renderSavedSelect();
  savedSelect.value = entry.id;
  btnDeleteSaved.disabled = false;
  saveLabel.value = '';
});

btnExport.addEventListener('click', exportSavedTexts);

btnImport.addEventListener('click', () => {
  importFile.click();
});

importFile.addEventListener('change', () => {
  if (importFile.files && importFile.files[0]) {
    importSavedTexts(importFile.files[0]);
  }
  importFile.value = ''; // allow re-importing the same file later
});

btnStart.addEventListener('click', () => {
  sourceText = sourceTextEl.value;
  showView('practice');
});

typedTextEl.addEventListener('input', () => {
  if (startTime === null && typedTextEl.value.trim() !== '') {
    startTime = performance.now();
  }
});

assistedLevelEl.addEventListener('change', () => {
  assisted = assistedLevelEl.value;
  persistAssisted();
  renderPracticeHints();
});

btnBack.addEventListener('click', () => {
  showView('setup');
});

btnSubmit.addEventListener('click', async () => {
  if (typedTextEl.value.trim() === '') {
    submitHint.hidden = false;
    return;
  }
  const durationMs =
    startTime === null ? 0 : Math.round(performance.now() - startTime);
  stopTimer();
  btnSubmit.disabled = true;
  submitHint.hidden = false;
  submitHint.textContent = 'Comparing with the model…';
  let result;
  let mode = 'semantic';
  let note = '';
  try {
    result = semanticResult(await callLlmCompare(sourceText, typedTextEl.value));
  } catch (err) {
    console.warn('blurt: LLM compare failed, falling back to word diff', err);
    result = compare(sourceText, typedTextEl.value);
    mode = 'token';
    note = 'Model unavailable (' + err.message + ') — showing word-level comparison.';
  } finally {
    btnSubmit.disabled = false;
    submitHint.hidden = true;
  }
  const savedMatch = findSavedByText(sourceText);
  records.push({
    id: newRecordId(),
    text: sourceText,
    label: savedMatch ? savedMatch.label : undefined,
    durationMs: durationMs,
    accuracyPct: result.accuracyPct,
    totalWords: result.total,
    correctWords: result.correct,
    mode: mode,
    createdAt: new Date().toISOString(),
  });
  persistRecords();
  // Semantic comparisons update the assisted-recall hints for the next attempt
  // (a perfect attempt clears them). Token-mode failures leave prior hints.
  if (mode === 'semantic') {
    hintPoints = result.missingQuotes.map((quote) => clientCloze(quote, assisted));
    hintText = sourceText;
  }
  renderResult(result, durationMs, note, mode);
  renderHistory();
  showView('result');
});

btnAgain.addEventListener('click', () => {
  showView('practice');
});

btnNew.addEventListener('click', () => {
  sourceText = '';
  sourceTextEl.value = '';
  typedTextEl.value = '';
  saveHint.hidden = true;
  hintPoints = [];
  hintText = '';
  renderPracticeHints();
  updateStartEnabled();
  showView('setup');
});

btnClearAll.addEventListener('click', () => {
  if (records.length === 0) return;
  if (confirm('Delete all records?')) {
    records = [];
    persistRecords();
    renderHistory();
  }
});

providerSelect.addEventListener('change', updateProviderFields);

btnSaveSettings.addEventListener('click', () => {
  syncSettingsFromUI();
  const problem = validateSettings();
  if (problem) {
    settingsHint.textContent = problem;
    settingsHint.classList.remove('ok');
    settingsHint.hidden = false;
    return;
  }
  persistSettings();
  settingsHint.textContent = 'Settings saved.';
  settingsHint.classList.add('ok');
  settingsHint.hidden = false;
  setTimeout(() => {
    settingsHint.hidden = true;
    settingsHint.classList.remove('ok');
  }, 2000);
});

// ---------- Help ----------
function openHelp() {
  helpModal.hidden = false;
  document.body.classList.add('modal-open');
  btnHelpClose.focus();
}

function closeHelp() {
  helpModal.hidden = true;
  document.body.classList.remove('modal-open');
  btnHelp.focus();
}

btnHelp.addEventListener('click', openHelp);
btnHelpClose.addEventListener('click', closeHelp);
helpModal.addEventListener('click', (e) => {
  if (e.target === helpModal) closeHelp(); // backdrop click
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !helpModal.hidden) closeHelp();
});

// ---------- History ----------
function truncate(text, max) {
  return text.length <= max ? text : text.slice(0, max);
}

function renderHistory() {
  historyList.replaceChildren();

  if (records.length === 0) {
    historyList.appendChild(document.createTextNode('No records yet.'));
    return;
  }

  // Group by label when the attempt came from a saved text, else by exact
  // text; attempts newest first within a group.
  const groups = new Map();
  for (const rec of records) {
    const key = rec.label || rec.text;
    if (!groups.has(key)) groups.set(key, { label: rec.label || null, recs: [] });
    groups.get(key).recs.push(rec);
  }

  const groupEntries = Array.from(groups.entries()).sort((a, b) => {
    const aNewest = newestAttempt(a[1].recs);
    const bNewest = newestAttempt(b[1].recs);
    return bNewest - aNewest;
  });

  for (const [key, group] of groupEntries) {
    const attempts = group.recs;
    attempts.sort((x, y) => new Date(y.createdAt) - new Date(x.createdAt));

    const section = document.createElement('section');
    section.className = 'history-group';

    const header = document.createElement('button');
    header.type = 'button';
    header.className = 'history-header';
    header.textContent = group.label ? group.label : truncate(key, 80);
    header.title = key;
    header.addEventListener('click', () => {
      let loadText;
      if (group.label) {
        // Prefer the saved text's current content; fall back to the newest
        // attempt if the saved text was deleted.
        const saved = savedTexts.find((s) => s.label === group.label);
        loadText = saved ? saved.text : attempts[0].text;
      } else {
        loadText = key;
      }
      sourceTextEl.value = loadText;
      updateStartEnabled();
      showView('setup');
    });
    section.appendChild(header);

    const list = document.createElement('ul');
    list.className = 'history-attempts';
    for (const rec of attempts) {
      const li = document.createElement('li');
      li.className = 'history-row';

      const info = document.createElement('span');
      info.textContent =
        new Date(rec.createdAt).toLocaleString() + ' · ' +
        formatDuration(rec.durationMs) + ' · ' + rec.accuracyPct + '%';

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'history-delete';
      del.textContent = '×';
      del.title = 'Delete this record';
      del.addEventListener('click', () => {
        if (confirm('Delete this record?')) {
          records = records.filter((r) => r.id !== rec.id);
          persistRecords();
          renderHistory();
        }
      });

      li.append(info, del);
      list.appendChild(li);
    }
    section.appendChild(list);
    historyList.appendChild(section);
  }
}

function newestAttempt(attempts) {
  let newest = 0;
  for (const rec of attempts) {
    const t = new Date(rec.createdAt).getTime();
    if (t > newest) newest = t;
  }
  return newest;
}

// ---------- Boot ----------
showView('setup');
renderHistory();
renderSavedSelect();
applySettingsToUI();
