import { useState } from 'react';
import { DocumentList } from './components/DocumentList.jsx';
import { UploadComponent } from './components/UploadComponent.jsx';
import { listDocuments, uploadDocument } from './services/documentApi.js';
import './App.css';

export default function App() {
  const [tokenInput, setTokenInput] = useState('');
  const [accessToken, setAccessToken] = useState('');
  const [documents, setDocuments] = useState([]);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  async function handleConnect(event) {
    event.preventDefault();
    const token = tokenInput.trim();
    if (!token) {
      setErrorMessage('Informe seu token de acesso.');
      return;
    }

    setIsConnecting(true);
    setIsLoadingDocuments(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const result = await listDocuments(token);
      setAccessToken(token);
      setDocuments(result);
    } catch (error) {
      setAccessToken('');
      setDocuments([]);
      setErrorMessage(error.message);
    } finally {
      setIsConnecting(false);
      setIsLoadingDocuments(false);
    }
  }

  async function handleUpload(file) {
    setIsUploading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const createdDocument = await uploadDocument(file, accessToken);
      setSuccessMessage(`"${createdDocument.originalName}" foi enviado.`);

      try {
        setDocuments(await listDocuments(accessToken));
      } catch (error) {
        setErrorMessage(`Upload concluído, mas não foi possível atualizar a lista: ${error.message}`);
      }
    } catch (error) {
      setErrorMessage(error.message);
      throw error;
    } finally {
      setIsUploading(false);
    }
  }

  async function handleRefresh() {
    if (!accessToken) return;

    setIsLoadingDocuments(true);
    setErrorMessage('');
    try {
      setDocuments(await listDocuments(accessToken));
    } catch (error) {
      setErrorMessage(error.message);
    } finally {
      setIsLoadingDocuments(false);
    }
  }

  function handleDisconnect() {
    setAccessToken('');
    setTokenInput('');
    setDocuments([]);
    setErrorMessage('');
    setSuccessMessage('');
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <a className="wordmark" href="/" aria-label="DMS, início">
          <span className="wordmark-mark" aria-hidden="true">D</span>
          <span>DMS<span className="wordmark-divider">/</span>ARQUIVO</span>
        </a>
        {accessToken && (
          <button className="text-button" type="button" onClick={handleDisconnect}>
            Desconectar
          </button>
        )}
      </header>

      <section className="page-heading" aria-labelledby="page-title">
        <div>
          <p className="eyebrow">GESTÃO DOCUMENTAL</p>
          <h1 id="page-title">Documentos</h1>
        </div>
        {accessToken && (
          <span className="connection-state"><span aria-hidden="true" /> Conectado</span>
        )}
      </section>

      {!accessToken ? (
        <section className="access-section" aria-labelledby="access-title">
          <div className="section-heading">
            <div>
              <p className="eyebrow">ACESSO</p>
              <h2 id="access-title">Identifique sua conta</h2>
            </div>
          </div>
          <form className="access-form" onSubmit={handleConnect}>
            <label htmlFor="access-token">Token de acesso</label>
            <div className="access-controls">
              <input
                autoComplete="off"
                id="access-token"
                name="token"
                onChange={(event) => setTokenInput(event.target.value)}
                placeholder="Insira seu token"
                type="password"
                value={tokenInput}
              />
              <button className="primary-button" disabled={isConnecting} type="submit">
                {isConnecting ? 'Conectando...' : 'Conectar'}
              </button>
            </div>
          </form>
        </section>
      ) : (
        <>
          <UploadComponent onUpload={handleUpload} uploading={isUploading} />

          <section className="documents-section" aria-labelledby="documents-title">
            <div className="section-heading documents-heading">
              <div>
                <p className="eyebrow">SEU ESPAÇO</p>
                <h2 id="documents-title">Arquivos</h2>
              </div>
              <button
                className="secondary-button"
                disabled={isLoadingDocuments}
                onClick={handleRefresh}
                type="button"
              >
                {isLoadingDocuments ? 'Atualizando...' : 'Atualizar lista'}
              </button>
            </div>
            <DocumentList
              documents={documents}
              loading={isLoadingDocuments}
              token={accessToken}
              onDownloadError={(error) => setErrorMessage(error.message)}
            />
          </section>
        </>
      )}

      <div aria-live="polite" className="feedback-region">
        {errorMessage && <p className="feedback-message error-message" role="alert">{errorMessage}</p>}
        {successMessage && <p className="feedback-message success-message" role="status">{successMessage}</p>}
      </div>
    </main>
  );
}