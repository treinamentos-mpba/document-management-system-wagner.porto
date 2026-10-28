const API_PREFIX = '/api';

async function request(path, token, options = {}) {
  const response = await fetch(`${API_PREFIX}${path}`, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    let payload;
    try {
      payload = await response.json();
    } catch {
      payload = null;
    }

    const error = new Error(payload?.error?.message || 'Não foi possível concluir a solicitação.');
    error.code = payload?.error?.code || 'REQUEST_FAILED';
    error.status = response.status;
    throw error;
  }

  return response;
}

export async function uploadDocument(file, token) {
  const formData = new FormData();
  formData.append('file', file);

  const response = await request('/upload', token, {
    method: 'POST',
    body: formData,
  });
  const payload = await response.json();
  return payload.document;
}

export async function listDocuments(token) {
  const response = await request('/documents', token);
  const payload = await response.json();
  return payload.documents;
}

export async function downloadDocument(id, token) {
  const response = await request(`/documents/${encodeURIComponent(id)}/download`, token);
  return response.blob();
}