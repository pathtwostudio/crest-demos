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

export function pushMessage(role, content) {
  messages.push({ role, content });
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

  // Strip JSON fences from display text (case-insensitive)
  let displayText = text.replace(/```json\s*\n[\s\S]*?\n\s*```/gi, '').trim();

  // Strip bare JSON objects that look like form definitions
  displayText = displayText.replace(/\{[\s\n]*"(?:formDefinition|title)"[\s\S]*$/g, '').trim();

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
const KNOWN_FIELD_TYPES = new Set([
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
      // Normalize unknown field types to 'text' instead of rejecting
      if (f.type && !KNOWN_FIELD_TYPES.has(f.type)) {
        f.type = 'text';
      }
    }
  }
  return true;
}

/**
 * Extract a balanced JSON object starting from a given index.
 * Returns the substring or null.
 */
function extractBalancedJSON(text, startIdx) {
  let depth = 0;
  let inString = false;
  let escape = false;

  for (let i = startIdx; i < text.length; i++) {
    const ch = text[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inString) { escape = true; continue; }
    if (ch === '"') { inString = !inString; continue; }
    if (inString) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) return text.slice(startIdx, i + 1);
    }
  }
  return null;
}

/**
 * Try to parse a JSON string as a formDefinition.
 * Handles both wrapped {"formDefinition": {...}} and bare {title, sections} forms.
 */
function tryParseFormDef(jsonStr) {
  try {
    const parsed = JSON.parse(jsonStr);
    if (!parsed || typeof parsed !== 'object') return null;

    // Wrapped: {"formDefinition": {...}}
    if (parsed.formDefinition) {
      return validateFormDef(parsed.formDefinition) ? parsed.formDefinition : null;
    }

    // Bare: {title: "...", sections: [...]}
    if (parsed.title && Array.isArray(parsed.sections)) {
      return validateFormDef(parsed) ? parsed : null;
    }
  } catch { /* ignore */ }
  return null;
}

/**
 * Extract formDefinition JSON from a response string.
 * Returns the parsed object or null. Validates structure before returning.
 */
export function extractFormDefinition(text) {
  // Try all fenced JSON blocks (case-insensitive)
  const fenceRegex = /```json\s*\n([\s\S]*?)\n\s*```/gi;
  let match;
  while ((match = fenceRegex.exec(text)) !== null) {
    const def = tryParseFormDef(match[1].trim());
    if (def) return def;
  }

  // Fallback: find JSON objects using brace balancing
  let searchFrom = 0;
  while (true) {
    const idx = text.indexOf('{', searchFrom);
    if (idx === -1) break;
    const jsonStr = extractBalancedJSON(text, idx);
    if (!jsonStr) break;
    const def = tryParseFormDef(jsonStr);
    if (def) return def;
    searchFrom = idx + 1;
  }

  return null;
}
