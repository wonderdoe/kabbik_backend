const bcrypt = require('bcrypt')

module.exports = class CryptoUtils {

    static async generateSalt(rounds) {
        return await bcrypt.genSalt(rounds)
    }

    static async encrypt(data) {
        // generate salt to hash password
        const salt = await this.generateSalt(10)
        return await bcrypt.hash(data, salt)
    }

    static async compare(data, dataHash) {
        return await bcrypt.compare(data, dataHash);
    }
}