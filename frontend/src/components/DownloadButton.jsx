import { useState } from 'react';
import { downloadDocument } from '../services/documentApi.js';

export function DownloadButton({ document, token, onError }) {
  const [downloading, setDownloading] = useState(false);

  async function handleDownload() {
    setDownloading(true);
    try {
      const file = await downloadDocument(document.id, token);
      const objectUrl = URL.createObjectURL(file);
      const anchor = window.document.createElement('a');
      anchor.href = objectUrl;
      anchor.download = safeFileName(document.originalName);
      window.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch (error) {
      onError?.(error);
    } finally {
      setDownloading(false);
    }
  }

  return (
    <button
      className="download-button"
      disabled={downloading}
      onClick={handleDownload}
      type="button"
    >
      {downloading ? 'Preparando...' : 'Baixar'}
    </button>
  );
}

function safeFileName(originalName) {
  const fileName = originalName.split(/[\\/]/).pop();
  return fileName || 'documento';
}