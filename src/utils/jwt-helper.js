const jwt = require("jsonwebtoken");
const constants = require("../utils/constants");

const secretKey = process.env.SECRET_JWT || constants.COM_KABBIK;
const secretKeyNewAdmin =
  process.env.SECRET_JWT_ADMIN || constants.SECRET_JWT_ADMIN;

module.exports = class JWTHelper {
  static generateToken(payload) {
    const token = jwt.sign(payload, secretKey, {
      expiresIn: "365d",
    });

    return token;
  }

  static generateTokenOneDay(payload) {
    const token = jwt.sign(payload, secretKey, { expiresIn: "1d" });
    return token;
  }

  static generateTokenDynamicDayMybl(payload, seconds) {
    const token = jwt.sign(payload, secretKey, { expiresIn: seconds });
    return token;
  }

  static verifyToken(token) {
    // Verify Token
    return jwt.verify(token, secretKey);
  }
  static verifyTokenNewAdmin(token) {
    // Verify Token
    // console.log("secretKeyNewAdmin: " + secretKeyNewAdmin);
    return jwt.verify(token, secretKeyNewAdmin);
  }
};
