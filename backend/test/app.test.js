const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtemp, mkdir, readdir, rm, writeFile } = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const TEST_USERS = [
  { owner: 'usuario-1', token: 'token-1' },
  { owner: 'usuario-2', token: 'token-2' },
];
process.env.DMS_USERS_JSON = JSON.stringify(TEST_USERS);
const app = require('../src/app');
const { loadUsers } = require('../src/config/users');
const { DocumentRepository } = require('../src/repositories/documentRepository');

async function withServer(run) {
  const storageDirectory = await mkdtemp(path.join(os.tmpdir(), 'dms-storage-'));
  const documentRepository = new DocumentRepository({ storageDirectory });
  await documentRepository.initialize();
  const testApp = app.createApp({ users: TEST_USERS, documentRepository });
  const server = await new Promise((resolve) => {
    const listeningServer = testApp.listen(0, () => resolve(listeningServer));
  });
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    await run({ baseUrl, storageDirectory });
  } finally {
    await new Promise((resolve, reject) => {
      server.close((error) => error ? reject(error) : resolve());
    });
    await rm(storageDirectory, { recursive: true, force: true });
  }
}

function authorization(token = 'token-1') {
  return { Authorization: `Bearer ${token}` };
}

test('o app backend é exportado', () => {
  assert.equal(typeof app, 'function');
});

test('a configuração rejeita usuários inválidos e owners ou tokens duplicados', () => {
  assert.throws(() => loadUsers(''), /DMS_USERS_JSON/);
  assert.throws(() => loadUsers('{'), /JSON válido/);
  assert.throws(() => loadUsers('[]'), /lista não vazia/);
  assert.throws(() => loadUsers(JSON.stringify([
    { owner: 'usuario', token: 'token-1' },
    { owner: 'usuario', token: 'token-2' },
  ])), /duplicados/);
});

test('faz upload, lista e baixa somente documentos do usuário autenticado', async () => {
  await withServer(async ({ baseUrl }) => {
    const form = new FormData();
    form.append('file', new Blob(['conteudo de teste'], { type: 'text/plain' }), 'nota.txt');
    form.append('owner', 'usuario-2');

    const uploadResponse = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      headers: authorization(),
      body: form,
    });
    assert.equal(uploadResponse.status, 201);
    const { document } = await uploadResponse.json();
    assert.deepEqual(Object.keys(document).sort(), [
      'id', 'originalName', 'owner', 'size', 'uploadedAt',
    ]);
    assert.equal(document.owner, 'usuario-1');
    assert.equal(document.originalName, 'nota.txt');
    assert.equal(document.size, Buffer.byteLength('conteudo de teste'));

    const ownListResponse = await fetch(`${baseUrl}/documents`, { headers: authorization() });
    assert.equal(ownListResponse.status, 200);
    assert.deepEqual((await ownListResponse.json()).documents.map(({ id }) => id), [document.id]);

    const otherListResponse = await fetch(`${baseUrl}/documents`, { headers: authorization('token-2') });
    assert.deepEqual((await otherListResponse.json()).documents, []);

    const downloadResponse = await fetch(`${baseUrl}/documents/${document.id}/download`, {
      headers: authorization(),
    });
    assert.equal(downloadResponse.status, 200);
    assert.equal(downloadResponse.headers.get('content-type'), 'application/octet-stream');
    assert.equal(downloadResponse.headers.get('x-content-type-options'), 'nosniff');
    assert.match(downloadResponse.headers.get('content-disposition'), /filename="nota\.txt"/);
    assert.equal(await downloadResponse.text(), 'conteudo de teste');

    const forbiddenDownload = await fetch(`${baseUrl}/documents/${document.id}/download`, {
      headers: authorization('token-2'),
    });
    assert.equal(forbiddenDownload.status, 404);
    assert.deepEqual(await forbiddenDownload.json(), {
      error: { code: 'DOCUMENT_NOT_FOUND', message: 'Documento não encontrado.' },
    });
  });
});

test('rejeita requisições não autenticadas antes de gravar o upload', async () => {
  await withServer(async ({ baseUrl, storageDirectory }) => {
    const form = new FormData();
    form.append('file', new Blob(['nao deve ser salvo']), 'arquivo.txt');
    const response = await fetch(`${baseUrl}/upload`, { method: 'POST', body: form });

    assert.equal(response.status, 401);
    assert.deepEqual(await readdir(storageDirectory), []);
  });
});

test('rejeita arquivo acima de 10 MiB sem manter arquivo no storage', async () => {
  await withServer(async ({ baseUrl, storageDirectory }) => {
    const form = new FormData();
    form.append('file', new Blob([Buffer.alloc(10 * 1024 * 1024 + 1)]), 'grande.bin');
    const response = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      headers: authorization(),
      body: form,
    });

    assert.equal(response.status, 413);
    assert.deepEqual(await response.json(), {
      error: { code: 'FILE_TOO_LARGE', message: 'O arquivo excede o limite de 10 MiB.' },
    });
    assert.deepEqual(await readdir(storageDirectory), []);
  });
});

test('limpa o diretório de storage durante a inicialização', async () => {
  const storageDirectory = await mkdtemp(path.join(os.tmpdir(), 'dms-storage-cleanup-'));
  try {
    await mkdir(path.join(storageDirectory, 'subdiretorio'));
    await writeFile(path.join(storageDirectory, 'antigo.txt'), 'antigo');
    await writeFile(path.join(storageDirectory, 'subdiretorio', 'antigo.txt'), 'antigo');
    await writeFile(path.join(storageDirectory, '.gitkeep'), '');

    const documentRepository = new DocumentRepository({ storageDirectory });
    await documentRepository.initialize();
    assert.deepEqual(await readdir(storageDirectory), ['.gitkeep']);
  } finally {
    await rm(storageDirectory, { recursive: true, force: true });
  }
});
