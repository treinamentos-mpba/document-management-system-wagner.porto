const { randomUUID } = require('node:crypto');
const path = require('node:path');

function toPublicDocument(document) {
  return {
    id: document.id,
    originalName: document.originalName,
    size: document.size,
    uploadedAt: document.uploadedAt,
    owner: document.owner,
  };
}

class DocumentService {
  constructor(documentRepository) {
    this.documentRepository = documentRepository;
  }

  async createDocument(file, owner) {
    const document = {
      id: randomUUID(),
      originalName: path.basename(file.originalname.replace(/\\/g, '/')),
      size: file.size,
      uploadedAt: new Date().toISOString(),
      owner,
      storedName: file.filename,
      mimeType: file.mimetype,
    };

    try {
      await this.documentRepository.save(document);
    } catch (error) {
      await this.documentRepository.removeStoredFile(file.filename).catch(() => {});
      throw error;
    }

    return toPublicDocument(document);
  }

  listDocuments(owner) {
    return this.documentRepository.listByOwner(owner).map(toPublicDocument);
  }

  async getDownload(owner, id) {
    const document = this.documentRepository.findOwnedById(id, owner);
    if (!document) {
      return null;
    }

    const filePath = await this.documentRepository.findStoredFile(document.storedName);
    return filePath ? { document, filePath } : null;
  }
}

module.exports = { DocumentService };