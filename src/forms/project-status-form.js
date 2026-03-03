import { generateProjectStatusPDF } from '../pdf/project-status-pdf.js';

function fillRow(row, data) {
  for (const [field, value] of Object.entries(data)) {
    const el = row.querySelector(`[data-field="${field}"]`);
    if (el) el.value = value;
  }
}

function createMilestoneRow() {
  const row = document.createElement('div');
  row.className = 'dynamic-row';
  row.innerHTML = `
    <div class="form-group" style="flex:2">
      <label class="form-label">Milestone</label>
      <input class="form-input" type="text" data-field="name" />
    </div>
    <div class="form-group">
      <label class="form-label">Target Date</label>
      <input class="form-input" type="date" data-field="targetDate" />
    </div>
    <div class="form-group">
      <label class="form-label">Status</label>
      <select class="form-select" data-field="status">
        <option value="">—</option>
        <option value="Completed">Completed</option>
        <option value="On Track">On Track</option>
        <option value="At Risk">At Risk</option>
        <option value="Delayed">Delayed</option>
        <option value="Not Started">Not Started</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Notes</label>
      <input class="form-input" type="text" data-field="notes" />
    </div>
    <button type="button" class="btn-remove" title="Remove">&times;</button>
  `;
  row.querySelector('.btn-remove').addEventListener('click', () => row.remove());
  return row;
}

function createRiskRow() {
  const row = document.createElement('div');
  row.className = 'dynamic-row';
  row.innerHTML = `
    <div class="form-group" style="flex:2">
      <label class="form-label">Risk</label>
      <input class="form-input" type="text" data-field="risk" />
    </div>
    <div class="form-group">
      <label class="form-label">Likelihood</label>
      <select class="form-select" data-field="likelihood">
        <option value="">—</option>
        <option value="High">High</option>
        <option value="Medium">Medium</option>
        <option value="Low">Low</option>
      </select>
    </div>
    <div class="form-group">
      <label class="form-label">Impact</label>
      <select class="form-select" data-field="impact">
        <option value="">—</option>
        <option value="High">High</option>
        <option value="Medium">Medium</option>
        <option value="Low">Low</option>
      </select>
    </div>
    <div class="form-group" style="flex:2">
      <label class="form-label">Mitigation</label>
      <input class="form-input" type="text" data-field="mitigation" />
    </div>
    <button type="button" class="btn-remove" title="Remove">&times;</button>
  `;
  row.querySelector('.btn-remove').addEventListener('click', () => row.remove());
  return row;
}

function createTeamRow() {
  const row = document.createElement('div');
  row.className = 'dynamic-row';
  row.innerHTML = `
    <div class="form-group">
      <label class="form-label">Name</label>
      <input class="form-input" type="text" data-field="name" />
    </div>
    <div class="form-group">
      <label class="form-label">Role</label>
      <input class="form-input" type="text" data-field="role" />
    </div>
    <button type="button" class="btn-remove" title="Remove">&times;</button>
  `;
  row.querySelector('.btn-remove').addEventListener('click', () => row.remove());
  return row;
}

function collectRows(containerId) {
  const container = document.getElementById(containerId);
  const rows = container.querySelectorAll('.dynamic-row');
  return Array.from(rows).map((row) => {
    const data = {};
    row.querySelectorAll('[data-field]').forEach((el) => {
      data[el.dataset.field] = el.value.trim();
    });
    return data;
  }).filter((row) => Object.values(row).some(Boolean));
}

