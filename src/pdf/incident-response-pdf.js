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
  formatDateTime,
} from './pdf-utils.js';

export async function generateIncidentResponsePDF(data) {
  const doc = new jsPDF();
  await loadFonts(doc);

  let y = addDocumentHeader(doc, data.title || 'Incident Response Report', formatDateTime(data.dateOccurred));

  // Severity & status
  y = addFieldRow(doc, [
    { label: 'Severity', value: data.severity },
    { label: 'Resolution Status', value: data.resolutionStatus },
  ], y);

  // Dates
  y = addFieldRow(doc, [
    { label: 'Date of Occurrence', value: formatDateTime(data.dateOccurred) },
    { label: 'Date Reported', value: formatDateTime(data.dateReported) },
  ], y);

  // Reporter
  y = addSectionTitle(doc, 'Reported By', y);
  y = addFieldRow(doc, [
    { label: 'Name', value: data.reportedByName },
    { label: 'Role', value: data.reportedByRole },
    { label: 'Contact', value: data.reportedByContact },
  ], y);

  // Location
  if (data.location) {
    y = addField(doc, 'Location / System Affected', data.location, y);
  }

  // Description
  y = addSectionTitle(doc, 'Incident Description', y);
  y = addField(doc, '', data.description, y, { multiline: true });

  // Timeline
  if (data.timeline.length > 0) {
    y = addSectionTitle(doc, 'Timeline', y);
    y = addTable(doc, {
      head: ['Time', 'Event'],
      body: data.timeline.map((t) => [t.time, t.event]),
      startY: y,
      columnStyles: {
        0: { cellWidth: 40 },
      },
    });
  }

  // Actions taken
  if (data.actions.length > 0) {
    y = addSectionTitle(doc, 'Actions Taken', y);
    y = addTable(doc, {
      head: ['Action', 'By Whom', 'When'],
      body: data.actions.map((a) => [a.action, a.byWhom, a.when]),
      startY: y,
    });
  }

  // Root cause
  if (data.rootCause) {
    y = addSectionTitle(doc, 'Root Cause Analysis', y);
    y = addField(doc, '', data.rootCause, y, { multiline: true });
  }

  // Follow-up
  if (data.followUp) {
    y = addSectionTitle(doc, 'Follow-up Actions', y);
    y = addField(doc, '', data.followUp, y, { multiline: true });
  }

  addPageFooter(doc, data.title || 'Incident Response Report');
  doc.save(`incident-response-${Date.now()}.pdf`);
}
