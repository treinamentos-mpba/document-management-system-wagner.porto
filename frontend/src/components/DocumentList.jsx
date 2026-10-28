import { DownloadButton } from './DownloadButton.jsx';
import { formatFileSize } from '../services/formatFileSize.js';

export function DocumentList({ documents, loading, token, onDownloadError }) {
  if (loading) {
    return <p className="list-state" role="status">Carregando documentos...</p>;
  }

  if (documents.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-mark" aria-hidden="true">0</span>
        <p>Nenhum documento enviado.</p>
      </div>
    );
  }

  return (
    <div className="table-scroll">
      <table className="document-table">
        <thead>
          <tr>
            <th scope="col">Nome</th>
            <th scope="col">Tamanho</th>
            <th scope="col">Enviado em</th>
            <th scope="col"><span className="visually-hidden">Ações</span></th>
          </tr>
        </thead>
        <tbody>
          {documents.map((document) => (
            <tr key={document.id}>
              <td>
                <span className="document-name">{document.originalName}</span>
                <span className="document-owner">{document.owner}</span>
              </td>
              <td>{formatFileSize(document.size)}</td>
              <td>{formatDate(document.uploadedAt)}</td>
              <td className="action-cell">
                <DownloadButton
                  document={document}
                  onError={onDownloadError}
                  token={token}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function formatDate(value) {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}