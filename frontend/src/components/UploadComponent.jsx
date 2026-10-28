import { useRef, useState } from 'react';
import { formatFileSize } from '../services/formatFileSize.js';

const MAX_FILE_SIZE = 10 * 1024 * 1024;

export function UploadComponent({ onUpload, uploading }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [validationMessage, setValidationMessage] = useState('');
  const fileInput = useRef(null);

  function handleFileChange(event) {
    const file = event.target.files?.[0] || null;
    setValidationMessage('');
    setSelectedFile(file);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (!selectedFile) {
      setValidationMessage('Selecione um arquivo para enviar.');
      return;
    }
    if (selectedFile.size > MAX_FILE_SIZE) {
      setValidationMessage('O arquivo deve ter no máximo 10 MiB.');
      return;
    }

    try {
      await onUpload(selectedFile);
      setSelectedFile(null);
      if (fileInput.current) fileInput.current.value = '';
      setValidationMessage('');
    } catch {
      // O formulário principal apresenta o erro da API.
    }
  }

  return (
    <section className="upload-section" aria-labelledby="upload-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">NOVO DOCUMENTO</p>
          <h2 id="upload-title">Enviar arquivo</h2>
        </div>
        <span className="upload-limit">Máximo 10 MiB</span>
      </div>

      <form className="upload-form" onSubmit={handleSubmit}>
        <label className="file-picker" htmlFor="document-file">
          <span className="file-picker-icon" aria-hidden="true">+</span>
          <span className="file-picker-copy">
            <strong>{selectedFile ? selectedFile.name : 'Escolher arquivo'}</strong>
            <span>{selectedFile ? formatFileSize(selectedFile.size) : 'Todos os formatos são aceitos'}</span>
          </span>
        </label>
        <input
          accept="*/*"
          className="visually-hidden"
          id="document-file"
          onChange={handleFileChange}
          ref={fileInput}
          type="file"
        />
        <button className="primary-button upload-button" disabled={uploading} type="submit">
          {uploading ? 'Enviando...' : 'Enviar documento'}
        </button>
      </form>
      {validationMessage && <p className="inline-error" role="alert">{validationMessage}</p>}
    </section>
  );
}
