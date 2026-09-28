const AWS = require('aws-sdk');

const fs = require('fs');
// Configure AWS with your access and secret key.
const { AWS_ACCESS_KEY_MYBL, AWS_SECRET_KEY_MYBL, AWS_BUCKET_REGION_MYBL, AWS_BUCKET_NAME_MYBL } = process.env; // Replace with your keys and region

AWS.config.update({
    accessKeyId: AWS_ACCESS_KEY_MYBL,
    secretAccessKey: AWS_SECRET_KEY_MYBL,
    region: AWS_BUCKET_REGION_MYBL
});

const s3 = new AWS.S3();

async function uploadFileToS3(fileNameLocal, filePath) {
    try {
        const fileContent = fs.readFileSync(fileNameLocal);

        const params = {
            Bucket: AWS_BUCKET_NAME_MYBL, // replace with your bucket name
            Key: filePath, // File name you want to save as in S3
            Body: fileContent
        };

        const data = await s3.upload(params).promise();
            } catch (e) {
        console.log('Error', e);
    }
}
module.exports.uploadFileToS3 = uploadFileToS3;