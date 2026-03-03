import { generateMeetingMinutesPDF } from '../pdf/meeting-minutes-pdf.js';

function fillRow(row, data) {
  for (const [field, value] of Object.entries(data)) {
    const el = row.querySelector(`[data-field="${field}"]`);
    if (el) el.value = value;
  }
}

function createAttendeeRow() {
  const row = document.createElement('div');
  row.className = 'dynamic-row';
  row.innerHTML = `
    <div class="form-group">
      <label class="form-label">Name</label>
      <input class="form-input" type="text" data-field="name" maxlength="200" />
    </div>
    <div class="form-group">
      <label class="form-label">Role</label>
      <input class="form-input" type="text" data-field="role" maxlength="200" />
    </div>
    <div class="form-group">
      <label class="form-label">Email</label>
      <input class="form-input" type="email" data-field="email" maxlength="200" />
    </div>
    <button type="button" class="btn-remove" title="Remove">&times;</button>
  `;
  row.querySelector('.btn-remove').addEventListener('click', () => row.remove());
  return row;
}

function createAgendaRow() {
  const row = document.createElement('div');
  row.className = 'dynamic-row';
  row.style.flexDirection = 'column';
  row.innerHTML = `
    <div style="display:flex;gap:0.75rem;width:100%;align-items:flex-start">
      <div class="form-group" style="flex:1">
        <label class="form-label">Topic</label>
        <input class="form-input" type="text" data-field="topic" maxlength="300" />
      </div>
      <button type="button" class="btn-remove" title="Remove">&times;</button>
    </div>
    <div class="form-group" style="width:100%">
      <label class="form-label">Discussion</label>
      <textarea class="form-textarea" data-field="discussion" rows="2" maxlength="3000"></textarea>
    </div>
    <div class="form-group" style="width:100%">
      <label class="form-label">Decisions</label>
      <textarea class="form-textarea" data-field="decisions" rows="2" maxlength="3000"></textarea>
    </div>
  `;
  row.querySelector('.btn-remove').addEventListener('click', () => row.remove());
  return row;
}

function createActionRow() {
  const row = document.createElement('div');
  row.className = 'dynamic-row';
  row.innerHTML = `
    <div class="form-group" style="flex:2">
      <label class="form-label">Description</label>
      <input class="form-input" type="text" data-field="description" maxlength="500" />
    </div>
    <div class="form-group">
      <label class="form-label">Assigned To</label>
      <input class="form-input" type="text" data-field="assignedTo" maxlength="200" />
    </div>
    <div class="form-group">
      <label class="form-label">Due Date</label>
      <input class="form-input" type="date" data-field="dueDate" />
    </div>
    <div class="form-group">
      <label class="form-label">Priority</label>
      <select class="form-select" data-field="priority">
        <option value="">—</option>
        <option value="High">High</option>
        <option value="Medium">Medium</option>
        <option value="Low">Low</option>
      </select>
    </div>
    <button type="button" class="btn-remove" title="Remove">&times;</button>
  `;
  row.querySelector('.btn-remove').addEventListener('click', () => row.remove());
  return row;
}

const ALLOWED_FIELDS = new Set([
  'name', 'role', 'email', 'topic', 'discussion', 'decisions',
  'description', 'assignedTo', 'dueDate', 'priority',
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

export function initMeetingMinutesForm() {
  const form = document.getElementById('meeting-minutes-form');
  const attendeesContainer = document.getElementById('mm-attendees');
  const agendaContainer = document.getElementById('mm-agenda');
  const actionsContainer = document.getElementById('mm-actions');

  // Seed with demo data
  const demoAttendees = [
    { name: 'Sarah Chen', role: 'Project Lead', email: 'sarah.chen@example.com' },
    { name: 'Marcus Johnson', role: 'Developer', email: 'marcus.j@example.com' },
    { name: 'Emily Rodriguez', role: 'Designer', email: 'emily.r@example.com' },
  ];
  const demoAgenda = [
    { topic: 'Sprint 4 retrospective', discussion: 'Reviewed velocity and blockers from the previous sprint. Team identified deployment pipeline as the main bottleneck.', decisions: 'Allocate 2 days next sprint to CI/CD improvements.' },
    { topic: 'Q2 roadmap priorities', discussion: 'Discussed feature requests from customer feedback survey. Prioritized SSO integration and dashboard redesign.', decisions: 'SSO integration moves to Sprint 5. Dashboard redesign scoped for Sprint 6–7.' },
  ];
  const demoActions = [
    { description: 'Draft CI/CD improvement proposal', assignedTo: 'Marcus Johnson', dueDate: '2026-03-10', priority: 'High' },
    { description: 'Create SSO integration wireframes', assignedTo: 'Emily Rodriguez', dueDate: '2026-03-14', priority: 'Medium' },
    { description: 'Schedule stakeholder review for Q2 roadmap', assignedTo: 'Sarah Chen', dueDate: '2026-03-07', priority: 'High' },
  ];

  form.querySelector('[name="title"]').value = 'Weekly Engineering Sync';
  form.querySelector('[name="datetime"]').value = '2026-03-03T10:00';
  form.querySelector('[name="location"]').value = 'Conference Room B / Zoom';
  form.querySelector('[name="nextMeeting"]').value = '2026-03-10';
  form.querySelector('[name="notes"]').value = 'Team morale is high after the successful product launch last week. Consider scheduling a team lunch to celebrate.';

  for (const data of demoAttendees) {
    const row = createAttendeeRow();
    fillRow(row, data);
    attendeesContainer.appendChild(row);
  }
  for (const data of demoAgenda) {
    const row = createAgendaRow();
    fillRow(row, data);
    agendaContainer.appendChild(row);
  }
  for (const data of demoActions) {
    const row = createActionRow();
    fillRow(row, data);
    actionsContainer.appendChild(row);
  }

  // Add row buttons
  document.querySelector('[data-add="mm-attendees"]').addEventListener('click', () => {
    attendeesContainer.appendChild(createAttendeeRow());
  });
  document.querySelector('[data-add="mm-agenda"]').addEventListener('click', () => {
    agendaContainer.appendChild(createAgendaRow());
  });
  document.querySelector('[data-add="mm-actions"]').addEventListener('click', () => {
    actionsContainer.appendChild(createActionRow());
  });

  // Submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('mm-submit');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Generating PDF...';

    try {
      const data = {
        title: form.querySelector('[name="title"]').value.trim(),
        datetime: form.querySelector('[name="datetime"]').value,
        location: form.querySelector('[name="location"]').value.trim(),
        nextMeeting: form.querySelector('[name="nextMeeting"]').value,
        attendees: collectRows('mm-attendees'),
        agendaItems: collectRows('mm-agenda'),
        actionItems: collectRows('mm-actions'),
        notes: form.querySelector('[name="notes"]').value.trim(),
      };
      await generateMeetingMinutesPDF(data);
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });
}
