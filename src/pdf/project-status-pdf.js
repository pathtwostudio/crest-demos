import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { loadFonts } from './fonts.js';
import {
  addDocumentHeader,
  addSectionTitle,
  addField,
  addFieldRow,
  addTable,
  addStatusBadge,
  addPageFooter,
  formatDate,
} from './pdf-utils.js';

export async function generateProjectStatusPDF(data) {
  const doc = new jsPDF();
  await loadFonts(doc);

  let y = addDocumentHeader(
    doc,
    data.projectName || 'Project Status Report',
    `Report Date: ${formatDate(data.reportDate)}`
  );

  // Overview
  y = addFieldRow(doc, [
    { label: 'Project Manager', value: data.projectManager },
    { label: 'Overall Status', value: data.overallStatus },
    { label: 'Report Date', value: formatDate(data.reportDate) },
  ], y);

  // Summary
  if (data.summary) {
    y = addSectionTitle(doc, 'Status Summary', y);
    y = addField(doc, '', data.summary, y, { multiline: true });
  }

  // Milestones
  if (data.milestones.length > 0) {
    y = addSectionTitle(doc, 'Milestones', y);
    y = addTable(doc, {
      head: ['Milestone', 'Target Date', 'Status', 'Notes'],
      body: data.milestones.map((m) => [m.name, formatDate(m.targetDate), m.status, m.notes]),
      startY: y,
      columnStyles: {
        0: { cellWidth: 45 },
        1: { cellWidth: 30 },
        2: { cellWidth: 25 },
      },
    });
  }

  // Risks
  if (data.risks.length > 0) {
    y = addSectionTitle(doc, 'Risks', y);
    y = addTable(doc, {
      head: ['Risk', 'Likelihood', 'Impact', 'Mitigation'],
      body: data.risks.map((r) => [r.risk, r.likelihood, r.impact, r.mitigation]),
      startY: y,
      columnStyles: {
        1: { cellWidth: 25 },
        2: { cellWidth: 25 },
      },
    });
  }

  // Team
  if (data.team.length > 0) {
    y = addSectionTitle(doc, 'Team Members', y);
    y = addTable(doc, {
      head: ['Name', 'Role'],
      body: data.team.map((t) => [t.name, t.role]),
      startY: y,
    });
  }

  // Next steps
  if (data.nextSteps) {
    y = addSectionTitle(doc, 'Next Steps', y);
    y = addField(doc, '', data.nextSteps, y, { multiline: true });
  }

  // Budget
  const hasBudget = data.budgetAllocated || data.budgetSpent || data.budgetRemaining;
  if (hasBudget) {
    y = addSectionTitle(doc, 'Budget', y);
    y = addFieldRow(doc, [
      { label: 'Allocated', value: data.budgetAllocated },
      { label: 'Spent', value: data.budgetSpent },
      { label: 'Remaining', value: data.budgetRemaining },
    ], y);
    if (data.budgetNotes) {
      y = addField(doc, 'Notes', data.budgetNotes, y, { multiline: true });
    }
  }

  addPageFooter(doc, data.projectName || 'Project Status Report');
  doc.save(`project-status-${Date.now()}.pdf`);
}
