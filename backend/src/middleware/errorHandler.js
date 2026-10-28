const multer = require('multer');

function errorHandler(error, _req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  if (error instanceof multer.MulterError) {
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: { code: 'FILE_TOO_LARGE', message: 'O arquivo excede o limite de 10 MiB.' },
      });
    }

    return res.status(400).json({
      error: { code: 'INVALID_UPLOAD', message: 'O upload deve conter apenas um arquivo no campo "file".' },
    });
  }

  if (error.status === 400 && error.code === 'INVALID_MULTIPART') {
    return res.status(400).json({
      error: { code: error.code, message: error.publicMessage },
    });
  }

  res.status(500).json({
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'Não foi possível concluir a operação.' },
  });
}

module.exports = { errorHandler };