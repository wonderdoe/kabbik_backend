require("dotenv").config();
const aws = require("aws-sdk");
const multer = require("multer");
const multerS3 = require("multer-s3");
const path = require("path");

const bucketName = process.env.AWS_BUCKET_NAME;
const region = process.env.AWS_BUCKET_REGION;
const accessKeyId = process.env.AWS_ACCESS_KEY;
const secretAccessKey = process.env.AWS_SECRET_KEY;
const endpoint = process.env.DIGITALOCEAN_ENDPOINT;

// const spacesEndpoint = aws.Endpoint('sgp1.digitaloceanspaces.com');
aws.config.update({
  region: "sgp1",
  accessKeyId: accessKeyId,
  secretAccessKey: secretAccessKey,
  endpoint: endpoint,
});

class S3Helper {
  constructor() {
    this.s3 = new aws.S3();
    this.upload = multer({
      storage: multerS3({
        s3: this.s3,
        bucket: bucketName,
        //shouldTransform: true,
        acl: "public-read",
        contentType: multerS3.AUTO_CONTENT_TYPE,
        metadata: function (req, file, cb) {
          cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
          cb(null, Date.now().toString() + path.extname(file.originalname));
        },
        // throwMimeTypeConflictErrorIf: (contentType, mimeType, _file) => ![mimeType, 'application/octet-stream'].includes(contentType)
      }),
      limits: {
        fileSize: 1024 * 1024 * 250, // we are allowing 25 MB files
      },
    }).array("files");

    this.uploadSingle = multer({
      storage: multerS3({
        s3: this.s3,
        bucket: bucketName,
        //shouldTransform: true,
        acl: "public-read",
        contentType: multerS3.AUTO_CONTENT_TYPE,
        metadata: function (req, file, cb) {
          cb(null, { fieldName: file.fieldname });
        },
        key: function (req, file, cb) {
          cb(null, Date.now().toString() + path.extname(file.originalname));
        },
        // throwMimeTypeConflictErrorIf: (contentType, mimeType, _file) => ![mimeType, 'application/octet-stream'].includes(contentType)
      }),
      /* limits: {
                fileSize: 1024 * 1024 * 25 // we are allowing 25 MB files
            } */
    }).single("file");
  }

  uploadObject(file) {
    const fileStream = fs.createReadStream(file.path);

    const uploadParams = {
      Bucket: bucketName,
      Body: fileStream,
      Key: file.filename,
    };

    return this.s3.upload(uploadParams).promise();
  }

  // downloads a file from s3
  getObjectStream(objKey) {
    const downloadParams = {
      Key: objKey,
      Bucket: bucketName,
    };
    return this.s3.getObject(downloadParams).createReadStream();
  }

  deleteObject() {
    var params = {
      Bucket: bucketName,
      Key: "fileName",
    };
    this.s3.deleteObject(params, function (err, data) {
      if (err) {
        // an error occurred
      } else {
        // successful response
      }
    });
  }

  getSignedUrl(obj) {
    const key = obj.file_path.slice(obj.file_path.lastIndexOf("/") + 1);
    const params = {
      Bucket: bucketName,
      Key: key,
      Expires: Math.ceil(Number(obj.duration)) + 60 * 10,
    };
    try {
      const url = this.s3.getSignedUrl("getObject", params);
      return { success: true, data: url };
    } catch (err) {
      console.error(err);
      return { success: false };
    }
  }
}

module.exports = new S3Helper();
