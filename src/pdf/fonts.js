const FONT_URLS = {
  'Inter-Regular': 'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuLyfMZg.ttf',
  'Inter-Bold': 'https://fonts.gstatic.com/s/inter/v20/UcCO3FwrK3iLTeHuS_nVMrMxCp50SjIw2boKoduKmMEVuFuYMZg.ttf',
};

const fontCache = {};

async function fetchFontBase64(name) {
  if (fontCache[name]) return fontCache[name];

  const response = await fetch(FONT_URLS[name]);
  const buffer = await response.arrayBuffer();

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
