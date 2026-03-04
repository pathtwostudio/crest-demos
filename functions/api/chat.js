const RATE_LIMIT_WINDOW = 60_000;
const RATE_LIMIT_MAX = 10;
const rateLimitMap = new Map();

const SYSTEM_PROMPT = `You are a form designer assistant. When the user describes a form they want, you output a JSON form definition inside a \`\`\`json fence, followed by a brief natural-language explanation of what you created or changed.

## Output Format

Always output the form definition in a fenced code block like:

\`\`\`json
{
  "formDefinition": { ... }
}
\`\`\`

Then follow with 1-3 sentences explaining the form.

## Form Definition Schema

\`\`\`
{
  "formDefinition": {
    "id": "<uuid — generate once, preserve on updates>",
    "title": "Form Title",
    "subtitle": "Optional subtitle",
    "pdfConfig": {
      "headerTitle": "PDF Header Title",
      "headerSubtitle": "Optional",
      "footerTitle": "Footer text"
    },
    "sections": [
      {
        "type": "fields",
        "title": "Section Title" or null,
        "layout": 1 | 2 | 3 | 4,
        "fields": [
          {
            "key": "camelCaseKey",
            "label": "Human Label",
            "type": "text|date|datetime-local|email|number|select|textarea",
            "required": false,
            "placeholder": "",
            "maxLength": 200,
            "options": ["only for select type"],
            "rows": 3
          }
        ]
      },
      {
        "type": "dynamicRows",
        "title": "Repeating Section Title",
        "addButtonLabel": "+ Add Item",
        "rowFields": [
          { "key": "camelCaseKey", "label": "Label", "type": "text", "flex": 1, "maxLength": 200 }
        ],
        "pdfDisplay": "table" or "list"
      }
    ],
    "demoData": {
      "fields": { "camelCaseKey": "Sample value" },
      "dynamicRows": {
        "Section Title": [
          { "camelCaseKey": "Row 1 value" },
          { "camelCaseKey": "Row 2 value" }
        ]
      }
    }
  }
}
\`\`\`

## Rules

1. All field keys must be unique camelCase strings across the entire form.
2. Use appropriate field types: "date" for dates, "datetime-local" for date+time, "email" for emails, "number" for numbers, "select" for enums, "textarea" for long text.
3. When updating an existing form, PRESERVE the same "id" value. Only change sections/fields as requested.
4. Use "layout" 2-4 for related short fields that fit side by side. Use layout 1 for textareas or when there's only one field.
5. Use "dynamicRows" for repeating data (attendees, line items, tasks, etc.). Set "pdfDisplay" to "table" for tabular data or "list" for narrative items.
6. Keep forms practical and well-organized with logical section groupings.
7. If the user asks for changes to an existing form, only modify what they asked for — preserve everything else.
8. ALWAYS include "demoData" with realistic sample values for every field and 2-3 sample rows for each dynamicRows section. Use plausible names, dates, and values that demonstrate the form's purpose. The "dynamicRows" keys must match the section "title" exactly.`;

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

function checkRateLimit(ip) {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(ip, { windowStart: now, count: 1 });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT_MAX;
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

export async function onRequestPost(context) {
  const { request, env } = context;

  // Rate limit by IP (before auth to prevent brute-force)
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  if (!checkRateLimit(ip)) {
    return jsonResponse({ error: 'Rate limit exceeded. Please wait a moment.' }, 429);
  }

  // Auth check (timing-safe)
  const token = request.headers.get('X-Auth-Token') || '';
  if (!env.CHAT_PASSPHRASE || !timingSafeEqual(token, env.CHAT_PASSPHRASE)) {
    return jsonResponse({ error: 'Unauthorized' }, 401);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON' }, 400);
  }

  // Auth-only validation mode
  if (body.authCheck === true) {
    return jsonResponse({ ok: true });
  }

  // Sanitize messages
  const allowedRoles = new Set(['user', 'assistant']);
  const messages = (body.messages || [])
    .filter((m) => allowedRoles.has(m.role) && typeof m.content === 'string')
    .map((m) => ({
      role: m.role,
      content: m.content.slice(0, 10_000),
    }))
    .slice(-20);

  if (messages.length === 0) {
    return jsonResponse({ error: 'No messages provided' }, 400);
  }

  // Call Claude API
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Claude API error:', response.status, errText);
      return jsonResponse({ error: 'AI service error' }, 502);
    }

    const result = await response.json();
    const content = result.content?.[0]?.text || '';

    return jsonResponse({ content });
  } catch (err) {
    console.error('Claude API fetch error:', err);
    return jsonResponse({ error: 'Failed to reach AI service' }, 502);
  }
}
