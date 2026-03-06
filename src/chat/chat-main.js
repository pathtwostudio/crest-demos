import '../styles/base.css';
import '../styles/layout.css';
import '../styles/form.css';
import '../styles/components.css';
import '../styles/chat.css';

import { setAuthToken, getAuthToken, validateAuth, sendChatMessage } from './chat-api.js';
import {
  initChatUI, addUserMessage, addAssistantMessage, addSystemMessage,
  setLoading, extractFormDefinition, getMessages, getRawMessages, pushMessage,
} from './chat-ui.js';
import { renderForm } from './form-renderer.js';
import { collectFormData } from './form-data-collector.js';
import { generateGenericPDF } from '../pdf/generic-form-pdf.js';
import { exportJSON, exportChat, saveGallery } from './export.js';

let currentFormDef = null;
let currentFormId = null;

document.addEventListener('DOMContentLoaded', () => {
  // Auth gate elements
  const authGate = document.getElementById('auth-gate');
  const authInput = document.getElementById('auth-input');
  const authBtn = document.getElementById('auth-btn');
  const authError = document.getElementById('auth-error');
  const chatLayout = document.getElementById('chat-layout');

  // Preview elements
  const previewContent = document.getElementById('preview-content');

  // Action buttons
  const btnPdf = document.getElementById('btn-pdf');
  const btnExportJson = document.getElementById('btn-export-json');
  const btnExportChat = document.getElementById('btn-export-chat');
  const btnSaveGallery = document.getElementById('btn-save-gallery');

  // Auth gate handler
  async function handleAuth() {
    const passphrase = authInput.value.trim();
    if (!passphrase) return;

    authBtn.disabled = true;
    authBtn.textContent = 'Checking...';
    authError.textContent = '';

    try {
      const valid = await validateAuth(passphrase);
      if (valid) {
        setAuthToken(passphrase);
        authGate.style.display = 'none';
        chatLayout.classList.add('chat-layout--visible');
        addSystemMessage('Connected. Describe the form you want to create.');
        loadEditForm();
      } else {
        authError.textContent = 'Invalid passphrase.';
      }
    } catch {
      authError.textContent = 'Connection failed. Try again.';
    } finally {
      authBtn.disabled = false;
      authBtn.textContent = 'Enter';
    }
  }

  authBtn.addEventListener('click', handleAuth);
  authInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleAuth();
  });

  // Auto-login if session token exists
  const savedToken = getAuthToken();
  if (savedToken) {
    validateAuth(savedToken).then((valid) => {
      if (valid) {
        setAuthToken(savedToken);
        authGate.style.display = 'none';
        chatLayout.classList.add('chat-layout--visible');
        addSystemMessage('Connected. Describe the form you want to create.');
        loadEditForm();
      }
    }).catch(() => {});
  }

  // Init chat UI
  initChatUI({
    messagesContainer: document.getElementById('chat-messages'),
    input: document.getElementById('chat-input'),
    sendButton: document.getElementById('chat-send'),
    onSend: handleUserMessage,
  });

  // Load form from gallery for editing
  function loadEditForm() {
    const params = new URLSearchParams(window.location.search);
    if (!params.has('edit')) return;

    const raw = localStorage.getItem('editForm');
    if (!raw) return;
    localStorage.removeItem('editForm');

    try {
      const formDef = JSON.parse(raw);
      if (!formDef || !formDef.title) return;

      currentFormId = formDef.id || crypto.randomUUID();
      formDef.id = currentFormId;
      currentFormDef = formDef;
      renderForm(previewContent, formDef);
      setActionButtonsEnabled(true);

      // Seed the chat history so the AI knows about the existing form
      const formJson = JSON.stringify({ formDefinition: formDef }, null, 2);
      const seedContent = `Here is the current form definition:\n\n\`\`\`json\n${formJson}\n\`\`\`\n\nYou can now describe changes to this form.`;
      addSystemMessage(`Loaded "${formDef.title}" from gallery. Describe changes in the chat.`);
      // Add to message history as assistant context so the AI knows the form
      pushMessage('assistant', seedContent);
    } catch { /* ignore invalid data */ }

    // Clean URL
    window.history.replaceState({}, '', '/chat.html');
  }

  // Handle user message
  async function handleUserMessage(text) {
    addUserMessage(text);
    setLoading(true);

    try {
      const content = await sendChatMessage(getMessages());
      const formDef = extractFormDefinition(content);

      if (formDef) {
        // Assign a stable UUID client-side (ignore whatever Claude generates)
        if (!currentFormId) {
          currentFormId = crypto.randomUUID();
        }
        formDef.id = currentFormId;
        currentFormDef = formDef;
        renderForm(previewContent, formDef);
        setActionButtonsEnabled(true);
      }

      addAssistantMessage(content);
    } catch (err) {
      addSystemMessage(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  }

  function setActionButtonsEnabled(enabled) {
    btnPdf.disabled = !enabled;
    btnExportJson.disabled = !enabled;
    btnExportChat.disabled = !enabled;
    btnSaveGallery.disabled = !enabled;
  }

  // Action button handlers
  btnPdf.addEventListener('click', async () => {
    if (!currentFormDef) return;
    btnPdf.disabled = true;
    btnPdf.textContent = 'Generating...';
    try {
      const formData = collectFormData(previewContent);
      await generateGenericPDF(currentFormDef, formData);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('PDF generation failed. Please try again.');
    } finally {
      btnPdf.disabled = false;
      btnPdf.textContent = 'PDF';
    }
  });

  btnExportJson.addEventListener('click', () => {
    if (currentFormDef) exportJSON(currentFormDef);
  });

  btnExportChat.addEventListener('click', () => {
    exportChat(getRawMessages());
  });

  btnSaveGallery.addEventListener('click', async () => {
    if (!currentFormDef) return;
    btnSaveGallery.disabled = true;
    btnSaveGallery.textContent = 'Saving...';
    try {
      const result = await saveGallery(currentFormDef);
      addSystemMessage(`Form saved to gallery (${result.id}).`);
    } catch (err) {
      console.error('Gallery save error:', err);
      addSystemMessage('Save failed: ' + err.message);
    } finally {
      btnSaveGallery.disabled = false;
      btnSaveGallery.textContent = 'Save';
    }
  });
});
