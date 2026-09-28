const multer = require('multer');

class MulterHelper {

  constructor() {
    this.storage = multer.diskStorage({
      destination: (req, file, cb) => {
        cb(null, './files-temp');
      },
      filename: (req, file, cb) => {
        const fileName = file.originalname.toLowerCase().replace(/\s/g, '');
        cb(null, fileName)
      }
    });

    this.upload = multer({
      storage: this.storage,
      limits: {
        // we are allowing 100 MB files
        fileSize: 1024 * 1024 * 100,
        fieldSize: 1024 * 1024 * 100,
      }
    }).array('files');
  }
}

module.exports = new MulterHelper;