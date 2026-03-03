import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { loadFonts } from './fonts.js';
import {
  addDocumentHeader,
  addSectionTitle,
  addField,
  addFieldRow,
  addTable,
  addPageFooter,
  formatDateTime,
  formatDate,
} from './pdf-utils.js';

export async function generateMeetingMinutesPDF(data) {
  const doc = new jsPDF();
  await loadFonts(doc);

  const subtitle = [
    formatDateTime(data.datetime),
    data.location,
  ].filter(Boolean).join(' — ');

  let y = addDocumentHeader(doc, data.title || 'Meeting Minutes', subtitle);

  // Meeting details
  y = addFieldRow(doc, [
    { label: 'Date & Time', value: formatDateTime(data.datetime) },
    { label: 'Location', value: data.location },
    { label: 'Next Meeting', value: formatDate(data.nextMeeting) },
  ], y);

  // Attendees
  if (data.attendees.length > 0) {
    y = addSectionTitle(doc, 'Attendees', y);
    y = addTable(doc, {
      head: ['Name', 'Role', 'Email'],
      body: data.attendees.map((a) => [a.name, a.role, a.email]),
      startY: y,
    });
  }

  // Agenda items
  if (data.agendaItems.length > 0) {
    y = addSectionTitle(doc, 'Agenda Items', y);
    for (const item of data.agendaItems) {
      y = addField(doc, 'Topic', item.topic, y);
      if (item.discussion) {
        y = addField(doc, 'Discussion', item.discussion, y, { multiline: true });
      }
      if (item.decisions) {
        y = addField(doc, 'Decisions', item.decisions, y, { multiline: true });
      }
      y += 3;
    }
  }

  // Action items
  if (data.actionItems.length > 0) {
    y = addSectionTitle(doc, 'Action Items', y);
    y = addTable(doc, {
      head: ['Description', 'Assigned To', 'Due Date', 'Priority'],
      body: data.actionItems.map((a) => [a.description, a.assignedTo, formatDate(a.dueDate), a.priority]),
      startY: y,
      columnStyles: {
        0: { cellWidth: 60 },
        3: { cellWidth: 25 },
      },
    });
  }

  // General notes
  if (data.notes) {
    y = addSectionTitle(doc, 'General Notes', y);
    y = addField(doc, '', data.notes, y, { multiline: true });
  }

  addPageFooter(doc, data.title || 'Meeting Minutes');
  doc.save(`meeting-minutes-${Date.now()}.pdf`);
}
