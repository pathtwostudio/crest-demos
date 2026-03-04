import '../styles/base.css';
import '../styles/layout.css';
import '../styles/form.css';
import '../styles/components.css';
import '../styles/gallery.css';

import { setAuthToken, validateAuth, loadGalleryIndex, loadGalleryForm } from './chat-api.js';
import { renderForm } from './form-renderer.js';
import { collectFormData } from './form-data-collector.js';
import { generateGenericPDF } from '../pdf/generic-form-pdf.js';
import { exportJSON } from './export.js';

let currentFormDef = null;

document.addEventListener('DOMContentLoaded', () => {
  const authGate = document.getElementById('auth-gate');
  const authInput = document.getElementById('auth-input');
  const authBtn = document.getElementById('auth-btn');
  const authError = document.getElementById('auth-error');
  const galleryContent = document.getElementById('gallery-content');
  const galleryGrid = document.getElementById('gallery-grid');
  const galleryDetail = document.getElementById('gallery-detail');
  const detailPreview = document.getElementById('detail-preview');
  const detailTitle = document.getElementById('detail-title');
  const btnBack = document.getElementById('btn-back');
  const btnPdf = document.getElementById('btn-detail-pdf');
  const btnJson = document.getElementById('btn-detail-json');

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
        galleryContent.style.display = 'block';
        await loadIndex();
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

  async function loadIndex() {
    galleryGrid.innerHTML = '<p style="text-align:center;color:var(--color-gray-400)">Loading...</p>';
    try {
      const index = await loadGalleryIndex();
      galleryGrid.innerHTML = '';

      if (index.length === 0) {
        galleryGrid.innerHTML = '<div class="gallery-empty">No forms saved yet. Use the Chat Builder to create and save forms.</div>';
        return;
      }

      for (const item of index) {
        const card = document.createElement('div');
        card.className = 'gallery-card';
        card.innerHTML = `
          <div class="gallery-card__title">${escapeHtml(item.title)}</div>
          ${item.subtitle ? `<div class="gallery-card__subtitle">${escapeHtml(item.subtitle)}</div>` : ''}
          <div class="gallery-card__meta">Saved ${escapeHtml(new Date(item.savedAt).toLocaleDateString())}</div>
        `;
        card.addEventListener('click', () => showDetail(item.id));
        galleryGrid.appendChild(card);
      }
    } catch (err) {
      galleryGrid.innerHTML = `<div class="gallery-empty">Failed to load gallery: ${escapeHtml(err.message)}</div>`;
    }
  }

  async function showDetail(id) {
    galleryGrid.style.display = 'none';
    galleryDetail.classList.add('gallery-detail--visible');

    try {
      const data = await loadGalleryForm(id);
      currentFormDef = data.formDefinition;
      detailTitle.textContent = currentFormDef.title;
      renderForm(detailPreview, currentFormDef);
    } catch (err) {
      detailPreview.innerHTML = `<p style="color:var(--color-red)">Failed to load form: ${escapeHtml(err.message)}</p>`;
    }
  }

  btnBack.addEventListener('click', () => {
    galleryDetail.classList.remove('gallery-detail--visible');
    galleryGrid.style.display = '';
    currentFormDef = null;
  });

  btnPdf.addEventListener('click', async () => {
    if (!currentFormDef) return;
    btnPdf.disabled = true;
    btnPdf.textContent = 'Generating...';
    try {
      const formData = collectFormData(detailPreview);
      await generateGenericPDF(currentFormDef, formData);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('PDF generation failed. Please try again.');
    } finally {
      btnPdf.disabled = false;
      btnPdf.textContent = 'Generate PDF';
    }
  });

  btnJson.addEventListener('click', () => {
    if (currentFormDef) exportJSON(currentFormDef);
  });
});

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}
