const crypto = require('crypto');
const fs = require('fs');

exports.multipleColumnSet = (object) => {
    if (typeof object !== 'object') {
        throw new Error('Invalid input');
    }

    const keys = Object.keys(object);
    const values = Object.values(object);

    columnSet = keys.map(key => `${key} = ?`).join(', ');

    return {
        columnSet,
        values
    }
}

exports.printStringify = (object) => {
    try {
        const str = JSON.stringify(object, null, 4); // (Optional) beautiful indented output.
        //console.log('stringify ' + str);
    }
    catch (e) { }
}

exports.stringifyToObject = (object) => {
    try {
        return JSON.parse(
            JSON.stringify(object)
        );
    }
    catch (e) {
        console.log(e);
        return undefined;
    }
}


exports.replaceHTTP = (string) => {
    try {
        
    if (string.startsWith("https://")) {
        return string;
      } else {
        return "https://" + string;
      }
    }
    catch (e) {
        console.log(e);
        return undefined;
    }
}

function replaceHTTP(string) {
    if (string.startsWith("https")) {
      return string;
    } else {
      return "javascript" + string.slice(4);
    }
  }

exports.generateRandomNumber = () => {
    return Math.floor(100000 + Math.random() * 900000);
}

exports.generateRandomString = (length) => {
    return Array(length + 1)
        .join(
            (Math.random()
                // Convert  to base-36
                .toString(36)).slice(2, length)
        ).slice(0, length)
}

exports.generateToken = (size) => {
    return crypto.randomBytes(size).toString('hex');
}


exports.generateCryptoHashMybl = (api_key, timestamp, secret_key) => {
    return crypto.createHmac('sha256', secret_key).update(api_key + timestamp).digest('hex');
}

exports.getValueForKey = (obj) => {
    let key = Object.keys(obj)[0]
    return obj[key]
}

exports.createHash = (orderId) => {
        const hmac = crypto.createHash('sha1').update(orderId).digest('hex').toUpperCase();
        return hmac;
}

exports.encrypt = (data, pk) => {
    const fsPrivKey = fs.readFileSync('./nagad-key/Merchant_MC00F4WS0090458_1683537436837_pri.pem', {
        encoding: 'utf-8',
      });
      const fsPubKey = fs.readFileSync('./nagad-key/Payment_Gateway_PublicKey.pem', {
        encoding: 'utf-8',
      });
    const publicKey = this.formatKey(fsPubKey, "PUBLIC")
        
// Replace this with your plain sensitive data
const plainData = JSON.stringify(data);

// Create a buffer from the plain data
const buffer = Buffer.from(plainData, 'utf-8');

// Encrypt the buffer using the public key
// const encryptedData = crypto.publicEncrypt(publicKey, buffer, {
//   padding: crypto.constants.RSA_PKCS1_PADDING,
// });
const encryptedData = crypto.publicEncrypt({ key: publicKey, padding: crypto.constants.RSA_PKCS1_PADDING },
    buffer);

// Convert the encrypted data to base64 string
const encryptedBase64 = encryptedData.toString('base64');
    return encryptedBase64;
}


exports.formatKey = (key, type) => {
    return /begin/i.test(key)
      ? key.trim()
      : `-----BEGIN ${type} KEY-----\n${key.trim()}\n-----END ${type} KEY-----`;
  }
exports.decrypt = (data, pri) => {
    
    const fsPrivKey = fs.readFileSync('./nagad-key/Merchant_MC00F4WS0090458_1683537436837_pri.pem', {
        encoding: 'utf-8',
      });
      const fsPubKey = fs.readFileSync('./nagad-key/Payment_Gateway_PublicKey.pem', {
        encoding: 'utf-8',
      });
    const privateKey = this.formatKey(fsPrivKey, "PRIVATE")
        const buffer = Buffer.from(data, 'base64');
    const decrypted = crypto.privateDecrypt(
        { key: privateKey, padding: crypto.constants.RSA_PKCS1_PADDING },
        Buffer.from(data, 'base64'),);
    return JSON.parse(decrypted.toString());
}

