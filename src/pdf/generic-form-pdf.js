import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { loadFonts } from './fonts.js';
import {
  addDocumentHeader,
  addSectionTitle,
  addField,
  addFieldRow,
  addTable,
  addPageFooter,
  formatDate,
  formatDateTime,
} from './pdf-utils.js';

/**
 * Generate a PDF from a formDefinition + collected form data.
 * @param {object} def - formDefinition object
 * @param {object} formData - { fields: {key: value}, dynamicSections: [{key, rows}] }
 */
export async function generateGenericPDF(def, formData) {
  const doc = new jsPDF();
  await loadFonts(doc);

  const pdfConfig = def.pdfConfig || {};
  const title = pdfConfig.headerTitle || def.title || 'Form';
  const subtitle = pdfConfig.headerSubtitle || def.subtitle || '';

  let y = addDocumentHeader(doc, title, subtitle);

  // Track which dynamic section index we're on
  let dynamicIdx = 0;

  for (const section of (def.sections || [])) {
    if (section.type === 'dynamicRows') {
      // Find matching dynamic data
      const dynData = formData.dynamicSections?.[dynamicIdx] || { rows: [] };
      dynamicIdx++;

      if (section.title) {
        y = addSectionTitle(doc, section.title, y);
      }

      if (dynData.rows.length === 0) continue;

      if (section.pdfDisplay === 'list') {
        // Render as list of fields
        for (const row of dynData.rows) {
          for (const rf of section.rowFields) {
            const val = row[rf.key];
            if (val) {
              y = addField(doc, rf.label, val, y);
            }
          }
          y += 2;
        }
      } else {
        // Default: render as table
        const head = section.rowFields.map((rf) => rf.label);
        const body = dynData.rows.map((row) =>
          section.rowFields.map((rf) => row[rf.key] || '')
        );
        y = addTable(doc, { head, body, startY: y });
      }
    } else {
      // Fields section
      if (section.title) {
        y = addSectionTitle(doc, section.title, y);
      }

      const fields = section.fields || [];
      const layout = section.layout || 1;

      if (layout > 1) {
        // Multi-column: group into rows
        const rowFields = [];
        for (const f of fields) {
          const val = formatFieldValue(f, formData.fields[f.key]);
          rowFields.push({ label: f.label, value: val || '' });
        }
        // Chunk into groups matching layout
        for (let i = 0; i < rowFields.length; i += layout) {
          const chunk = rowFields.slice(i, i + layout);
          if (chunk.some((c) => c.value)) {
            y = addFieldRow(doc, chunk, y);
          }
        }
      } else {
        for (const f of fields) {
          const val = formatFieldValue(f, formData.fields[f.key]);
          if (val) {
            const isMultiline = f.type === 'textarea';
            y = addField(doc, f.label, val, y, { multiline: isMultiline });
          }
        }
      }
    }
  }

  const footerTitle = pdfConfig.footerTitle || title;
  addPageFooter(doc, footerTitle);

  doc.save(`${slugify(title)}.pdf`);
}

function formatFieldValue(field, value) {
  if (!value) return '';
  if (field.type === 'date') return formatDate(value);
  if (field.type === 'datetime-local') return formatDateTime(value);
  return value;
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
