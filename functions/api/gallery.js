const UUID_REGEX = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
const SAFE_ID_REGEX = /^[a-zA-Z0-9_-]{1,64}$/;
const MAX_FORMS = 100;
const MAX_FORM_SIZE = 50_000; // 50KB

function timingSafeEqual(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  if (a.length !== b.length) return false;
  const enc = new TextEncoder();
  const bufA = enc.encode(a);
  const bufB = enc.encode(b);
  let result = 0;
  for (let i = 0; i < bufA.length; i++) {
    result |= bufA[i] ^ bufB[i];
  }
  return result === 0;
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function checkAuth(request, env) {
  const token = request.headers.get('X-Auth-Token') || '';
  return env.CHAT_PASSPHRASE && timingSafeEqual(token, env.CHAT_PASSPHRASE);
}

export async function onRequestGet(context) {
  const { request, env } = context;

  if (!checkAuth(request, env)) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  const url = new URL(request.url);
  const id = url.searchParams.get('id');

  if (id) {
    if (!SAFE_ID_REGEX.test(id)) {
      return jsonResponse({ error: 'Invalid form ID format' }, 400);
    }
    const data = await env.FORMS_KV.get(`form:${id}`, 'json');
    if (!data) {
      return jsonResponse({ error: 'Form not found' }, 404);
    }
    return jsonResponse(data);
  }

  // Return index
  const index = await env.FORMS_KV.get('index', 'json');
  return jsonResponse(index || []);
}

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!checkAuth(request, env)) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  // Size check
  const bodyStr = JSON.stringify(body);
  if (bodyStr.length > MAX_FORM_SIZE) {
    return jsonResponse({ error: 'Form definition too large' }, 413);
  }

  const def = body.formDefinition;
  if (!def || !def.id || !def.title) {
    return jsonResponse({ error: 'Invalid form definition' }, 400);
  }

  // Validate UUID format
  if (!UUID_REGEX.test(def.id)) {
    return jsonResponse({ error: 'Invalid form ID format' }, 400);
  }

  // Enforce gallery size limit
  const index = (await env.FORMS_KV.get('index', 'json')) || [];
  const existing = index.findIndex((item) => item.id === def.id);

  if (existing < 0 && index.length >= MAX_FORMS) {
    return jsonResponse({ error: 'Gallery is full (max 100 forms)' }, 400);
  }

  // Store form
  await env.FORMS_KV.put(`form:${def.id}`, JSON.stringify({
    formDefinition: def,
    savedAt: new Date().toISOString(),
  }));

  // Update index
  const entry = {
    id: def.id,
    title: String(def.title).slice(0, 200),
    subtitle: String(def.subtitle || '').slice(0, 200),
    savedAt: new Date().toISOString(),
  };

  if (existing >= 0) {
    index[existing] = entry;
  } else {
    index.unshift(entry);
  }

  await env.FORMS_KV.put('index', JSON.stringify(index));

  return jsonResponse({ ok: true, id: def.id });
}
