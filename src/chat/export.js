/**
 * Export utilities: JSON download, chat markdown, gallery save.
 */
import { saveToGallery } from './chat-api.js';

export function exportJSON(formDefinition) {
  const json = JSON.stringify({ formDefinition }, null, 2);
  downloadFile(json, `${slugify(formDefinition.title || 'form')}.json`, 'application/json');
}

export function exportChat(messages) {
  let md = '# Form Builder Chat Log\n\n';
  md += `Exported: ${new Date().toLocaleString()}\n\n---\n\n`;

  for (const msg of messages) {
    const speaker = msg.role === 'user' ? 'You' : 'Assistant';
    // Replace JSON blocks with placeholder in chat export
    const content = msg.content.replace(/```json\s*\n[\s\S]*?\n```/g, '[form definition updated]');
    md += `**${speaker}:**\n${content}\n\n`;
  }

  downloadFile(md, 'chat-log.md', 'text/markdown');
}

export async function saveGallery(formDefinition) {
  return saveToGallery(formDefinition);
}

function downloadFile(content, filename, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function slugify(text) {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}
