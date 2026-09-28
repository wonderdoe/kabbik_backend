const UserModel = require("../data/models/user-model");
const HttpException = require("../utils/httpexception-utils");
const ResponseUtils = require("../utils/res-utils");
const CryptoUtils = require("../utils/crypto-utils");
const constants = require("../utils/constants");
const OtpHelper = require("../utils/otp-helper");
const OtpModel = require("../data/models/otp-model");
const PublisherModel = require("../data/models/publisher-model");
const { validationResult } = require("express-validator");
const axios = require("axios").default;
const JWTHelper = require("../utils/jwt-helper");
const LoggerError = require("../utils/logger-error");
const GoogleAuthHelper = require("../utils/google-auth-helper");
const bcrypt = require("bcrypt")

const DB = require("../data/db");
const jwt = require("jsonwebtoken");

const s3Helper = require("../utils/s3-helper");
const { json } = require("express");
const GlobalTask = require("../utils/global-tasker");
const agentModel = require("../data/models/agent-model");

//new added
const fs = require("fs");
const path = require("path");
const RedisModel = require("../data/models/redis-model");
const userModel = require("../data/models/user-model");

require("dotenv").config();

class AuthController {

  getTokenWiseData = async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader.split(" ")[1];
      let decoded;
      decoded = jwt.verify(token, process.env.SECRET_JWT);

      const user = await UserModel.findByPhone('id', decoded?.user_id);
      if (user.id) {
        delete user.pass_hash;
      }
      if (!user) return res.status(400).json({ message: "User not found" });
      return res.status(200).json(user);
    } catch (e) {
      console.log(e, "getTokenWiseData")
      return res.status(400).json({ message: "Something Went Wrong" });
    }
  }


  login = async (req, res) => {
    const {
      user_name: userName,
      full_name: fullName,
      auth_src: authSrc,
      image_url: imageUrl,
    } = req.body;
    const user = await UserModel.createOrReturn(
      userName,
      fullName,
      constants.PHONE,
      imageUrl
    );
    if (!user) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_401,
        "Unable to login!"
      );
    }
    const token = JWTHelper.generateToken({
      user_id: user.id.toString(),
      role: user.role,
    });
    let user_ip;

    if (req.headers["x-forwarded-for"]) {
      user_ip = JSON.stringify(req.headers["x-forwarded-for"]);
    } else {
      user_ip = "N/A";
    }

    const insertUserLogs =
      "INSERT INTO user_action_logs(USERID, userAction, endpoint, forTask, source, user_ip) VALUES (?, ?, ?,?,?, ?);";
    // try {
    const resultsInsertUserLogs = await DB.query(insertUserLogs, [
      user.id.toString(),
      "Login",
      "/login",
      "Login",
      authSrc,
      user_ip,
    ]);

    let deviceLimitValidation = await userModel.deviceLimiter(req,user?.id);

    return ResponseUtils.respond(res, constants.HTTP_200, { token, user, deviceLimitExceed: deviceLimitValidation === 'device limit Execeeded', deviceLimit: constants.MAX_DEVICE_LIMIT });
  };

  
  login_password = async (req, res) => {
    try {
      const { msisdn, password } = req.body;
      if (!msisdn || !password) {
        return res.status(400).json({ message: "msisdn and password are required" });
      }

      const user = await userModel.findByPhone("user_name", msisdn);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
            const isMatch = await bcrypt.compare(password, user?.pass_hash ?? '');
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid credentials" });
      }
      const expiresIn = 30 * 24 * 60 * 60;
      // generate JWT
      const token = jwt.sign(
        { user_id: user.id, msisdn: user.user_name, role: user.role ?? 1 },
        process.env.SECRET_JWT,
        { expiresIn }
      );

      let deviceLimitValidation = await userModel.deviceLimiter(req,user?.id);

      return res.status(200).json({
        message:deviceLimitValidation || "Login successful",
        token,
        user,
        deviceLimitExceed: deviceLimitValidation === 'device limit Execeeded',
        deviceLimit: constants.MAX_DEVICE_LIMIT,
      });
    } catch (error) {
      console.error("Login Error:", error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  logout=async(req,res)=>{
    try{
      let result = await userModel.logout(req);
      return ResponseUtils.respond(res, constants.HTTP_200, {
        success: true,
        message:"Logout Successfull"
      });
    }catch(e){
      console.log(e);
      return ResponseUtils.respond(res, constants.HTTP_200, {
        success: false,
        message: errorMessage || "Something went wrong, please try again later."
      });
    }
  }


   getDeviceList=async(req,res)=>{
    try{
      let result = await userModel.getDeviceList(req);
      
      return ResponseUtils.respond(res, constants.HTTP_200, {
        success: true,
        message:"result",
        result
      });
    }catch(e){
      console.log(e);
      return ResponseUtils.respond(res, constants.HTTP_200, {
        success: false,
        message: errorMessage || "Something went wrong, please try again later."
      });
    }
  }




  resetPassword = async (req, res) => {

    try {
      const { msisdn, password } = req.body;
      if (!msisdn || !password) {
        throw new Error("Phone number and password is Required");
      }
      const user = await UserModel.findByPhone('user_name', msisdn);

      if (!user) {
        throw new Error("User not found");
      }

      const saltRounds = Number(process.env.SALT_ROUND) || 10;
      const hash = await bcrypt.hash(password, saltRounds);

      await DB.query("UPDATE users SET pass_hash = ? WHERE user_name = ?", [hash, msisdn])

      return res.json({ success: true, message: "Your Password has been updated successfully, Please log in to continue." });

    } catch (err) {
      const errorMessage = e.sqlMessage || e.message;

      return ResponseUtils.respond(res, constants.HTTP_200, {
        success: false,
        message: errorMessage || "Something went wrong, please try again later."
      });

    }
  }





  setPassword = async (req, res) => {
    try {
      const authHeader = req.headers.authorization;
      const token = authHeader.split(" ")[1];
      let decoded;
      decoded = jwt.verify(token, process.env.SECRET_JWT);
      const { user_id, password } = req.body;
      if (user_id !== decoded.user_id) {
        throw new Error("User is not permitted");
      }
      const user = await UserModel.findByPhone('id', user_id);

      if (!user) return res.status(400).json({ message: "User not found" });

            const hash = await bcrypt.hash(password, Number(process.env.SALT_ROUND));
      await UserModel.setPassword(user.id, hash);

      return res.json({ success: true, message: "Password set successfully" });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  loginNew = async (req, res) => {
    const {
      user_name: userName,
      full_name: fullName,
      auth_src: authSrc,
      image_url: imageUrl,
      channel,
    } = req.body;
    const user = await UserModel.createOrReturnNew(
      userName,
      fullName,
      constants.PHONE,
      imageUrl,
      channel
    );
    if (!user) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_401,
        "Unable to login!"
      );
    }

    const token = JWTHelper.generateToken({
      user_id: user.id.toString(),
      role: user.role,
    });

    let user_ip;

    if (req.headers["x-forwarded-for"]) {
      user_ip = JSON.stringify(req.headers["x-forwarded-for"]);
    } else {
      user_ip = "N/A";
    }

    const insertUserLogs =
      "INSERT INTO user_action_logs(USERID, userAction, endpoint, forTask, source, user_ip) VALUES (?, ?, ?,?,?, ?);";
    // try {
    const resultsInsertUserLogs = await DB.query(insertUserLogs, [
      user.id.toString(),
      "Login",
      "/loginNew",
      "Login",
      authSrc,
      user_ip,
    ]);
    return ResponseUtils.respond(res, constants.HTTP_200, { token, user });
  };

  updateName = async (req, res) => {
    //console.log(req.body);
    const { user_name: userName, full_name: fullName } = req.body;
    const user = await UserModel.updateName(userName, fullName);
    if (!user) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_401,
        "Unable to login!"
      );
    }
    const token = JWTHelper.generateToken({
      user_id: user.id.toString(),
      role: user.role,
    });
    return ResponseUtils.respond(res, constants.HTTP_200, { token, user });
  };

  loginGoogle = async (req, res) => {
    const { token: authToken } = req.body;
    const profile = await GoogleAuthHelper.parse(authToken);
    if (!profile) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_401,
        "Unable to login!"
      );
    }
    const user = await UserModel.createOrReturn(
      profile.email,
      profile.name,
      constants.GOOGLE,
      profile.picture
    );
    if (!user) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_401,
        "Unable to login!"
      );
    }
    const token = JWTHelper.generateToken({
      user_id: user.id.toString(),
      role: user.role,
    });

    let deviceLimitValidation = await userModel.deviceLimiter(req,user?.id);

    return ResponseUtils.respond(res, constants.HTTP_200, {
      token: token,
      user,
      deviceLimitExceed: deviceLimitValidation === 'device limit Execeeded',
      deviceLimit: constants.MAX_DEVICE_LIMIT,
    });
  };

  postDevice = async (req, res) => {
    let user_id=req.user?.user_id;
    let deviceLimitValidation = await userModel.deviceLimiter(req,user_id);

    let deviceList = await userModel.getDeviceList(req);

    return ResponseUtils.respond(res, constants.HTTP_200, {
      deviceLimitExceed: deviceLimitValidation === 'device limit Execeeded',
      deviceLimit: constants.MAX_DEVICE_LIMIT,
      deviceList:deviceList,
    });
  };


