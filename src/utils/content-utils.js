const constants = require('./constants');
const path = require('path');
const fs = require('fs');

exports.getBannerContents = async () => {
    return new Promise((resolve, reject) => {
        let filePath = path.normalize(constants.ROOT_PATH + 'contents/content_banners.json');
        // console.log(filePath);
        fs.readFile(filePath, 'utf-8', (err, content) => {
            if (err) {
                reject(err);
            }
            try {
                content = JSON.parse(content);
            } catch (err) {
                // console.log(err);
                reject(err);
            }
            resolve(content);
        });
    });
}