exports.sign = (sensitiveData, private) => {
    const fsPrivKey = fs.readFileSync('./nagad-key/Merchant_MC00F4WS0090458_1683537436837_pri.pem', {
        encoding: 'utf-8',
      });
      const fsPubKey = fs.readFileSync('./nagad-key/Payment_Gateway_PublicKey.pem', {
        encoding: 'utf-8',
      });
    const privateKey = this.formatKey(fsPrivKey, "PRIVATE")
            // console.log(publicKey)
    // const privateKey = `-----BEGIN PRIVATE KEY-----
    // MIIEvAIBADANBgkqhkiG9w0BAQEFAASCBKYwggSiAgEAAoIBAQCJakyLqojWTDAVUdNJLvuXhROV+LXymqnukBrmiWwTYnJYm9r5cKHj1hYQRhU5eiy6NmFVJqJtwpxyyDSCWSoSmIQMoO2KjYyB5cDajRF45v1GmSeyiIn0hl55qM8ohJGjXQVPfXiqEB5c5REJ8Toy83gzGE3ApmLipoegnwMkewsTNDbe5xZdxN1qfKiRiCL720FtQfIwPDp9ZqbG2OQbdyZUB8I08irKJ0x/psM4SjXasglHBK5G1DX7BmwcB/PRbC0cHYy3pXDmLI8pZl1NehLzbav0Y4fP4MdnpQnfzZJdpaGVE0oI15lq+KZ0tbllNcS+/4MSwW+afvOw9bazAgMBAAECggEAIkenUsw3GKam9BqWh9I1p0Xmbeo+kYftznqai1pK4McVWW9//+wOJsU4edTR5KXK1KVOQKzDpnf/CU9SchYGPd9YScI3n/HR1HHZW2wHqM6O7na0hYA0UhDXLqhjDWuM3WEOOxdE67/bozbtujo4V4+PM8fjVaTsVDhQ60vfv9CnJJ7dLnhqcoovidOwZTHwG+pQtAwbX0ICgKSrc0elv8ZtfwlEvgIrtSiLAO1/CAf+uReUXyBCZhS4Xl7LroKZGiZ80/JE5mc67V/yImVKHBe0aZwgDHgtHh63/50/cAyuUfKyreAH0VLEwy54UCGramPQqYlIReMEbi6U4GC5AQKBgQDfDnHCH1rBvBWfkxPivl/yNKmENBkVikGWBwHNA3wVQ+xZ1Oqmjw3zuHY0xOH0GtK8l3Jy5dRL4DYlwB1qgd/Cxh0mmOv7/C3SviRk7W6FKqdpJLyaE/bqI9AmRCZBpX2PMje6Mm8QHp6+1QpPnN/SenOvoQg/WWYM1DNXUJsfMwKBgQCdtddE7A5IBvgZX2o9vTLZY/3KVuHgJm9dQNbfvtXw+IQfwssPqjrvoU6hPBWHbCZl6FCl2tRh/QfYR/N7H2PvRFfbbeWHw9+xwFP1pdgMug4cTAt4rkRJRLjEnZCNvSMVHrri+fAgpv296nOhwmY/qw5Smi9rMkRY6BoNCiEKgQKBgAaRnFQFLF0MNu7OHAXPaW/ukRdtmVeDDM9oQWtSMPNHXsx+crKY/+YvhnujWKwhphcbtqkfj5L0dWPDNpqOXJKV1wHt+vUexhKwus2mGF0flnKIPG2lLN5UU6rs0tuYDgyLhAyds5ub6zzfdUBG9Gh0ZrfDXETRUyoJjcGChC71AoGAfmSciL0SWQFU1qjUcXRvCzCK1h25WrYS7E6pppm/xia1ZOrtaLmKEEBbzvZjXqv7PhLoh3OQYJO0NM69QMCQi9JfAxnZKWx+m2tDHozyUIjQBDehve8UBRBRcCnDDwU015lQN9YNb23Fz+3VDB/LaF1D1kmBlUys3//r2OV0Q4ECgYBnpo6ZFmrHvV9IMIGjP7XIlVa1uiMCt41FVyINB9SJnamGGauW/pyENvEVh+ueuthSg37e/l0Xu0nm/XGqyKCqkAfBbL2Uj/j5FyDFrpF27PkANDo99CdqL5A4NQzZ69QRlCQ4wnNCq6GsYy2WEJyU2D+K8EBSQcwLsrI7QL7fvQ==
    // -----END PRIVATE KEY-----`;
        const buffer = Buffer.from(JSON.stringify(sensitiveData));
        const signature = crypto.sign('sha256', buffer, { key: privateKey });
        var dt = signature.toString('base64');
    return dt;
}


// function createHash(orderId) {
//     const secret = 'your-secret-key';
//     const hmac = crypto.createHmac('sha256', secret);
//     hmac.update(orderId);
//     return hmac.digest('hex');
//   }
  
//   function encrypt(data) {
//     const publicKey = fs.readFileSync('your-public-key.pem');
//     const buffer = Buffer.from(JSON.stringify(data));
//     return crypto.publicEncrypt(publicKey, buffer).toString('base64');
//   }
  
//   function decrypt(data) {
//     const privateKey = fs.readFileSync('your-private-key.pem');
//     const buffer = Buffer.from(data, 'base64');
//     const decrypted = crypto.privateDecrypt(privateKey, buffer);
//     return JSON.parse(decrypted.toString());
//   }
  
// function sign(sensitiveData) {
//     const privateKey = fs.readFileSync('your-private-key.pem');
//     const buffer = Buffer.from(JSON.stringify(sensitiveData));
//     const signature = crypto.sign('sha256', buffer, { key: privateKey });
//     return signature.toString('base64');
//   }
  
