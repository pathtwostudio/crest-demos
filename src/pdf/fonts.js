const FONT_URLS = {
  'Inter-Regular': 'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZg.ttf',
  'Inter-Bold': 'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZg.ttf',
};

const fontCache = {};

async function fetchFontBase64(name) {
  if (fontCache[name]) return fontCache[name];

  const url = FONT_URLS[name];
  if (!url) throw new Error(`Unknown font: ${name}`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load font ${name}: ${response.status}`);
  }

  const buffer = await response.arrayBuffer();
  if (buffer.byteLength === 0 || buffer.byteLength > 5 * 1024 * 1024) {
    throw new Error(`Font ${name} has unexpected size: ${buffer.byteLength}`);
  }

  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  fontCache[name] = base64;
  return base64;
}

export async function loadFonts(doc) {
  const [regularBase64, boldBase64] = await Promise.all([
    fetchFontBase64('Inter-Regular'),
    fetchFontBase64('Inter-Bold'),
  ]);

  doc.addFileToVFS('Inter-Regular.ttf', regularBase64);
  doc.addFont('Inter-Regular.ttf', 'Inter', 'normal');

  doc.addFileToVFS('Inter-Bold.ttf', boldBase64);
  doc.addFont('Inter-Bold.ttf', 'Inter', 'bold');

  doc.setFont('Inter', 'normal');
}
