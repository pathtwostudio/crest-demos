import { generateIncidentResponsePDF } from '../pdf/incident-response-pdf.js';

function fillRow(row, data) {
  for (const [field, value] of Object.entries(data)) {
    const el = row.querySelector(`[data-field="${field}"]`);
    if (el) el.value = value;
  }
}

function createTimelineRow() {
  const row = document.createElement('div');
  row.className = 'dynamic-row';
  row.innerHTML = `
    <div class="form-group" style="flex:0 0 160px">
      <label class="form-label">Time</label>
      <input class="form-input" type="text" data-field="time" placeholder="e.g. 14:30" maxlength="100" />
    </div>
    <div class="form-group" style="flex:1">
      <label class="form-label">Event Description</label>
      <input class="form-input" type="text" data-field="event" maxlength="500" />
    </div>
    <button type="button" class="btn-remove" title="Remove">&times;</button>
  `;
  row.querySelector('.btn-remove').addEventListener('click', () => row.remove());
  return row;
}

function createActionRow() {
  const row = document.createElement('div');
  row.className = 'dynamic-row';
  row.innerHTML = `
    <div class="form-group" style="flex:2">
      <label class="form-label">Action</label>
      <input class="form-input" type="text" data-field="action" maxlength="500" />
    </div>
    <div class="form-group">
      <label class="form-label">By Whom</label>
      <input class="form-input" type="text" data-field="byWhom" maxlength="200" />
    </div>
    <div class="form-group">
      <label class="form-label">When</label>
      <input class="form-input" type="text" data-field="when" maxlength="100" />
    </div>
    <button type="button" class="btn-remove" title="Remove">&times;</button>
  `;
  row.querySelector('.btn-remove').addEventListener('click', () => row.remove());
  return row;
}

const ALLOWED_FIELDS = new Set([
  'time', 'event', 'action', 'byWhom', 'when',
]);

function collectRows(containerId) {
  const container = document.getElementById(containerId);
  const rows = container.querySelectorAll('.dynamic-row');
  return Array.from(rows).map((row) => {
    const data = Object.create(null);
    row.querySelectorAll('[data-field]').forEach((el) => {
      const key = el.dataset.field;
      if (ALLOWED_FIELDS.has(key)) {
        data[key] = el.value.trim();
      }
    });
    return data;
  }).filter((row) => Object.values(row).some(Boolean));
}

export function initIncidentResponseForm() {
  const form = document.getElementById('incident-response-form');
  const timelineContainer = document.getElementById('ir-timeline');
  const actionsContainer = document.getElementById('ir-actions');

  // Seed with demo data
  form.querySelector('[name="title"]').value = 'Database Connection Pool Exhaustion';
  form.querySelector('[name="severity"]').value = 'High';
  form.querySelector('[name="dateOccurred"]').value = '2026-03-02T14:23';
  form.querySelector('[name="dateReported"]').value = '2026-03-02T14:35';
  form.querySelector('[name="reportedByName"]').value = 'James Park';
  form.querySelector('[name="reportedByRole"]').value = 'Site Reliability Engineer';
  form.querySelector('[name="reportedByContact"]').value = 'james.park@example.com';
  form.querySelector('[name="location"]').value = 'Production — us-east-1 API cluster';
  form.querySelector('[name="description"]').value = 'The primary API cluster began returning 503 errors at approximately 14:23 UTC. Monitoring dashboards showed database connection pool utilization at 100% across all application servers. Approximately 12,000 users were affected during the 47-minute outage window.';
  form.querySelector('[name="rootCause"]').value = 'A background data migration job launched at 14:00 opened long-running transactions that held connections without releasing them. The connection pool (max 50 per server) was exhausted within 23 minutes, causing all new API requests to fail.';
  form.querySelector('[name="resolutionStatus"]').value = 'Resolved';
  form.querySelector('[name="followUp"]').value = 'Implement connection pool monitoring alerts at 80% threshold. Add connection timeout limits for background jobs. Review and document runbook for connection pool exhaustion scenarios. Schedule post-mortem for March 5.';

  const demoTimeline = [
    { time: '14:00 UTC', event: 'Background migration job started on production database' },
    { time: '14:23 UTC', event: 'First 503 errors detected by uptime monitoring' },
    { time: '14:28 UTC', event: 'On-call engineer paged via PagerDuty' },
    { time: '14:35 UTC', event: 'Incident declared and reported to engineering lead' },
    { time: '14:42 UTC', event: 'Root cause identified — migration job holding open connections' },
    { time: '14:48 UTC', event: 'Migration job terminated, connections begin releasing' },
    { time: '15:10 UTC', event: 'All services confirmed healthy, incident resolved' },
  ];
  const demoActions = [
    { action: 'Terminated the runaway migration job', byWhom: 'James Park', when: '14:48 UTC' },
    { action: 'Restarted application servers to clear stale connections', byWhom: 'Lisa Wang', when: '14:55 UTC' },
    { action: 'Verified all API endpoints returning 200', byWhom: 'James Park', when: '15:05 UTC' },
  ];

  for (const data of demoTimeline) {
    const row = createTimelineRow();
    fillRow(row, data);
    timelineContainer.appendChild(row);
  }
  for (const data of demoActions) {
    const row = createActionRow();
    fillRow(row, data);
    actionsContainer.appendChild(row);
  }

  // Add row buttons
  document.querySelector('[data-add="ir-timeline"]').addEventListener('click', () => {
    timelineContainer.appendChild(createTimelineRow());
  });
  document.querySelector('[data-add="ir-actions"]').addEventListener('click', () => {
    actionsContainer.appendChild(createActionRow());
  });

  // Submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('ir-submit');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Generating PDF...';

    try {
      const data = {
        title: form.querySelector('[name="title"]').value.trim(),
        severity: form.querySelector('[name="severity"]').value,
        dateOccurred: form.querySelector('[name="dateOccurred"]').value,
        dateReported: form.querySelector('[name="dateReported"]').value,
        reportedByName: form.querySelector('[name="reportedByName"]').value.trim(),
        reportedByRole: form.querySelector('[name="reportedByRole"]').value.trim(),
        reportedByContact: form.querySelector('[name="reportedByContact"]').value.trim(),
        location: form.querySelector('[name="location"]').value.trim(),
        description: form.querySelector('[name="description"]').value.trim(),
        timeline: collectRows('ir-timeline'),
        actions: collectRows('ir-actions'),
        rootCause: form.querySelector('[name="rootCause"]').value.trim(),
        resolutionStatus: form.querySelector('[name="resolutionStatus"]').value,
        followUp: form.querySelector('[name="followUp"]').value.trim(),
      };
      await generateIncidentResponsePDF(data);
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });
}
