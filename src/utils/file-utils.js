const path = require('path');
const fs = require('fs');

module.exports = class FileUtils {

    static createDirectoryIfNotExists(path) {
        if (fs.existsSync(path)) {
            return false;
        }
        fs.mkdirSync(path, { recursive: true })
        return true;
    }

    static fileToByteArray(file) {
        return new Promise((resolve, reject) => {
            try {
                let reader = new FileReader();
                let fileByteArray = [];
                reader.readAsArrayBuffer(file);
                reader.onloadend = (evt) => {
                    if (evt.target.readyState == FileReader.DONE) {
                        let arrayBuffer = evt.target.result,
                            array = new Uint8Array(arrayBuffer);
                        for (byte of array) {
                            fileByteArray.push(byte);
                        }
                    }
                    resolve(fileByteArray);
                }
            }
            catch (e) {
                reject(e);
            }
        })
    }

    static decodeBase64File(dataString) {
        let matches = dataString.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/)
        if (matches.length !== 3) {
            return new Error('Invalid input string')
        }
        return new Buffer(matches[2], 'base64')
    }
}