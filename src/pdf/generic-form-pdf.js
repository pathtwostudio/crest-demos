import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { loadFonts } from './fonts.js';
import {
  COLORS,
  addDocumentHeader,
  addPageFooter,
  ensureSpace,
  formatDate,
  formatDateTime,
} from './pdf-utils.js';

const PAGE_WIDTH = 210;
const MARGIN = 15;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

/**
 * Generate a PDF from a formDefinition + collected form data.
 * Replicates the visual form layout with field boxes, section grouping,
 * and multi-column rows.
 */
export async function generateGenericPDF(def, formData) {
  const doc = new jsPDF();
  await loadFonts(doc);

  const pdfConfig = def.pdfConfig || {};
  const title = pdfConfig.headerTitle || def.title || 'Form';
  const subtitle = pdfConfig.headerSubtitle || def.subtitle || '';

  let y = addDocumentHeader(doc, title, subtitle);

  let dynamicIdx = 0;

  for (const section of (def.sections || [])) {
    if (section.type === 'dynamicRows') {
      const dynData = formData.dynamicSections?.[dynamicIdx] || { rows: [] };
      dynamicIdx++;
      y = renderDynamicSection(doc, section, dynData, y);
    } else {
      y = renderFieldsSection(doc, section, formData.fields, y);
    }
  }

  const footerTitle = pdfConfig.footerTitle || title;
  addPageFooter(doc, footerTitle);

  doc.save(`${slugify(title)}.pdf`);
}

function renderFieldsSection(doc, section, fieldValues, y) {
  if (section.title) {
    y = drawSectionTitle(doc, section.title, y);
  }

  const fields = section.fields || [];
  const layout = Math.max(1, Math.min(section.layout || 1, 4));

  if (layout > 1) {
    for (let i = 0; i < fields.length; i += layout) {
      const chunk = fields.slice(i, i + layout);
      y = drawFieldRow(doc, chunk, fieldValues, layout, y);
    }
  } else {
    for (const f of fields) {
      y = drawField(doc, f, fieldValues[f.key], MARGIN, CONTENT_WIDTH, y);
    }
  }

  return y + 2;
}

function renderDynamicSection(doc, section, dynData, y) {
  if (section.title) {
    y = drawSectionTitle(doc, section.title, y);
  }

  if (!dynData.rows || dynData.rows.length === 0) {
    y = ensureSpace(doc, y, 20);
    const rowFields = section.rowFields || [];
    const gap = 4;
    const colWidth = (CONTENT_WIDTH - gap * (rowFields.length - 1)) / rowFields.length;
    for (let i = 0; i < rowFields.length; i++) {
      const x = MARGIN + i * (colWidth + gap);
      drawFieldBox(doc, rowFields[i].label, '', x, y + 7, colWidth, 14);
      doc.setFont('Inter', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...COLORS.gray500);
      doc.text((rowFields[i].label || '').toUpperCase(), x, y + 3);
    }
    return y + 25;
  }

  const head = section.rowFields.map((rf) => rf.label);
  const body = dynData.rows.map((row) =>
    section.rowFields.map((rf) => formatFieldValue(rf, row[rf.key]))
  );

  y = ensureSpace(doc, y, 20);
  doc.autoTable({
    head: [head],
    body,
    startY: y,
    margin: { left: MARGIN, right: MARGIN },
    styles: {
      font: 'Inter',
      fontStyle: 'normal',
      fontSize: 9,
      cellPadding: { top: 4, right: 5, bottom: 4, left: 5 },
      textColor: COLORS.gray800,
      lineWidth: 0.25,
      lineColor: COLORS.gray200,
    },
    headStyles: {
      fillColor: COLORS.primarySubtle,
      textColor: COLORS.primary,
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: COLORS.gray50,
    },
    bodyStyles: {
      fillColor: COLORS.white,
    },
    tableLineWidth: 0.25,
    tableLineColor: COLORS.gray200,
  });

  return doc.lastAutoTable.finalY + 6;
}

function drawSectionTitle(doc, text, y) {
  y = ensureSpace(doc, y, 20);

  doc.setFillColor(...COLORS.primarySubtle);
  doc.roundedRect(MARGIN, y - 2, CONTENT_WIDTH, 14, 2, 2, 'F');

  doc.setFillColor(...COLORS.primary);
  doc.rect(MARGIN, y - 2, 3, 14, 'F');

  doc.setFont('Inter', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.gray900);
  doc.text(text, MARGIN + 8, y + 7);

  return y + 18;
}

function drawField(doc, field, value, x, width, y) {
  const isMultiline = field.type === 'textarea';
  const formattedValue = formatFieldValue(field, value);
  const boxHeight = isMultiline ? 24 : 14;

  y = ensureSpace(doc, y, boxHeight + 12);

  // Label
  doc.setFont('Inter', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...COLORS.gray500);
  doc.text((field.label || field.key).toUpperCase(), x, y + 3);

  // Input box
  drawFieldBox(doc, null, formattedValue, x, y + 5, width, boxHeight);

  return y + boxHeight + 9;
}

function drawFieldRow(doc, fields, fieldValues, totalCols, y) {
  const gap = 4;
  const colWidth = (CONTENT_WIDTH - gap * (totalCols - 1)) / totalCols;
  const hasMultiline = fields.some((f) => f.type === 'textarea');
  const boxHeight = hasMultiline ? 24 : 14;

  y = ensureSpace(doc, y, boxHeight + 12);

  for (let i = 0; i < fields.length; i++) {
    const f = fields[i];
    const x = MARGIN + i * (colWidth + gap);
    const formattedValue = formatFieldValue(f, fieldValues[f.key]);

    doc.setFont('Inter', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.gray500);
    doc.text((f.label || f.key).toUpperCase(), x, y + 3);

    drawFieldBox(doc, null, formattedValue, x, y + 5, colWidth, boxHeight);
  }

  return y + boxHeight + 9;
}

function drawFieldBox(doc, label, value, x, y, width, height) {
  doc.setFillColor(...COLORS.gray50);
  doc.setDrawColor(...COLORS.gray200);
  doc.setLineWidth(0.3);
  doc.roundedRect(x, y, width, height, 1.5, 1.5, 'FD');

  if (label) {
    doc.setFont('Inter', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.gray500);
    doc.text(label.toUpperCase(), x + 3, y - 2);
  }

  if (value) {
    doc.setFont('Inter', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.gray800);

    if (height > 16) {
      const lines = doc.splitTextToSize(String(value), width - 6);
      const maxLines = Math.floor((height - 4) / 4.5);
      doc.text(lines.slice(0, maxLines), x + 3, y + 5);
    } else {
      const text = String(value);
      const truncated = doc.getTextWidth(text) > width - 6
        ? text.slice(0, Math.floor((width - 8) / 2)) + '…'
        : text;
      doc.text(truncated, x + 3, y + height / 2 + 1);
    }
  }
}

function formatFieldValue(field, value) {
  if (!value) return '';
  if (field.type === 'date') return formatDate(value);
  if (field.type === 'datetime-local') return formatDateTime(value);
  return String(value);
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
