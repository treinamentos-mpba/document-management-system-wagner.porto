const { randomUUID } = require('node:crypto');
const multer = require('multer');
const { createAuthenticateUser } = require('../middleware/authenticateUser');
const { createDocumentController } = require('../controllers/documentController');
const { DocumentService } = require('../services/documentService');

const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

function createDocumentRouter({ users, documentRepository }) {
  const router = require('express').Router();
  const documentService = new DocumentService(documentRepository);
  const controller = createDocumentController(documentService);
  const authenticateUser = createAuthenticateUser(users);
  const storage = multer.diskStorage({
    destination: documentRepository.storageDirectory,
    filename: (_req, _file, callback) => callback(null, randomUUID()),
  });
  const uploadFile = multer({
    storage,
    limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
  }).single('file');

  router.post('/upload', authenticateUser, (req, res, next) => {
    uploadFile(req, res, (error) => {
      if (!error) {
        return next();
      }

      if (error instanceof multer.MulterError) {
        return next(error);
      }

      if (error.message === 'Unexpected end of form' || error.message === 'Multipart: Boundary not found') {
        error.status = 400;
        error.code = 'INVALID_MULTIPART';
        error.publicMessage = 'A requisição multipart é inválida.';
      }
      next(error);
    });
  }, controller.upload);

  router.get('/documents', authenticateUser, controller.list);
  router.get('/documents/:id/download', authenticateUser, controller.download);

  return router;
}

module.exports = { createDocumentRouter, MAX_UPLOAD_BYTES };