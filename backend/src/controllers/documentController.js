function createDocumentController(documentService) {
  return {
    upload: async (req, res, next) => {
      if (!req.file) {
        return res.status(400).json({
          error: { code: 'FILE_REQUIRED', message: 'Envie um arquivo no campo "file".' },
        });
      }

      try {
        const document = await documentService.createDocument(req.file, req.user.owner);
        res.status(201).json({ document });
      } catch (error) {
        next(error);
      }
    },

    list: (req, res) => {
      res.json({ documents: documentService.listDocuments(req.user.owner) });
    },

    download: async (req, res, next) => {
      try {
        const download = await documentService.getDownload(req.user.owner, req.params.id);
        if (!download) {
          return res.status(404).json({
            error: { code: 'DOCUMENT_NOT_FOUND', message: 'Documento não encontrado.' },
          });
        }

        res.set('X-Content-Type-Options', 'nosniff');
        res.download(
          download.filePath,
          download.document.originalName,
          { headers: { 'Content-Type': 'application/octet-stream' } },
          (error) => {
            if (!error) {
              return;
            }
            if (res.headersSent) {
              return next(error);
            }
            if (error.code === 'ENOENT') {
              return res.status(404).json({
                error: { code: 'DOCUMENT_NOT_FOUND', message: 'Documento não encontrado.' },
              });
            }
            next(error);
          },
        );
      } catch (error) {
        next(error);
      }
    },
  };
}

module.exports = { createDocumentController };