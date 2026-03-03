// Color constants (RGB arrays)
export const COLORS = {
  primary: [37, 99, 235],
  primaryDark: [29, 78, 216],
  primaryLight: [219, 234, 254],
  primarySubtle: [239, 246, 255],
  white: [255, 255, 255],
  gray50: [249, 250, 251],
  gray200: [229, 231, 235],
  gray500: [107, 114, 128],
  gray700: [55, 65, 81],
  gray800: [31, 41, 55],
  gray900: [17, 24, 39],
  red: [220, 38, 38],
  orange: [234, 88, 12],
  yellow: [202, 138, 4],
  green: [22, 163, 74],
};

const PAGE_WIDTH = 210;
const MARGIN = 15;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const PAGE_HEIGHT = 297;
const BOTTOM_MARGIN = 20;

export function addDocumentHeader(doc, title, subtitle) {
  // Blue banner
  doc.setFillColor(...COLORS.primary);
  doc.rect(0, 0, PAGE_WIDTH, 40, 'F');

  // Title
  doc.setFont('Inter', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(...COLORS.white);
  doc.text(title, MARGIN, 20);

  // Subtitle
  if (subtitle) {
    doc.setFont('Inter', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(219, 234, 254);
    doc.text(subtitle, MARGIN, 30);
  }

  doc.setTextColor(...COLORS.gray800);
  return 50;
}

export function addSectionTitle(doc, text, y) {
  y = ensureSpace(doc, y, 15);

  // Blue left bar
  doc.setFillColor(...COLORS.primary);
  doc.rect(MARGIN, y - 4, 3, 12, 'F');

  doc.setFont('Inter', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...COLORS.gray900);
  doc.text(text, MARGIN + 7, y + 4);

  return y + 14;
}

export function addField(doc, label, value, y, options = {}) {
  if (!value) return y;
  y = ensureSpace(doc, y, 12);

  if (label) {
    doc.setFont('Inter', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.gray500);
    doc.text(label.toUpperCase(), MARGIN, y);
    y += 5;
  }

  doc.setFont('Inter', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.gray800);

  const maxWidth = options.maxWidth || CONTENT_WIDTH;

  if (options.multiline) {
    const lines = doc.splitTextToSize(value, maxWidth);
    for (const line of lines) {
      y = ensureSpace(doc, y, 5);
      doc.text(line, MARGIN, y);
      y += 5;
    }
    return y + 3;
  }

  doc.text(String(value), MARGIN + (options.labelWidth || 0), y);
  return y + 8;
}

export function addFieldInline(doc, label, value, y, x) {
  if (!value) return y;

  doc.setFont('Inter', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.gray500);
  doc.text(label.toUpperCase(), x, y);

  doc.setFont('Inter', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...COLORS.gray800);
  doc.text(String(value), x, y + 5);

  return y + 13;
}

export function addFieldRow(doc, fields, y) {
  y = ensureSpace(doc, y, 15);
  const colWidth = CONTENT_WIDTH / fields.length;

  for (let i = 0; i < fields.length; i++) {
    const x = MARGIN + i * colWidth;
    const { label, value } = fields[i];
    if (!value) continue;

    doc.setFont('Inter', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.gray500);
    doc.text(label.toUpperCase(), x, y);

    doc.setFont('Inter', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...COLORS.gray800);
    doc.text(String(value), x, y + 5);
  }

  return y + 13;
}

export function addTable(doc, { head, body, startY, columnStyles, theme }) {
  startY = ensureSpace(doc, startY, 20);

  doc.autoTable({
    head: [head],
    body,
    startY,
    margin: { left: MARGIN, right: MARGIN },
    styles: {
      font: 'Inter',
      fontStyle: 'normal',
      fontSize: 9,
      cellPadding: 4,
      textColor: COLORS.gray800,
      lineWidth: 0,
    },
    headStyles: {
      fillColor: COLORS.primary,
      textColor: COLORS.white,
      fontStyle: 'bold',
      fontSize: 8,
    },
    alternateRowStyles: {
      fillColor: COLORS.gray50,
    },
    columnStyles: columnStyles || {},
    ...(theme ? { theme } : {}),
  });

  return doc.lastAutoTable.finalY + 8;
}

export function addStatusBadge(doc, label, status, y, x) {
  const colorMap = {
    Critical: COLORS.red,
    High: COLORS.orange,
    Medium: COLORS.yellow,
    Low: COLORS.green,
    'On Track': COLORS.green,
    'At Risk': COLORS.yellow,
    'Off Track': COLORS.red,
    Resolved: COLORS.green,
    'In Progress': COLORS.primary,
    Pending: COLORS.yellow,
    Escalated: COLORS.red,
    Completed: COLORS.green,
    'Not Started': COLORS.gray500,
    Delayed: COLORS.red,
  };

  const color = colorMap[status] || COLORS.gray500;

  doc.setFont('Inter', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...COLORS.gray500);
  doc.text(label.toUpperCase(), x || MARGIN, y);

  doc.setFontSize(10);
  doc.setTextColor(...color);
  doc.text(status, x || MARGIN, y + 5);

  doc.setTextColor(...COLORS.gray800);
  return y + 13;
}

export function addPageFooter(doc, documentTitle) {
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);

    // Footer rule
    doc.setDrawColor(...COLORS.gray200);
    doc.setLineWidth(0.5);
    doc.line(MARGIN, PAGE_HEIGHT - 12, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 12);

    // Document title
    doc.setFont('Inter', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(...COLORS.gray500);
    doc.text(documentTitle, MARGIN, PAGE_HEIGHT - 7);

    // Page number
    doc.text(`Page ${i} of ${pageCount}`, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 7, { align: 'right' });
  }
}

export function ensureSpace(doc, y, neededHeight) {
  if (y + neededHeight > PAGE_HEIGHT - BOTTOM_MARGIN) {
    doc.addPage();
    return 15;
  }
  return y;
}

export function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}
