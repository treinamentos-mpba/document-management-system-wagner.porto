const { access, lstat, mkdir, readdir, rm } = require('node:fs/promises');
const { constants } = require('node:fs');
const path = require('node:path');

class DocumentRepository {
  constructor({ storageDirectory = path.resolve(__dirname, '../../storage') } = {}) {
    this.storageDirectory = path.resolve(storageDirectory);
    this.documents = new Map();
    this.initialized = false;
  }

  async initialize() {
    if (this.initialized) {
      return;
    }

    await mkdir(this.storageDirectory, { recursive: true });
    const directoryInfo = await lstat(this.storageDirectory);
    if (!directoryInfo.isDirectory()) {
      throw new Error('O diretório de armazenamento deve ser um diretório local.');
    }

    const entries = await readdir(this.storageDirectory);
    await Promise.all(entries
      .filter((entry) => entry !== '.gitkeep')
      .map((entry) =>
        rm(path.join(this.storageDirectory, entry), { recursive: true, force: true }),
      ));

    this.documents.clear();
    this.initialized = true;
  }

  async save(document) {
    this.documents.set(document.id, document);
  }

  async removeStoredFile(storedName) {
    await rm(this.getFilePath(storedName), { force: true });
  }

  listByOwner(owner) {
    return [...this.documents.values()]
      .filter((document) => document.owner === owner)
      .sort((left, right) => {
        const dateOrder = right.uploadedAt.localeCompare(left.uploadedAt);
        return dateOrder || left.id.localeCompare(right.id);
      });
  }

  findOwnedById(id, owner) {
    const document = this.documents.get(id);
    return document?.owner === owner ? document : null;
  }

  async findStoredFile(storedName) {
    const filePath = this.getFilePath(storedName);

    try {
      const fileInfo = await lstat(filePath);
      if (!fileInfo.isFile()) {
        return null;
      }
      await access(filePath, constants.R_OK);
      return filePath;
    } catch (error) {
      if (error.code === 'ENOENT' || error.code === 'EACCES') {
        return null;
      }
      throw error;
    }
  }

  getFilePath(storedName) {
    const filePath = path.resolve(this.storageDirectory, storedName);
    if (path.dirname(filePath) !== this.storageDirectory) {
      throw new Error('Nome de arquivo interno inválido.');
    }
    return filePath;
  }
}

module.exports = { DocumentRepository };