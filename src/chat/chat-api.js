/**
 * Wrapper for /api/chat and /api/gallery endpoints.
 */

let authToken = '';

export function setAuthToken(token) {
  authToken = token;
}

export function getAuthToken() {
  return authToken;
}

export async function validateAuth(passphrase) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Token': passphrase,
    },
    body: JSON.stringify({ authCheck: true }),
  });
  return res.ok;
}

export async function sendChatMessage(messages) {
  const res = await fetch('/api/chat', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Token': authToken,
    },
    body: JSON.stringify({ messages }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Request failed (${res.status})`);
  }

  const data = await res.json();
  return data.content;
}

export async function saveToGallery(formDefinition) {
  const res = await fetch('/api/gallery', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Auth-Token': authToken,
    },
    body: JSON.stringify({ formDefinition }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || `Save failed (${res.status})`);
  }

  return res.json();
}

export async function loadGalleryIndex() {
  const res = await fetch('/api/gallery', {
    headers: { 'X-Auth-Token': authToken },
  });

  if (!res.ok) throw new Error('Failed to load gallery');
  return res.json();
}

export async function loadGalleryForm(id) {
  const res = await fetch(`/api/gallery?id=${encodeURIComponent(id)}`, {
    headers: { 'X-Auth-Token': authToken },
  });

  if (!res.ok) throw new Error('Form not found');
  return res.json();
}
