// Seed do servidor backend do Document Management System.
//
// Este arquivo é apenas um ponto de partida mínimo. Ao longo do workshop você
// vai usar o Agent Mode do GitHub Copilot para construir as camadas:
//   - routes/       (definição das rotas)
//   - controllers/  (entrada HTTP e validação)
//   - services/     (regras de negócio)
//   - repositories/ (persistência: arquivos locais + metadados em memória)
//
// Restrição do projeto: uploads são gravados no filesystem local da aplicação
// usando multer com diskStorage. Não utilize provedores externos.

const express = require('express');
const { loadUsers } = require('./config/users');
const { createDocumentRouter } = require('./routes/documentRoutes');
const { DocumentRepository } = require('./repositories/documentRepository');
const { errorHandler } = require('./middleware/errorHandler');

const PORT = process.env.PORT || 3000;

function createApp({ users = loadUsers(), documentRepository = new DocumentRepository() } = {}) {
  const app = express();

  app.use(express.json());
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });
  app.use(createDocumentRouter({ users, documentRepository }));
  app.use(errorHandler);
  app.locals.documentRepository = documentRepository;
  return app;
}

const app = createApp();

async function startServer() {
  await app.locals.documentRepository.initialize();
  return new Promise((resolve, reject) => {
    const server = app.listen(PORT, () => {
      console.log(`DMS backend ouvindo na porta ${PORT}`);
      resolve(server);
    });
    server.once('error', reject);
  });
}

if (require.main === module) {
  startServer().catch(() => {
    console.error('Não foi possível iniciar o DMS. Verifique a configuração e o armazenamento local.');
    process.exitCode = 1;
  });
}

app.createApp = createApp;
app.startServer = startServer;

module.exports = app;