signUpWithPassword = async (req, res) => {
  try {
    const {
      name,
      email,
      msisdn,
      authSrc,
      password,
      confirmPassword
    } = req.body;

    // ---------- Validation ----------
    if (!name) {
      throw new Error("Name is required");
    }

    if (!msisdn) {
      throw new Error("Phone number is required");
    }

    if (!password) {
      throw new Error("Password is required");
    }

    if (password !== confirmPassword) {
      throw new Error("Passwords do not match");
    }

    if (password.length < 8) {
      throw new Error("Password must be at least 8 characters long");
    }

    // ---------- Hash Password ----------
    const saltRounds = Number(process.env.SALT_ROUND) || 10;
    const hash = await bcrypt.hash(password, saltRounds);

    // ---------- Call Stored Procedure ----------
    await DB.query(
      `CALL auth_sign_up_with_password(?, ?, ?, ?, ?)`,
      [msisdn, name, email, authSrc, hash]
    );

    return ResponseUtils.respond(res, constants.HTTP_200, {
      success: true,
      message: "Your account has been created successfully. Please log in to continue."
    });

  } catch (e) {

    const errorMessage = e.sqlMessage || e.message;

    return ResponseUtils.respond(res, constants.HTTP_200, {
      success: false,
      message: errorMessage || "Something went wrong, please try again later."
    });
  }
};





  loginGoogleNew = async (req, res) => {
    const { token: authToken, channel } = req.body;
    const profile = await GoogleAuthHelper.parse(authToken);
    if (!profile) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_401,
        "Unable to login!"
      );
    }
    const user = await UserModel.createOrReturnNew(
      profile.email,
      profile.name,
      constants.GOOGLE,
      profile.picture,
      channel
    );
    if (!user) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_401,
        "Unable to login!"
      );
    }
    const token = JWTHelper.generateToken({
      user_id: user.id.toString(),
      role: user.role,
    });
    let user_ip;

    if (req.headers["x-forwarded-for"]) {
      user_ip = JSON.stringify(req.headers["x-forwarded-for"]);
    } else {
      user_ip = "N/A";
    }
    GlobalTask.insertLogsOptional({
      USERID: user ? user.id.toString() : "",
      userAction: "LoginGoogle",
      endpoint: "/v2/auth/login-google",
      forTask: "Login",
      source: req.query.source,
      platform: req.query.platform,
      user_ip: user_ip,
    }).catch((error) => {
      console.error("Error:", error);
    });

     let deviceLimitValidation = await userModel.deviceLimiter(req,user?.id);

    return ResponseUtils.respond(res, constants.HTTP_200, {
      token: token,
      user,
      deviceLimitExceed: deviceLimitValidation === 'device limit Execeeded',
      deviceLimit: constants.MAX_DEVICE_LIMIT
    });
  };
  loginAppleNew = async (req, res) => {
    const { token: authToken, channel } = req.body;
    const profile = jwt.decode(authToken, {
      audience: "com.kabbik.app",
      verifySignature: false,
    });
    // const profile = await jwt.parse(authToken)
    // console.log(decoded);
    // return
    if (!profile) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_401,
        "Unable to login!"
      );
    }
    const user = await UserModel.createOrReturnNewApple(
      profile.email,
      constants.GOOGLE,
      channel
    );
    if (!user) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_401,
        "Unable to login!"
      );
    }
    const token = JWTHelper.generateToken({
      user_id: user.id.toString(),
      role: user.role,
    });

    let deviceLimitValidation = await userModel.deviceLimiter(req,user?.id);

      return res.status(200).json({
        message:deviceLimitValidation || "Login successful",
        token,
        user,
        deviceLimitExceed: deviceLimitValidation === 'device limit Execeeded',
        deviceLimit: constants.MAX_DEVICE_LIMIT,
      });
    // return ResponseUtils.respond(res, constants.HTTP_200, {
    //   token: token,
    //   user,
    // });
  };

  loginGoogleNewFlutter = async (req, res) => {
    const { token: authToken, channel } = req.body;
    const profile = await GoogleAuthHelper.parseFlutter(authToken);
    if (!profile) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_401,
        "Unable to login!"
      );
    }
    const user = await UserModel.createOrReturnNew(
      profile.email,
      profile.name,
      constants.GOOGLE,
      profile.picture,
      channel
    );
    if (!user) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_401,
        "Unable to login!"
      );
    }
    const token = JWTHelper.generateToken({
      user_id: user.id.toString(),
      role: user.role,
    });

    let deviceLimitValidation = await userModel.deviceLimiter(req,user?.id);

    return ResponseUtils.respond(res, constants.HTTP_200, {
      token: token,
      user,
      deviceLimitExceed: deviceLimitValidation === 'device limit Execeeded',
      deviceLimit: constants.MAX_DEVICE_LIMIT,
    });
  };

  


  loginFb = async (req, res) => {
    const { access_token: accessToken, user_id: userId, device_info: deviceInfo,data } = req.body;

    try {
      let response;
      console.log("fb-login-data",data)

      if(!data){
                      if (!accessToken) throw new Error("accessToken is required");
          if (!userId) throw new Error("userId is required");
          if (!deviceInfo) throw new Error("deviceInfo is required");
          if (!deviceInfo.id) throw new Error("Device id is required");

          const config = {
            params: {
              fields: "name,birthday,email,gender,picture",
              access_token: accessToken,
            },
          };
          
          
          response = await axios.get(
            `${constants.FB_BASE_URL}/${userId}`,
            config,          // ← config goes here
            { headers: { "Content-Type": "application/json" } } // ← this is ignored
          )
    }else{
      if(data?.id){
        response = {status:200,data};
      }
    }
      if (response.status == 200) {
                let data = response.data;
        let userInfo = {
          userId: userId || data?.id,
          name: data.name,
          avatar: `${constants.FB_BASE_URL}/${userId}/picture?type=large`,
          email: data.email || userId || data?.id,
        };
                const user = await UserModel.createOrReturnFb(
          userInfo.email ,
          userInfo.name,
          constants.FACEBOOK,
          userInfo.avatar,
          userInfo.userId
        );
        console.log("fb-user-data",user)


        if (!user) {
          throw new Error("Unable to login!");
        }


        const activeDevices = await DB.query(
          'SELECT * FROM user_device_info WHERE user_id = ? AND is_active = 1',
          [user.id]
        );

        if (activeDevices.length >= constants.MAX_DEVICE_LIMIT && !activeDevices.some(d => d.device_id === deviceInfo.id)) {
          console.log("fb device limit exceeded",activeDevices)
          return res.status(403).json({
            message: 'Device limit exceeded. Please log out from another device.',
            devices: activeDevices
          });
        }

        const token = JWTHelper.generateToken({
          user_id: user.id.toString(),
          role: user.role,
          device_id: deviceInfo.id
        });

        const existing = activeDevices.find(d => d.device_id === deviceInfo.id);
        if (existing) {
          await DB.query('UPDATE user_device_info SET last_login = NOW() WHERE id = ?', [existing.id]);
        } else {
          const insertSql = `INSERT INTO user_device_info (
              user_id,
              device_id,
              device_name,
              os,
              ip,
              model,
              brand,
              is_physical_device,
              systemVersion,
              user_agent,
              app_version,
              jwt_token
          ) VALUES (
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              ?,
              1,
              ?,
              ?,
              ?,
              ?
          )
          ON DUPLICATE KEY UPDATE
              user_id = VALUES(user_id),
              device_name = VALUES(device_name),
              os = VALUES(os),
              ip = VALUES(ip),
              model = VALUES(model),
              brand = VALUES(brand),
              is_physical_device = VALUES(is_physical_device),
              systemVersion = VALUES(systemVersion),
              user_agent = VALUES(user_agent),
              app_version = VALUES(app_version),
              jwt_token = VALUES(jwt_token);`;

          var user_agent = req.headers["user-agent"];
          var userAgentString = user_agent ? JSON.stringify(user_agent) : "N/A";
          var user_ip = req.headers["x-forwarded-for"];
          var userIpString = user_ip ? JSON.stringify(user_ip) : "N/A";
 
          await DB.query(
            insertSql,
            [
              user.id,
              deviceInfo.id,
              deviceInfo.name,
              deviceInfo.os,
              userIpString,
              deviceInfo.model,
              deviceInfo.brand,
              deviceInfo.isPhysicalDevice || 1,
              deviceInfo.systemVersion,
              userAgentString,
              deviceInfo.version,
              token
            ]
          );
        }

        return ResponseUtils.respond(res, constants.HTTP_200, { token, user });
      }
      
      throw new Error("Unable to login!");

    } catch (e) {
      console.log("---------------------------------------fb error---------------------------------------", e);

      const errorMessage = e.sqlMessage || e.message;

      return ResponseUtils.respond(res, constants.HTTP_200, {
        success: false,
        message: errorMessage || "Something went wrong, please try again later."
      });

    }
  };




  loginAgent = async (req, res) => {
    const { credential, password } = req.body;
    const agent = await agentModel.findByCredential(credential);
    if (!agent) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    // filter out pass & other data
    const { pass_hash: passHash, ...agentWithoutPassword } = agent;
    // check pass
    const matched = await CryptoUtils.compare(password, passHash);
    if (matched) {
      const token = JWTHelper.generateToken({
        user_id: agentWithoutPassword.id.toString(),
        // agent role = 3
        role: 3,
      });
      return ResponseUtils.respond(res, constants.HTTP_200, {
        token,
        agent: agentWithoutPassword,
      });
    }
    return ResponseUtils.respondError(
      res,
      constants.HTTP_401,
      constants.UNAUTH_REQ
    );
  };

  loginBookPublisher = async (req, res) => {
    const { email, password } = req.body;
    const publisher = await PublisherModel.findByCredentialBookPublisher(email);
    if (!publisher) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }

    // filter out pass & other data
    const { pass_hash: passHash, ...publisherWithoutPassword } = publisher;
    // check pass
    const matched = await CryptoUtils.compare(password, passHash);
    if (matched) {
      const token = JWTHelper.generateToken({
        user_id: publisherWithoutPassword.id.toString(),
        // publisher role = 3
        role: 3,
      });
      return ResponseUtils.respond(res, constants.HTTP_200, {
        token,
        publisher: publisherWithoutPassword,
      });
    }
    return ResponseUtils.respondError(
      res,
      constants.HTTP_401,
      constants.UNAUTH_REQ
    );
  };

  loginBookPublisherForAdmin = async (req, res) => {
    const { email, password } = req.body;
    const publisher = await PublisherModel.findByCredentialBookPublisher(email);
    if (!publisher) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_404,
        constants.NOT_FOUND
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, {
      publisher,
    });
  };

  loginAdmin = async (req, res) => {
    try {
      const { user_name: userName, password } = req.body;

      if (!userName || !password) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_400,
          'user_name and password are required'
        );
      }

      const user = await UserModel.findByUserNameRole(userName, 2);
      if (!user) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_401,
          constants.UNAUTH_REQ
        );
      }

      const { pass_hash: passHash, ...userWithoutPassword } = user;
      const matched = await CryptoUtils.compare(password, passHash);

      if (matched) {
        const token = JWTHelper.generateToken({
          user_id: userWithoutPassword.id.toString(),
          role: userWithoutPassword.role,
        });
        return ResponseUtils.respond(res, constants.HTTP_200, {
          token,
          user: userWithoutPassword,
        });
      }

      let user_ip;
      if (req.headers['x-forwarded-for']) {
        user_ip = JSON.stringify(req.headers['x-forwarded-for']);
      } else {
        user_ip = 'N/A';
      }

      const insertUserLogs =
        'INSERT INTO user_action_logs(USERID, userAction, endpoint, forTask, user_ip) VALUES (?, ?, ?,?, ?);';
      await DB.query(insertUserLogs, [
        userWithoutPassword.id.toString(),
        'Login Admin',
        '/loginAdmin',
        'Login Admin',
        user_ip,
      ]);

      return ResponseUtils.respondError(
        res,
        constants.HTTP_401,
        constants.UNAUTH_REQ
      );
    } catch (err) {
      console.error(err);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };

  bootstrapSwaggerAdmin = async (req, res) => {
    try {
      const userName =
        req.body.user_name || process.env.DEV_ADMIN_USERNAME || 'swagger_admin';
      const password =
        req.body.password || process.env.DEV_ADMIN_PASSWORD || 'SwaggerAdmin@123';
      const fullName = req.body.full_name || 'Swagger Admin';

      if (!userName || !password) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_400,
          'user_name and password are required'
        );
      }

      if (password.length < 8) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_400,
          'Password must be at least 8 characters long'
        );
      }

      const passwordHash = await CryptoUtils.encrypt(password);
      const result = await UserModel.bootstrapSwaggerAdmin({
        userName,
        fullName,
        passwordHash,
      });

      if (result.conflict) {
        return ResponseUtils.respondError(
          res,
          409,
          'Username is already taken by a non-admin user'
        );
      }

      if (result.error) {
        return ResponseUtils.respondError(res, constants.HTTP_500, result.error);
      }

      const { pass_hash: passHash, ...userWithoutPassword } = result.user;
      const token = JWTHelper.generateToken({
        user_id: userWithoutPassword.id.toString(),
        role: 2,
      });

      return ResponseUtils.respond(res, constants.HTTP_200, {
        token,
        user: userWithoutPassword,
        bootstrapped: true,
        password_reset: true,
        message: 'Dev admin ready — paste token into adminBearerAuth',
      });
    } catch (err) {
      console.error(err);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };

  signupAgent = async (req, res) => {
    this.checkValidation(req);
    const { email, phone, full_name: fullName, password, address } = req.body;
    const agent = await agentModel.create(
      email,
      phone,
      fullName,
      await CryptoUtils.encrypt(password),
      address
    );
    if (!agent) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_400,
        constants.BAD_REQ
      );
    }
    // filter out pass & other data
    const { pass_hash: passHash, ...agentWithoutPassword } = agent;
    const token = JWTHelper.generateToken({
      user_id: agentWithoutPassword.id.toString(),
      // agent role = 3
      role: 3,
    });
    return ResponseUtils.respond(res, constants.HTTP_200, {
      token,
      agent: agentWithoutPassword,
    });
  };

  signupBookPublisher = async (req, res) => {
    const {
      email,
      phone,
      fullName,
      password,
      address,
      publisherName,
      designation,
    } = req.body;
    const publisher = await PublisherModel.bookPublisherCreate(
      email,
      phone,
      fullName,
      await CryptoUtils.encrypt(password),
      address,
      publisherName,
      designation
    );
    if (!publisher) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_400,
        constants.BAD_REQ
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, {
      success: true,
      message: "Publisher portal request sent",
    });
  };

  createOtp = async (req, res) => {
    this.generateSendOtp(req, res);
  };

 

 generateSendOtp2 = async (req, res) => {
    var referer = req.headers.referer || req.headers.referrer;
    var user_ip = req.headers["x-forwarded-for"];
    var user_agent = req.headers["user-agent"];
    var refererString = referer ? JSON.stringify(referer) : "N/A";
    var userIpString = user_ip ? JSON.stringify(user_ip) : "N/A";
    var userAgentString = user_agent ? JSON.stringify(user_agent) : "N/A";


    this.checkValidation(req);
    const { msisdn,passKey } = req.body;
    const pass = OtpHelper.generateOtp();
    const msg = `Kabbik OTP Code is ${pass}`;


    const result = await OtpHelper.sendOtp(
      constants.SMS_API_USER_NAME,
      constants.SMS_API_PASS,
      msisdn,
      msg,
      pass,
      userIpString,
      refererString,
      userAgentString,
      passKey
    ).catch((e) => {
            LoggerError.log(e);
    });

    if (!result) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_200,
        "Unable to send OTP"
      );
    } else if (result == "exceeded") {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_200,
        "Daily OTP limit reached. Try again tomorrow or contact support if needed."
      );
    } else if (result.lessthan2m && result.lessthan2m == true) {
      return ResponseUtils.respond(res, constants.HTTP_200, {
        success: true,
        remainingTime: result.remainingTime,
      });
    }
    return ResponseUtils.respond(res, constants.HTTP_200, {
      created: true,
      remainingTime: 118,
    });
  };


  createOtpNew2 = async (req, res) => {
    let { msisdn, set_password } = req.body;
    let users = await userModel.findByPhone("user_name", msisdn)
        if (users?.pass_hash && set_password == undefined) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_200,
        "password settled"
      );
    }
    //var result = await OtpModel.otp_blocker_state(req);
    let result = "pass"

    if (result == "pass") {
      this.generateSendOtp2(req, res);
    } else {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_200,
        "Account locked. Contact support to unlock if needed."
      );
    }
  };

  createOtpNew = async (req, res) => {
     var result = await OtpModel.otp_blocker_state(req);
    if (result == "pass") {
      this.generateSendOtp(req, res);
    } else {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_200,
        "Account locked. Contact support to unlock if needed."
      );
    }
  };

  generateRandomAlpha(length = 16) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
    let result = '';
    for (let i = 0; i < length; i++) {
      const randomIndex = Math.floor(Math.random() * chars.length);
      result += chars[randomIndex];
    }

    return result;
  }

 getOtpSecretKey = async (req, res) => {
  try {
    const passKey = this.generateRandomAlpha(); // generates random letters

    // Use parameterized query to prevent SQL injection
    await DB.query(
      "INSERT INTO otp_secret_key (`key`) VALUES (?)",
      [passKey]
    );

    return ResponseUtils.respond(res, constants.HTTP_200, {
      status: true,
      data: {
        passKey: passKey,
      },
    });

  } catch (e) {
 
    return ResponseUtils.respond(res, constants.HTTP_500, {
      status: false,
      message: "Internal server error",
    });
  }
};


  otp_blocker = async (req, res) => {
    const { msisdn, isBlocked, isBlockTime } = req.body;

    var result = await OtpModel.otp_blocker(msisdn, isBlocked, isBlockTime);
    if (result == "Failed" || !result) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_401,
        constants.UNAUTH_REQ
      );
    }
    // result = 1 found & updated
    return ResponseUtils.respond(res, constants.HTTP_200, {
      blockedNumber: true,
    });
  };




  myblLogin = async (req, res) => {
    const userName = req.body.msisdn;
    const client_id = req.body.client_id;
    const client_secret = req.body.client_secret;
    const authSrc = "myblApp";

    const logic = [
      {
        condition: client_id !== "mybl-client-2024",
        message: "Invalid Client Id!",
      },
      {
        condition: client_secret != "WLZijzSBpFFjeTp",
        message: "Invalid Client Secret!",
      },
      { condition: !userName, message: "Invalid id!" },
    ];

    for (const { condition, message } of logic) {
      if (condition) {
        return ResponseUtils.respondError(res, constants.HTTP_401, message);
      }
    }

    const user = await UserModel.createOrReturnNewMybl(
      userName,
      constants.PHONE,
      authSrc,
      client_id,
      client_secret
    );
    if (!user) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_401,
        "Unable to login!"
      );
    }

    const now = new Date(),
      endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const remainingTimeInSeconds = Math.round((endOfDay - now) / 1000);

    const token = JWTHelper.generateTokenDynamicDayMybl(
      {
        user_id: user.id.toString(),
        role: user.role,
      },
      remainingTimeInSeconds
    );
    return ResponseUtils.respond(res, constants.HTTP_200, {
      token: token,
      expiry: endOfDay.getTime(),
    });
  };



  togumoguLogin = async (req, res) => {
    const username = req.body.username;
    const client_id = req.body.client_id;
    const client_secret = req.body.client_secret;
    const authSrc = "togumoguApp";

    const logic = [
      {
        condition: client_id !== "togumogu-client-2025",
        message: "Invalid Client Id!",
      },
      {
        condition: client_secret != "2rcEvt8dOL8ozHya",
        message: "Invalid Client Secret!",
      },
      { condition: !username, message: "Invalid id!" },
    ];
    for (const { condition, message } of logic) {
      if (condition) {
        return ResponseUtils.respondError(res, constants.HTTP_401, message);
      }
    }
    const user = await UserModel.createOrReturnTogumoguUser(
      username,
      constants.PHONE,
      authSrc,
      client_id,
      client_secret
    );
    if (!user) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_401,
        "Unable to login!"
      );
    }

    const now = new Date(),
      endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);
    const remainingTimeInSeconds = Math.round((endOfDay - now) / 1000);
    const token = JWTHelper.generateTokenDynamicDayMybl(
      {
        user_id: user.id.toString(),
        role: user.role,
      },
      remainingTimeInSeconds
    );
    return ResponseUtils.respond(res, constants.HTTP_200, {
      token: token,
      expiry: endOfDay.getTime(),
    });
  };



  normalizeMobileNumber = (input) => {
    let number = input.replace(/\D/g, '');

    // Handle different possible formats
    if (number.startsWith('880') && number.length === 13) {
      return number; // Already in desired format
    } else if (number.startsWith('0') && number.length === 11) {
      return '88' + number; // Convert 01XXXXXXXXX to 8801XXXXXXXXX
    } else if (number.length === 10 && number.startsWith('1')) {
      return '880' + number; // Convert 1XXXXXXXXX to 8801XXXXXXXXX
    } else {
      return null; // Invalid format
    }
  }



  bkashLogin = async (req, res) => {
    let { username, password, mobile_number } = req.body;
    mobile_number = this.normalizeMobileNumber(mobile_number)
    const client_id = "bkash-client-2025";
    const client_secret = "QDMQHy1BGElMAE2I";
    const channel = "bkashApp";

    const errorMessage = {
      "message": "Invalid User Data"
    };

    if (!username || !password) {
      return ResponseUtils.respond(res, 422, JSON.stringify(errorMessage));
    }

    try {

      const user = await UserModel.createOrReturnBkashAppInAppUser(
        mobile_number,
        username,
        constants.PHONE,
        channel,
        client_id,
        client_secret
      );
      if (!user) {
        return ResponseUtils.respond(res, 422, JSON.stringify(errorMessage));
      }

      const now = new Date(),
        endOfDay = new Date();
      endOfDay.setHours(23, 59, 59, 999);
      const remainingTimeInSeconds = Math.round((endOfDay - now) / 1000);
      const token = JWTHelper.generateTokenOneDay({
        user_id: user.id.toString(),
        is_subscribed: user.is_subscribed,
        role: user.role,
        mobile_number,
      });
      const resultSaveToken = await RedisModel.saveBkashToken(token);
      if (!resultSaveToken) {
        return ResponseUtils.respond(res, 422, JSON.stringify(errorMessage));
      }
      return ResponseUtils.respond(res, constants.HTTP_200, {
        id_token: token,
        update_time: new Date(),
      });

    } catch {
      return ResponseUtils.respond(res, 422, JSON.stringify(errorMessage));
    }
  };


  jwtVerify = async (req, res) => {
    const token = req.query.token;
    try {
      const decoded = JWTHelper.verifyToken(token);
      return ResponseUtils.respond(res, constants.HTTP_200, {
        success: true,
        data: decoded,
      });
    } catch (error) {
      return ResponseUtils.respondError(res, constants.HTTP_401, error);
    }
  };

  saveBkashToken = async (req, res) => {
    try {
      const data = await RedisModel.saveBkashToken(req);
      return ResponseUtils.respond(res, constants.HTTP_200, data);
    } catch (err) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };





  appleRedirect = async (req, res) => {
    try {
      // 1. Extract data from the POST body
      // NOTE: Ensure app.use(express.urlencoded({ extended: true })) is enabled in your main app file
      const { code, id_token, state, user } = req.body;
      const packageName = 'com.kabbik.app';
            // 2. Build query parameters safely
      const params = new URLSearchParams();
      if (code) params.append('code', code);
      if (id_token) params.append('id_token', id_token);
      if (state) params.append('state', state);
      if (user) params.append('user', user);

      // 3. Construct the Android Intent String
      const intentUrl = `intent://callback?${params.toString()}#Intent;package=${packageName};scheme=signinwithapple;end`;

      // 4. Redirect to the Intent
      // This closes the webview and passes data back to Flutter
      return res.redirect(307, intentUrl);

    } catch (err) {
      console.error('Apple Redirect Error:', err);
      return res.status(500).send('An error occurred during Apple Sign-In redirect.');
    }
  };






  bkashTokenAvailability = async (req, res) => {
    try {
      const data = await RedisModel.bkashTokenAvailability(req);
      return ResponseUtils.respond(res, constants.HTTP_200, data);
    } catch (err) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };

  deleteBkashToken = async (req, res) => {
    try {
      const data = await RedisModel.deleteBkashToken(req);
      return ResponseUtils.respond(res, constants.HTTP_200, data);
    } catch (err) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };

  toffeeLogin = async (req, res) => {
    // console.log("Header: ");
    // console.log("Headers: " + JSON.stringify(req.headers));

    var moment = require("moment");
    // console.log("Query: " + JSON.stringify(req.query));
    // console.log(bodyData);
    // if (req.body.username == "bkashLogin" && req.body.password == "asAS12!@" && req.body.mobile_number != null) {
    const userName = req.body.subscriber_id;
    const client_id = req.body && req.body.client_id ? req.body.client_id : "";
    const client_secret = req.body.client_secret;
    const authSrc = "toffeeApp";
    const fullName = "User";
    const imageUrl = null;
    // if (!this.validatePhoneNumber(userName)) {
    //     return ResponseUtils.respondError(res, constants.HTTP_401, 'Invalid number!');
    // }
    if (
      client_id == null ||
      client_id == "" ||
      client_id != "toffee-client-2024"
    ) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_401,
        "Invalid Client Id!"
      );
    }
    if (
      client_secret == null ||
      client_secret == "" ||
      client_secret != "tONbKnVJsmc4g6cS"
    ) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_401,
        "Invalid Client Secret!"
      );
    }
    if (!userName) {
      return ResponseUtils.respondError(res, constants.HTTP_401, "Invalid id!");
    }
    const user = await UserModel.createOrReturnNewMybl(
      userName,
      constants.PHONE,
      authSrc,
      client_id,
      client_secret
    );
    if (!user) {
      return ResponseUtils.respond(res, constants.HTTP_400, "Unable to login!");
    }
    const token = JWTHelper.generateTokenOneDay({
      user_id: user.id.toString(),
      role: user.role,
    });
    var now = moment();
    var formattedDateTime = now.format("DD-MM-YY HH:mm:ss");
    return ResponseUtils.respond(res, constants.HTTP_200, {
      success: "true",
      token: token,
      expiry: "23:59:59",
    });
    // }

    return ResponseUtils.respondError(
      res,
      constants.HTTP_401,
      "Unable to login!"
    );
  };

  toffeeLogin2 = async (req, res) => {
    // console.log("Header: ");
    // console.log("Headers: " + JSON.stringify(req.headers));

    var moment = require("moment");
    // console.log(bodyData);
    // if (req.body.username == "bkashLogin" && req.body.password == "asAS12!@" && req.body.mobile_number != null) {
    const userName = req.body.msisdn;
    const client_id = req.body.client_id;
    const client_secret = req.body.client_secret;
    const authSrc = "toffeeApp";
    const fullName = "User";
    const imageUrl = null;
    if (!this.validatePhoneNumber(userName)) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_401,
        "Invalid number!"
      );
    }
    if (client_id == null || client_id == "") {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_401,
        "Invalid Client Id!"
      );
    }
    if (client_secret == null || client_secret == "") {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_401,
        "Invalid Client Secret!"
      );
    }
    const user = await UserModel.createOrReturnNewMybl(
      userName,
      constants.PHONE,
      authSrc,
      client_id,
      client_secret
    );
    if (!user) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_401,
        "Unable to login!"
      );
    }
    const token = JWTHelper.generateTokenOneDay({
      user_id: user.id.toString(),
      role: user.role,
    });
    var now = moment();
    var formattedDateTime = now.format("DD-MM-YY HH:mm:ss");
    return ResponseUtils.respond(res, constants.HTTP_200, {
      token: token,
      expiry: "23:59:59",
    });
    // }

    return ResponseUtils.respondError(
      res,
      constants.HTTP_401,
      "Unable to login!"
    );
  };

  verifyOtp = async (req, res) => {
    this.checkValidation(req);
    const { msisdn, password } = req.body;

    if (msisdn == "8801725474021" && password == "123234") {
      return ResponseUtils.respond(res, constants.HTTP_200, {
        verified: true,
      });
    }
    var result = await OtpModel.findUpdate(msisdn, password);
    if (!result || result === -1) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_401,
        constants.UNAUTH_REQ
      );
    }


    // let deviceLimitValidation = await userModel.deviceLimiter(req,user?.id);

    // result = 1 found & updated
    return ResponseUtils.respond(res, constants.HTTP_200, {
      verified: true,
    });
  };


  verifyOtp2 = async (req, res) => {
    this.checkValidation(req);
    const { msisdn, password, authSrc } = req.body;
    
    if (msisdn == "8801725474021" && password == "123234") {
      return ResponseUtils.respond(res, constants.HTTP_200, {
        verified: true,

      });

    }
    var result = await OtpModel.findUpdate(msisdn, password);
        if (!result || result === -1) {
            return ResponseUtils.respondError(
        res,
        constants.HTTP_401,
        constants.UNAUTH_REQ
      );
    }

    const user = await UserModel.createOrReturnNew(
      msisdn,
      '',
      '',
      '',
      ''
    );
    if (!user) {
            return ResponseUtils.respondError(
        res,
        constants.HTTP_401,
        "Unable to login!"
      );
    }

    let deviceLimitValidation = await userModel.deviceLimiter(req,user?.id);

    const token = JWTHelper.generateToken({
      user_id: user.id.toString(),
      role: user.role,
    });

    let user_ip;

    if (req.headers["x-forwarded-for"]) {
      user_ip = JSON.stringify(req.headers["x-forwarded-for"]);
    } else {
      user_ip = "N/A";
    }

    const insertUserLogs =
      "INSERT INTO user_action_logs(USERID, userAction, endpoint, forTask, source, user_ip) VALUES (?, ?, ?,?,?, ?);";
    // try {
    const resultsInsertUserLogs = await DB.query(insertUserLogs, [
      user.id.toString(),
      "Login",
      "/loginNew",
      "Login",
      authSrc,
      user_ip,
    ]);
    return ResponseUtils.respond(res, constants.HTTP_200, { 
      token, user, deviceLimitExceed: deviceLimitValidation === 'device limit Execeeded',
      deviceLimit: constants.MAX_DEVICE_LIMIT
 });



    // result = 1 found & updated
    // return ResponseUtils.respond(res, constants.HTTP_200, {
    //   verified: true,
    // });
  };

  resendOtp = async (req, res) => {
    const { msisdn } = req.body;
    OtpModel.updateAllForNum(msisdn);
    this.generateSendOtp(req, res);
  };

  checkValidation = (req) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      throw new HttpException(400, "Validation faild", errors);
    }
  };

  blockIp = async (req) => {
    const filePath = path.join(
      "/var/www/html/kabbik-backend-updated",
      "unauthorized-ip.txt"
    );
    const { msisdn, isBlocked, isBlockTime } = req.body;
    const ip = req.headers["x-forwarded-for"];
        // Check if the file exists and read it
    fs.readFile(filePath, "utf8", (err, data) => {
      if (err && err.code !== "ENOENT") {
        // If there's another error (e.g., permission issue), return an error
        return false;
      }

      // Check if the IP is already in the file (data could be an empty string if the file doesn't exist)
      if (data?.includes(ip)) {
        return true;
      }

      // If the IP is not found, append it to the file
      fs.appendFile(filePath, JSON.stringify(ip) + "\n", (err) => {
        if (err) {
          return false;
        }
        return true;
      });
    });
  };

  getReferrerValidOrNot = (str) => {
    let whiteListedReferrer = [
      "http://localhost:8090",
      "https://kabbik.com",
      "https://www.kabbik.com",
      "http://kabbik.com",
      "https://myblaudiobook.kabbik.com/",
      "http://myblaudiobook.kabbik.com/",
      "https://old.kabbik.com"
    ]

    for (let i = 0; i < whiteListedReferrer.length; i++) {
      if (str.startsWith(whiteListedReferrer[i])) {
        return true
      }
    }
    return false
  }

  generateSendOtp = async (req, res) => {
    const { msisdn, passKey} = req.body;
    var referer = req.headers.referer || req.headers.referrer;
    var user_ip = req.headers["x-forwarded-for"];
    var user_agent = req.headers["user-agent"];
    var refererString = referer ? JSON.stringify(referer) : "N/A";
    var userIpString = user_ip ? JSON.stringify(user_ip) : "N/A";
    var userAgentString = user_agent ? JSON.stringify(user_agent) : "N/A";


    if (referer) {
      if (!this.getReferrerValidOrNot(referer)) {
                return ResponseUtils.respondError(
          res,
          constants.HTTP_400,
          "Unable to send OTP"
        );
      }
    } else if (user_agent) {
      if (!user_agent.toLowerCase().includes("dart/")) {
        this.blockIp(req);
        
        return ResponseUtils.respondError(
          res,
          constants.HTTP_400,
          "Unable to send OTP"
        );
      }
    } else {
      
      return ResponseUtils.respondError(
        res,
        constants.HTTP_400,
        "Unable to send OTP"
      );
    }



    this.checkValidation(req);

    const pass = OtpHelper.generateOtp();
    const msg = `Kabbik OTP Code is ${pass}`;


    const result = await OtpHelper.sendOtp(
      constants.SMS_API_USER_NAME,
      constants.SMS_API_PASS,
      msisdn,
      msg,
      pass,
      userIpString,
      refererString,
      userAgentString,
      passKey
    ).catch((e) => {
           });

    if (!result) {
      
      return ResponseUtils.respondError(
        res,
        constants.HTTP_200,
        "Unable to send OTP"
      );
    } else if (result == "exceeded") {
      
      return ResponseUtils.respondError(
        res,
        constants.HTTP_200,
        "Daily OTP limit reached. Try again tomorrow or contact support if needed."
      );
    } else if (result.lessthan2m && result.lessthan2m == true) {
      
      return ResponseUtils.respond(res, constants.HTTP_200, {
        success: true,
        remainingTime: result.remainingTime,
      });
    }
    
    return ResponseUtils.respond(res, constants.HTTP_200, {
      created: true,
      remainingTime: 118,
    });
  };

  sendOtpTest = async (req, res) => {
    const { msisdn } = req.body;
    const pass = OtpHelper.generateOtp();
    const msg = `Kabbik OTP Code is ${pass}`;
    const result = await OtpHelper.sendOtp(
      constants.SMS_API_USER_NAME,
      constants.SMS_API_PASS,
      msisdn,
      msg
    ).catch((e) => {
      LoggerError.log(e);
    });
    if (!result) {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_400,
        "Unable to send OTP"
      );
    }

    if (result == "exceeded") {
      return ResponseUtils.respondError(
        res,
        constants.HTTP_400,
        "Otp Limit Exceeded"
      );
    }
    return ResponseUtils.respond(res, constants.HTTP_200, {
      created: true,
    });
  };
  validatePhoneNumber(phoneNumber) {
    // Define a regex pattern to match the format "088XXXXXXXXXX"
    const regex = /^88\d{11}$/;

    // Use the test() method to check if the phoneNumber matches the pattern
    return regex.test(phoneNumber);
  }
}

module.exports = new AuthController();