export function initProjectStatusForm() {
  const form = document.getElementById('project-status-form');
  const milestonesContainer = document.getElementById('ps-milestones');
  const risksContainer = document.getElementById('ps-risks');
  const teamContainer = document.getElementById('ps-team');

  // Seed with demo data
  form.querySelector('[name="projectName"]').value = 'Customer Portal Redesign';
  form.querySelector('[name="reportDate"]').value = '2026-03-03';
  form.querySelector('[name="projectManager"]').value = 'Anika Patel';
  form.querySelector('[name="overallStatus"]').value = 'At Risk';
  form.querySelector('[name="summary"]').value = 'The redesign is progressing well on the frontend but the API integration milestone is behind schedule due to unexpected complexity in the legacy data migration layer. We have requested additional backend resources to close the gap.';
  form.querySelector('[name="nextSteps"]').value = 'Complete API integration for user profiles by March 14. Begin UAT with pilot group of 50 users by March 21. Finalize accessibility audit and address findings before launch.';
  form.querySelector('[name="budgetAllocated"]').value = '$280,000';
  form.querySelector('[name="budgetSpent"]').value = '$185,000';
  form.querySelector('[name="budgetRemaining"]').value = '$95,000';
  form.querySelector('[name="budgetNotes"]').value = 'Additional backend contractor costs ($15,000) approved to accelerate API integration. Remaining budget is sufficient for planned scope.';

  const demoMilestones = [
    { name: 'Design system & prototypes', targetDate: '2026-01-31', status: 'Completed', notes: 'Delivered on schedule' },
    { name: 'Frontend component library', targetDate: '2026-02-28', status: 'Completed', notes: '42 components built and tested' },
    { name: 'API integration', targetDate: '2026-03-14', status: 'At Risk', notes: 'Legacy migration more complex than estimated' },
    { name: 'User acceptance testing', targetDate: '2026-03-28', status: 'Not Started', notes: 'Pilot group identified' },
    { name: 'Production launch', targetDate: '2026-04-15', status: 'Not Started', notes: '' },
  ];
  const demoRisks = [
    { risk: 'Legacy API data format incompatibilities', likelihood: 'High', impact: 'High', mitigation: 'Added dedicated backend engineer; building adapter layer' },
    { risk: 'Accessibility compliance gaps', likelihood: 'Medium', impact: 'High', mitigation: 'Scheduled third-party audit for March 18' },
    { risk: 'Scope creep from stakeholder requests', likelihood: 'Medium', impact: 'Medium', mitigation: 'Change request process enforced; backlog groomed weekly' },
  ];
  const demoTeam = [
    { name: 'Anika Patel', role: 'Project Manager' },
    { name: 'David Kim', role: 'Lead Frontend Engineer' },
    { name: 'Rachel Foster', role: 'Backend Engineer' },
    { name: 'Tom Bradley', role: 'UX Designer' },
    { name: 'Nina Okafor', role: 'QA Engineer' },
  ];

  for (const data of demoMilestones) {
    const row = createMilestoneRow();
    fillRow(row, data);
    milestonesContainer.appendChild(row);
  }
  for (const data of demoRisks) {
    const row = createRiskRow();
    fillRow(row, data);
    risksContainer.appendChild(row);
  }
  for (const data of demoTeam) {
    const row = createTeamRow();
    fillRow(row, data);
    teamContainer.appendChild(row);
  }

  // Add row buttons
  document.querySelector('[data-add="ps-milestones"]').addEventListener('click', () => {
    milestonesContainer.appendChild(createMilestoneRow());
  });
  document.querySelector('[data-add="ps-risks"]').addEventListener('click', () => {
    risksContainer.appendChild(createRiskRow());
  });
  document.querySelector('[data-add="ps-team"]').addEventListener('click', () => {
    teamContainer.appendChild(createTeamRow());
  });

  // Submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = document.getElementById('ps-submit');
    const originalText = btn.textContent;
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Generating PDF...';

    try {
      const data = {
        projectName: form.querySelector('[name="projectName"]').value.trim(),
        reportDate: form.querySelector('[name="reportDate"]').value,
        projectManager: form.querySelector('[name="projectManager"]').value.trim(),
        overallStatus: form.querySelector('[name="overallStatus"]').value,
        summary: form.querySelector('[name="summary"]').value.trim(),
        milestones: collectRows('ps-milestones'),
        risks: collectRows('ps-risks'),
        team: collectRows('ps-team'),
        nextSteps: form.querySelector('[name="nextSteps"]').value.trim(),
        budgetAllocated: form.querySelector('[name="budgetAllocated"]').value.trim(),
        budgetSpent: form.querySelector('[name="budgetSpent"]').value.trim(),
        budgetRemaining: form.querySelector('[name="budgetRemaining"]').value.trim(),
        budgetNotes: form.querySelector('[name="budgetNotes"]').value.trim(),
      };
      await generateProjectStatusPDF(data);
    } catch (err) {
      console.error('PDF generation failed:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      btn.disabled = false;
      btn.textContent = originalText;
    }
  });
}
