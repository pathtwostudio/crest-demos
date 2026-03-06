/**
 * Chat UI: message rendering, history state, input handling.
 */

const messages = [];
let onSendCallback = null;

let messagesEl, inputEl, sendBtn, loadingEl;

export function getMessages() {
  return messages.map((m) => ({ role: m.role, content: m.content }));
}

export function getRawMessages() {
  return messages;
}

export function initChatUI({ messagesContainer, input, sendButton, onSend }) {
  messagesEl = messagesContainer;
  inputEl = input;
  sendBtn = sendButton;
  onSendCallback = onSend;

  // Enter to send, Shift+Enter for newline
  inputEl.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  });

  sendBtn.addEventListener('click', handleSend);

  // Auto-resize textarea
  inputEl.addEventListener('input', () => {
    inputEl.style.height = 'auto';
    inputEl.style.height = Math.min(inputEl.scrollHeight, 120) + 'px';
  });
}

function handleSend() {
  const text = inputEl.value.trim();
  if (!text || inputEl.disabled) return;
  inputEl.value = '';
  inputEl.style.height = 'auto';
  if (onSendCallback) onSendCallback(text);
}

export function addUserMessage(text) {
  messages.push({ role: 'user', content: text });
  const el = document.createElement('div');
  el.className = 'chat-message chat-message--user';
  el.textContent = text;
  messagesEl.appendChild(el);
  scrollToBottom();
}

export function addAssistantMessage(text) {
  messages.push({ role: 'assistant', content: text });

  // Strip JSON fences from display text (case-insensitive, whitespace-tolerant)
  let displayText = text.replace(/```json\s*\n[\s\S]*?\s*```/gi, '').trim();

  // Strip bare JSON with formDefinition if no fences were used
  displayText = displayText.replace(/\{\s*"formDefinition"\s*:\s*\{[\s\S]*\}\s*\}/g, '').trim();

  const el = document.createElement('div');
  el.className = 'chat-message chat-message--assistant';

  // Simple markdown-like rendering (paragraphs)
  const paragraphs = displayText.split(/\n\n+/);
  for (const p of paragraphs) {
    if (!p.trim()) continue;
    const pEl = document.createElement('p');
    pEl.textContent = p.trim();
    el.appendChild(pEl);
  }

  if (!el.hasChildNodes()) {
    const pEl = document.createElement('p');
    pEl.textContent = 'Form updated.';
    el.appendChild(pEl);
  }

  messagesEl.appendChild(el);
  scrollToBottom();
}

export function addSystemMessage(text) {
  const el = document.createElement('div');
  el.className = 'chat-message chat-message--system';
  el.textContent = text;
  messagesEl.appendChild(el);
  scrollToBottom();
}

export function setLoading(loading) {
  inputEl.disabled = loading;
  sendBtn.disabled = loading;

  if (loading) {
    loadingEl = document.createElement('div');
    loadingEl.className = 'chat-loading';
    loadingEl.innerHTML = '<span class="spinner"></span> Thinking...';
    messagesEl.appendChild(loadingEl);
    scrollToBottom();
  } else if (loadingEl) {
    loadingEl.remove();
    loadingEl = null;
  }
}

function scrollToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

/**
 * Extract formDefinition JSON from a response string.
 * Returns the parsed object or null.
 */
const VALID_FIELD_TYPES = new Set([
  'text', 'date', 'datetime-local', 'email', 'number', 'select', 'textarea',
]);

const VALID_KEY = /^[a-zA-Z][a-zA-Z0-9_]*$/;

function validateFormDef(def) {
  if (!def || typeof def !== 'object') return false;
  if (typeof def.title !== 'string' || def.title.length > 200) return false;
  if (!Array.isArray(def.sections)) return false;

  for (const section of def.sections) {
    if (!['fields', 'dynamicRows'].includes(section.type)) return false;
    const fields = section.fields || section.rowFields || [];
    if (!Array.isArray(fields)) return false;
    for (const f of fields) {
      if (!f.key || !VALID_KEY.test(f.key)) return false;
      if (f.type && !VALID_FIELD_TYPES.has(f.type)) return false;
    }
  }
  return true;
}

/**
 * Extract formDefinition JSON from a response string.
 * Returns the parsed object or null. Validates structure before returning.
 */
export function extractFormDefinition(text) {
  // Try fenced JSON first (case-insensitive, whitespace-tolerant)
  const fenceMatch = text.match(/```json\s*\n([\s\S]*?)\s*```/i);
  if (fenceMatch) {
    try {
      const parsed = JSON.parse(fenceMatch[1]);
      const def = parsed.formDefinition;
      if (def && validateFormDef(def)) return def;
    } catch { /* fall through */ }
  }

  // Fallback: bare JSON object containing formDefinition
  const bareMatch = text.match(/\{\s*"formDefinition"\s*:\s*\{[\s\S]*\}\s*\}/);
  if (bareMatch) {
    try {
      const parsed = JSON.parse(bareMatch[0]);
      const def = parsed.formDefinition;
      if (def && validateFormDef(def)) return def;
    } catch { /* ignore */ }
  }

  return null;
}
