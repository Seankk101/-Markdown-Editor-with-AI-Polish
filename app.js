const editor  = document.getElementById('editor');
const preview = document.getElementById('preview');

// configure marked
marked.setOptions({ breaks: true, gfm: true });

// ---------- LIVE PREVIEW ----------

function onEdit() {
  renderPreview();
  updateWordCount();
  saveToStorage();
}

function renderPreview() {
  preview.innerHTML = marked.parse(editor.value || '');
}

function updateWordCount() {
  const words = editor.value.trim().split(/\s+/).filter(Boolean).length;
  document.getElementById('word-count').textContent =
    words + (words === 1 ? ' word' : ' words');
}

// ---------- FORMAT HELPERS ----------

function fmt(before, after) {
  const start = editor.selectionStart;
  const end   = editor.selectionEnd;
  const sel   = editor.value.substring(start, end);
  const replacement = before + (sel || 'text') + after;
  editor.setRangeText(replacement, start, end, 'select');
  editor.focus();
  onEdit();
}

function fmtLine(prefix) {
  const start   = editor.selectionStart;
  const lineStart = editor.value.lastIndexOf('\n', start - 1) + 1;
  editor.setRangeText(prefix, lineStart, lineStart, 'start');
  editor.focus();
  onEdit();
}

// ---------- AI PANEL ----------

function showAIPanel() {
  document.getElementById('ai-panel').classList.add('open');
}

function hideAIPanel() {
  document.getElementById('ai-panel').classList.remove('open');
  setAIStatus('');
}

function setAIStatus(msg) {
  const el = document.getElementById('ai-status');
  el.textContent = msg;
  el.className   = 'ai-status' + (msg ? ' active' : '');
}

const AI_PROMPTS = {
  improve:  'Improve the writing quality, clarity, and flow of this markdown text. Keep the same structure and length. Return only the improved markdown.',
  grammar:  'Fix all grammar, spelling, and punctuation errors in this markdown text. Do not change the meaning or structure. Return only the corrected markdown.',
  shorten:  'Make this markdown text 30% shorter while keeping all key information. Return only the shortened markdown.',
  expand:   'Expand this markdown text by adding more detail, examples, and explanation. Keep the same tone. Return only the expanded markdown.',
  headline: 'Rewrite the first heading in this markdown to be more compelling and clear. Keep the rest unchanged. Return only the full markdown.',
  bullets:  'Convert any long paragraphs in this markdown into concise bullet point lists. Return only the updated markdown.',
};

async function aiAction(action) {
  const text = editor.value.trim();
  if (!text) { setAIStatus('Write something first!'); return; }

  const btns = document.querySelectorAll('.ai-action-btn');
  btns.forEach(b => b.disabled = true);
  setAIStatus('AI is working...');

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        messages: [{
          role: 'user',
          content: AI_PROMPTS[action] + '\n\n---\n\n' + text
        }]
      })
    });

    const data   = await res.json();
    const result = data.content[0].text.trim();

    // strip markdown fences if model adds them
    editor.value = result.replace(/^```(?:markdown)?\n?/, '').replace(/\n?```$/, '');
    onEdit();
    setAIStatus('Done! Review the changes above.');
  } catch (err) {
    setAIStatus('AI error — please try again.');
  }

  btns.forEach(b => b.disabled = false);
}

// ---------- TOOLBAR ACTIONS ----------

function clearEditor() {
  if (editor.value && confirm('Clear all content?')) {
    editor.value = '';
    onEdit();
  }
}

function copyMarkdown() {
  navigator.clipboard.writeText(editor.value)
    .then(() => {
      const btn = document.querySelector('.tb-btn');
      btn.textContent = 'Copied!';
      setTimeout(() => btn.textContent = 'Copy MD', 1500);
    });
}

function downloadMarkdown() {
  const blob = new Blob([editor.value], { type: 'text/markdown' });
  const a    = document.createElement('a');
  a.href     = URL.createObjectURL(blob);
  a.download = 'document.md';
  a.click();
}

// ---------- LOCAL STORAGE ----------

function saveToStorage() {
  localStorage.setItem('md-editor-content', editor.value);
}

function loadFromStorage() {
  const saved = localStorage.getItem('md-editor-content');
  if (saved) editor.value = saved;
}

// ---------- INIT ----------
loadFromStorage();
renderPreview();
updateWordCount();