const DB = require("../db");
const BkashModel = require("../models/bkash-model");
const LoggerError = require("../../utils/logger-error");
const { multipleColumnSet } = require("../../utils/core-utils");
const constants = require("../../utils/constants");

const normalizeDevicePayload = (body = {}) => {
  const deviceInfo = body.device_info || {};
  return {
    device_id: body.device_id || deviceInfo.device_id || deviceInfo.deviceId || null,
    device_name: body.device_name || deviceInfo.device_name || deviceInfo.deviceName || null,
    model: body.model || deviceInfo.model || deviceInfo.deviceModel || null,
    os: body.os || deviceInfo.os || null,
    user_agent: body.user_agent || null,
  };
};

class UserModel {
  tableName = "users";

  findForUserIdPurchase = async (userId) => {
    try {
      let sql = "CALL get_user_purchases(?)";
      const results = await DB.query(sql, [userId]);
      if (results) {
        return results[0];
      }
      return undefined;
    } catch (e) {
      LoggerError.log(e);
      return undefined;
    }
  };

  findOnesPurchase = async (params) => {
    try {
      const sql = "CALL get_purchase_count(?, ?)";
      const results = await DB.query(sql, [params[0], params[1]]);
      var matchCountObj = results[0][0];
      let key = Object.keys(matchCountObj)[0];
      const is_purchase = matchCountObj[key] > 0 ? true : false;
      const data = {
        track_id: parseInt(params[0]),
        is_purchase: is_purchase,
      };
      if (data) {
        return data;
      }
      return undefined;
    } catch (e) {
      coreUtils.printStringify(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  getAll = async () => {
    const sql = `SELECT * FROM ${this.tableName} WHERE role = 1`;
    const result = await DB.query(sql);
    if (result) {
      return result;
    }
    return undefined;
  };

  setPassword = async (userId, passHash) => {
    await DB.query(
      "UPDATE users SET pass_hash = ? WHERE id = ?",
      [passHash, userId]
    );
  }

  findByPhone = async (key, value) => {
    const sql = `SELECT * FROM ${this.tableName}
        WHERE ${key}='${value}'`;

    const result = await DB.query(sql);
    if (result) {
      // return back the first row (user)
      return result[0];
    }
    return undefined;
  };

  deviceLimiter = async (req,userId) => {
    try{
      let limit = constants.MAX_DEVICE_LIMIT;
      const { device_name, os, device_id, model, user_agent } = normalizeDevicePayload(req.body);

      if (!device_id) {
        return true;
      }

      const ip =req.headers['x-forwarded-for']?.split(',')?.[0] || req.socket?.remoteAddress;
      let deviceSQL = `SELECT * FROM user_device_info AS udi WHERE udi.user_id=? and is_active= 1 and deleted = 0`;

      let deviceList = await DB.query(deviceSQL,[userId]);
      let item = deviceList.find((item)=>item?.device_id===device_id);
            if(item?.device_id){
        return true;
      }
      else if(deviceList.length>=limit){
        return 'device limit Execeeded'
      }

      let insertSql=`
        INSERT INTO user_device_info
      (device_name, user_id, os, device_id, model, user_agent, ip,is_active, deleted)
      VALUES (?, ?, ?, ?, ?, ?, ?,?,?)
      ON DUPLICATE KEY UPDATE
        device_name = VALUES(device_name),
        user_id     = VALUES(user_id),
        os          = VALUES(os),
        model       = VALUES(model),
        user_agent = VALUES(user_agent),
        ip          = VALUES(ip),
        is_active   = VALUES(is_active),
        deleted     = VALUES(deleted);
      `

      let insertToDeviceList = await DB.query(insertSql,[device_name, userId, os, device_id, model, user_agent,ip,1,0]);
      return true;

    }catch(e){
      console.log(e);
      return false;
    }
  };

  logout = async (req) => {
    try{
      const { device_id } = normalizeDevicePayload(req.body);
      let user_id=req.user?.user_id;
            if(!device_id || !user_id){
        return false;
      }
      let insertSql=`
        delete from user_device_info       
          WHERE device_id = ? and user_id = ?;
      `

      let insertToDeviceList = await DB.query(insertSql,[device_id,user_id]);
      return true;

    }catch(e){
      console.log(e);
      return false;
    }
  };

  getDeviceList = async (req) => {
    try{
      
      let user_id = req.user?.user_id;

      let deviceListSql=`
        select * from  user_device_info     
          WHERE user_id = ? and is_active=1;
      `

      let deviceListToDeviceList = await DB.query(deviceListSql,[user_id]);

      return deviceListToDeviceList;

    }catch(e){
      console.log(e);
      return false;
    }
  };

  findOne = async (msisdn) => {

    const sql = `SELECT * FROM ${this.tableName}
        WHERE ${columnSet}`;

    const result = await DB.query(sql, [...values]);
    if (result) {
      // return back the first row (user)
      return result[0];
    }
    return undefined;
  };

  findById = async (id) => {
        const findUserSql = "CALL get_entity_by_id(?, ?)";

    var lastPaymentFailedResponse = { status: "", message: "" };
    try {
      var results = await DB.query(findUserSql, [id, this.tableName]);
      if (results) {

        var currentDateTime = new Date().getTime();

        if (results[0][0].is_subscribed === 1) {

          var nextPaymentDateUserTable = results[0][0].next_purchase_time;
           if (nextPaymentDateUserTable < currentDateTime) {
            const sqlUpdateUser = `UPDATE users SET package_id = ?, is_subscribed = ?, payment_method = ?, purchase_time =?, next_purchase_time = ?, is_free_trial = ?, canceled_subscription = ? WHERE id = ?`;
            await DB.query(sqlUpdateUser, [
              0,
              0,
              "",
              0,
              0,
              0,
              0,
              results[0][0].id,
            ]);

            results = await DB.query(findUserSql, [id, this.tableName]);

          }

          const sql = `SELECT * FROM subscription_packages WHERE subscriptionItemId = ?`;
          const resultSubscription = await DB.query(sql, [
            results[0][0].package_id,
          ]);
          if (resultSubscription) {
            results[0][0].subscriptionDetails = resultSubscription[0];

            if (results[0][0].is_free_trial == 1 && results[0][0].payment_method == "bKash") {
              results[0][0].subscriptionDetails.name = "7 Days free trial";
            }

          }

        }

        return {
          ...results[0][0],
          ...lastPaymentFailedResponse,
        };
      }
      return undefined;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  findByUsername = async (id) => {
    const sql = "CALL get_entity_by_username(?, ?)";
    var lastPaymentFailedResponse = { status: "", message: "" };
    try {
      var results = await DB.query(sql, [id, this.tableName]);
      if (results) {

        var currentDateTime = new Date().getTime();
        if (results[0][0].is_subscribed == 1) {
          if (
            results[0][0].canceled_subscription == 1 &&
            results[0][0].payment_method == "bKash"
          ) {
            var getpaymentDetailsBySubscriptionId =
              await BkashModel.getBkashQuerySubscriptionRequest(
                results[0][0].subscription_id,
                null
              );

            var paymentDetailsBySubscriptionId =
              await BkashModel.getBkashQueryBySubscriptionID(
                getpaymentDetailsBySubscriptionId.id,
                null
              );
            var nextPaymentDate =
              paymentDetailsBySubscriptionId.nextPaymentDate;
            var nextPaymentDateUserTable = results[0][0].next_purchase_time;
            var nextPaymentDateTime = Date.parse(nextPaymentDate);
            
            if (paymentDetailsBySubscriptionId.status != "INITIALIZED") {
              if (paymentDetailsBySubscriptionId.status == "SUCCEEDED") {
                if (nextPaymentDateTime > currentDateTime) {
                  const sqlUpdateUser = `UPDATE users SET canceled_subscription = ? WHERE id = ?`;

                  const resultUpdateUser = await DB.query(sqlUpdateUser, [
                    0,
                    results[0][0].id,
                  ]);
                } else {
                  var paymentDetailsData =
                    await BkashModel.getBkashPaymentListSubscriptionID(
                      getpaymentDetailsBySubscriptionId.id,
                      null
                    );
                  var lastPayment;
                  if (paymentDetailsData.length > 0) {
                    var lastPayment =
                      paymentDetailsData[paymentDetailsData.length - 1];
                    if (lastPayment.status == "FAILED_PAYMENT") {
                      lastPaymentFailedResponse.status = "FAILED_PAYMENT";
                      lastPaymentFailedResponse.message =
                        "Keep your bKash Account Balance Sufficient to renew your subscription";
                    }
                    // else {
                    //     returnValue = true
                    // }
                  }
                  // else {
                  //     returnValue = false
                  // }
                }

                const sqlUser = "CALL get_entity_by_id(?, ?)";
                results = await DB.query(sqlUser, [id, this.tableName]);
              } else if (paymentDetailsBySubscriptionId.status == "CANCELLED") {
                if (nextPaymentDateUserTable < currentDateTime) {
                  const sqlUpdateUser = `UPDATE users SET package_id = ?, is_subscribed= ?, payment_method = ?, purchase_time = ?, next_purchase_time =?,canceled_subscription = ? WHERE id = ?`;

                  const resultUpdateUser = await DB.query(sqlUpdateUser, [
                    0,
                    0,
                    "",
                    0,
                    0,
                    0,
                    results[0][0].id,
                  ]);
                }

                const sqlUser = "CALL get_entity_by_id(?, ?)";
                results = await DB.query(sqlUser, [id, this.tableName]);
              }
            } else {
              if (nextPaymentDateUserTable < currentDateTime) {
                const sqlUpdateUser = `UPDATE users SET package_id =?, is_subscribed =? , payment_method = ?, purchase_time =?, next_purchase_time = ?,canceled_subscription = ? WHERE id = ?`;

                const resultUpdateUser = await DB.query(sqlUpdateUser, [
                  0,
                  0,
                  "",
                  0,
                  0,
                  0,
                  results[0][0].id,
                ]);
              }
            }
          } else if (
            results[0][0].is_subscribed == 1 &&
            results[0][0].payment_method == "SurjoPay"
          ) {
            var nextPaymentDateUserTable = results[0][0].next_purchase_time;
            if (nextPaymentDateUserTable < currentDateTime) {
              const sqlUpdateUser = `UPDATE users SET package_id = ?, is_subscribed = ?, payment_method = ?, purchase_time =?, next_purchase_time = ?,canceled_subscription = ? WHERE id = ?`;

              const resultUpdateUser = await DB.query(sqlUpdateUser, [
                0,
                0,
                "",
                0,
                0,
                0,
                results[0][0].id,
              ]);
            }
          } else if (
            results[0][0].is_subscribed == 1 &&
            results[0][0].payment_method == "RedeemCode"
          ) {
            var nextPaymentDateUserTable = results[0][0].next_purchase_time;
            if (nextPaymentDateUserTable < currentDateTime) {
              const sqlUpdateUser = `UPDATE users SET package_id = ?, is_subscribed = ?, payment_method = ?, purchase_time =?, next_purchase_time = ?,canceled_subscription = ? WHERE id = ?`;

              const resultUpdateUser = await DB.query(sqlUpdateUser, [
                0,
                0,
                "",
                0,
                0,
                0,
                results[0][0].id,
              ]);
            }
          } else if (
            results[0][0].is_subscribed == 1 &&
            results[0][0].payment_method == "Agent"
          ) {
            var nextPaymentDateUserTable = results[0][0].next_purchase_time;
            if (nextPaymentDateUserTable < currentDateTime) {
              const sqlUpdateUser = `UPDATE users SET package_id = ?, is_subscribed = ?, payment_method = ?, purchase_time =?, next_purchase_time = ?,canceled_subscription = ? WHERE id = ?`;

              const resultUpdateUser = await DB.query(sqlUpdateUser, [
                0,
                0,
                "",
                0,
                0,
                0,
                results[0][0].id,
              ]);
            }
          } else if (results[0][0].is_subscribed == 1) {
            var nextPaymentDateUserTable = results[0][0].next_purchase_time;
            if (nextPaymentDateUserTable < currentDateTime) {
              const sqlUpdateUser = `UPDATE users SET package_id = ?, is_subscribed = ?, payment_method = ?, purchase_time =?, next_purchase_time = ?,canceled_subscription = ? WHERE id = ?`;

              const resultUpdateUser = await DB.query(sqlUpdateUser, [
                0,
                0,
                "",
                0,
                0,
                0,
                results[0][0].id,
              ]);
            }
          }
          const sql = `SELECT * FROM subscription_packages WHERE subscriptionItemId = ?`;
          const resultSubscription = await DB.query(sql, [
            results[0][0].package_id,
          ]);
          if (resultSubscription) {
            // console.log(resultSubscription)
            results[0][0].subscriptionDetails = resultSubscription[0];
          }
        }

        
        return {
          ...results[0][0],
          ...lastPaymentFailedResponse,
        };
      }
      return undefined;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  findByUserNameRole = async (userName, role) => {
    const sql = "CALL find_by_username_role(?, ?)";
    try {
      const results = await DB.query(sql, [userName, role]);
      if (results) {
        return results[0][0];
      }
      return undefined;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  bootstrapSwaggerAdmin = async ({ userName, fullName, passwordHash }) => {
    try {
      const existingAdmin = await this.findByUserNameRole(userName, 2);

      if (existingAdmin) {
        await DB.query(
          `UPDATE ${this.tableName} SET pass_hash = ?, full_name = ? WHERE id = ?`,
          [passwordHash, fullName, existingAdmin.id]
        );
      } else {
        const checkSql = `SELECT id, role FROM ${this.tableName} WHERE user_name = ? LIMIT 1`;
        const existingUser = await DB.query(checkSql, [userName]);

        if (existingUser && existingUser.length > 0) {
          if (Number(existingUser[0].role) !== 2) {
            return { conflict: true };
          }
          await DB.query(
            `UPDATE ${this.tableName} SET pass_hash = ?, full_name = ? WHERE id = ?`,
            [passwordHash, fullName, existingUser[0].id]
          );
        } else {
          await DB.query(
            `INSERT INTO ${this.tableName} (user_name, full_name, pass_hash, role, auth_src, channel)
             VALUES (?, ?, ?, 2, 'swagger', 'dev')`,
            [userName, fullName, passwordHash]
          );
        }
      }

      const user = await this.findByUserNameRole(userName, 2);
      if (!user) {
        return { error: 'Failed to bootstrap admin user' };
      }

      return { user };
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  giveSubscriptionByAgent = async (userId, packageId) => {
    try {
      var someDate = new Date();
      var numberOfDaysToAdd = 6;
      if (packageId != null && packageId == 1) {
        numberOfDaysToAdd = 30;
      }
      if (packageId != null && packageId == 2) {
        numberOfDaysToAdd = 180;
      }
      if (packageId != null && packageId == 3) {
        numberOfDaysToAdd = 365;
      }

      if (packageId != null && packageId == 4) {
        numberOfDaysToAdd = 90;
      }
      var result444 = someDate.setDate(someDate.getDate() + numberOfDaysToAdd);
      var currentDateTime = new Date().valueOf();
      var nextPaymentDateTime = result444;
      var method = "Agent";
      const sqlUpdateUser = `UPDATE users SET is_subscribed = ?, subscription_id = ?, payment_method = ?, package_id = ?, purchase_time = ?,  next_purchase_time = ?,  canceled_subscription = ? WHERE id = ?`;

      const resultUpdateUser = await DB.query(sqlUpdateUser, [
        true,
        "AgentRequest",
        method,
        packageId,
        currentDateTime,
        nextPaymentDateTime,
        0,
        userId,
      ]);
      if (resultUpdateUser) {
        // sp returns extra data 2d array, need the first one
        return await this.findById(userId);
      }
      return undefined;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  createOrReturn = async (userName, fullName, authSrc, imageUrl) => {
    const sql = "CALL create_or_return_user(?, ?, ?, ?)";
    try {
      const results = await DB.query(sql, [
        userName,
        fullName,
        authSrc,
        imageUrl,
      ]);
      if (results) {
        // sp returns extra data 2d array, need the first one
        return results[0][0];
      }
      return undefined;
    } catch (e) {
      LoggerError.log(e);
      return undefined;
    }
  };

  createOrReturnNew = async (
    userName,
    fullName,
    authSrc,
    imageUrl,
    channel
  ) => {
    var updateAvailable = false;
    const sql = "CALL create_or_return_user_channel(?, ?, ?, ?, ?)";

    try {
      const results = await DB.query(sql, [
        userName,
        fullName,
        authSrc,
        imageUrl,
        channel,
      ]);
      // console.log("here: "+userName)
      if (
        userName.match(/^[0-9]+$/) != null &&
        (results[0][0].phone_no == null || results[0][0].phone_no == "")
      ) {
        const sqlPhone = "UPDATE users SET phone_no = ? Where id = ?";
        const resultPhone = await DB.query(sqlPhone, [
          userName,
          results[0][0].id,
        ]);
        updateAvailable = true;
      }
      const emailRegexp =
        /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

      // console.log("here emailRegexp.test(userName): "+emailRegexp.test(userName))
      if (
        emailRegexp.test(userName) &&
        (results[0][0].user_email == null || results[0][0].user_email == "")
      ) {
        const sqlPhone = "UPDATE users SET user_email = ? Where id = ?";
        const resultPhone = await DB.query(sqlPhone, [
          userName,
          results[0][0].id,
        ]);
        updateAvailable = true;
      }

      if (updateAvailable) {
        const sqlAgain = "CALL create_or_return_user_channel(?, ?, ?, ?, ?)";

        const resultsAgain = await DB.query(sqlAgain, [
          userName,
          fullName,
          authSrc,
          imageUrl,
          channel,
        ]);

        if (resultsAgain) {
          return resultsAgain[0][0];
        }
        return undefined;
      }
      if (results) {
        return results[0][0];
      }
      return undefined;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  createOrReturnNewApple = async (userName, authSrc, channel) => {
    var updateAvailable = false;
    const sql = "CALL create_or_return_user_channel_ios(?, ?, ?)";

    try {
      const results = await DB.query(sql, [userName, authSrc, channel]);
      // console.log("here: "+userName)
      if (
        userName.match(/^[0-9]+$/) != null &&
        (results[0][0].phone_no == null || results[0][0].phone_no == "")
      ) {
        const sqlPhone = "UPDATE users SET phone_no = ? Where id = ?";
        const resultPhone = await DB.query(sqlPhone, [
          userName,
          results[0][0].id,
        ]);
        updateAvailable = true;
      }
      const emailRegexp =
        /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

      // console.log("here emailRegexp.test(userName): "+emailRegexp.test(userName))
      if (
        emailRegexp.test(userName) &&
        (results[0][0].user_email == null || results[0][0].user_email == "")
      ) {
        const sqlPhone = "UPDATE users SET user_email = ? Where id = ?";
        const resultPhone = await DB.query(sqlPhone, [
          userName,
          results[0][0].id,
        ]);
        updateAvailable = true;
      }

      if (updateAvailable) {
        const sqlAgain = "CALL create_or_return_user_channel_ios(?, ?, ?)";

        const resultsAgain = await DB.query(sqlAgain, [
          userName,
          authSrc,
          channel,
        ]);

        if (resultsAgain) {
          return resultsAgain[0][0];
        }
        return undefined;
      }
      if (results) {
        return results[0][0];
      }
      return undefined;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };

 


  createOrReturnNewMybl = async (
  userName,
  authSrc,
  channel,
  client_id,
  client_secret
) => {
  try {
    // Single query to insert new user or get existing user ID
    const insertSql = `
      INSERT INTO ${this.tableName} (user_name, auth_src, channel, client_id, client_secret)
      VALUES (?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE id = LAST_INSERT_ID(id)
    `;

    const result = await DB.query(insertSql, [
      userName,
      authSrc,
      channel,
      client_id,
      client_secret
    ]);

    if (!result || !result.insertId) {
      return undefined;
    }

    const userData = { id: result.insertId, role: 1 }; // Default role = 1
 
    return userData;
  } catch (e) {
    console.log(e);
    LoggerError.log(e);
    return undefined;
  }
};




  createOrReturnTogumoguUser = async (
    username,
    authSrc,
    channel,
    client_id,
    client_secret
  ) => {
    try {
      // Single query to get user if exists
      const checkSql = `SELECT id, role FROM ${this.tableName} WHERE user_name = ? LIMIT 1`;
      const existingUser = await DB.query(checkSql, [username]);
      let userData;
      if (existingUser && existingUser.length > 0) {
        userData = existingUser[0];
      } else {
        // Create new user if doesn't exist
        const insertSql = `
          INSERT INTO ${this.tableName} (user_name, auth_src, channel, client_id, client_secret) 
          VALUES (?, ?, ?, ?, ?)
        `;
        const result = await DB.query(insertSql, [
          username,
          authSrc,
          channel,
          client_id,
          client_secret,
        ]);
        if (!result || !result.insertId) {
          return undefined;
        }
        const newUserSql = `SELECT id, role FROM ${this.tableName} WHERE id = ? LIMIT 1`;
        const newUser = await DB.query(newUserSql, [result.insertId]);
        if (!newUser || !newUser.length) {
          return undefined;
        }
        userData = newUser[0];
      }
      // Promise.resolve().then(() => {
      //   const sessionInsert = "INSERT INTO stream_session (user_id) VALUES (?)";
      //   DB.query(sessionInsert, [userData.id]).catch((err) =>
      //     console.error(err)
      //   );
      // });
      return userData;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  createOrReturnBkashAppInAppUser = async (
    mobile_number,
    username,
    authSrc,
    channel,
    client_id,
    client_secret
  ) => {
    try {
      // Single query to get user if exists
      const checkSql = `SELECT id, role, is_subscribed FROM ${this.tableName} WHERE user_name = ? LIMIT 1`;
      const existingUser = await DB.query(checkSql, [mobile_number]);
      let userData;
      if (existingUser && existingUser.length > 0) {
        userData = existingUser[0];
      } else {
        // Create new user if doesn't exist
        const insertSql = `
        INSERT INTO ${this.tableName} (user_name, full_name, auth_src, channel, client_id, client_secret) 
          VALUES (?, ?, ?, ?, ?, ?)
        `;
        const result = await DB.query(insertSql, [
          mobile_number,
          username,
          authSrc,
          channel,
          client_id,
          client_secret,
        ]);
        if (!result || !result.insertId) {
          return undefined;
        }
        const newUserSql = `SELECT id, role FROM ${this.tableName} WHERE id = ? LIMIT 1`;
        const newUser = await DB.query(newUserSql, [result.insertId]);
        if (!newUser || !newUser.length) {
          return undefined;
        }
        userData = newUser[0];
      }
      return userData;
    } catch (e) {
      console.log(e);
      LoggerError.log(e);
      return undefined;
    }
  };

  updateName = async (userName, fullName) => {
    const sql = "CALL create_or_return_user_with_name_channel(?, ?)";
    try {
      const results = await DB.query(sql, [userName, fullName]);
      if (results) {
        return results[0][0];
      }
      return undefined;
    } catch (e) {
      LoggerError.log(e);
      return undefined;
    }
  };

  createOrReturnFb = async (
    userName,
    fullName,
    authSrc,
    imageUrl,
    userIdFb
  ) => {
    const sql = "CALL create_or_return_user_fb(?, ?, ?, ?, ?)";
    try {
            const results = await DB.query(sql, [
        userName,
        fullName,
        authSrc,
        imageUrl,
        userIdFb,
      ]);
            if (results) {
        // sp returns extra data 2d array, need the first one
        return results[0][0];
      }
      return undefined;
    } catch (e) {
      console.log("---------------------------------------fb error---------------------------------------", e);
      LoggerError.log(e);
      return undefined;
    }
  };

  updateUser = async (
    fullName,
    phone_email,
    city_name,
    address,
    post_code,
    imageUrl,
    id
  ) => {
    const sql = `UPDATE ${this.tableName} SET full_name = ?, phone_no = ?, city = ?, address = ?, post_code = ?, image_url = ? WHERE id = ?`;

    const result = await DB.query(sql, [
      fullName,
      phone_email,
      city_name,
      address,
      post_code,
      imageUrl,
      id,
    ]);

    return result;
  };

  updateUserWithoutImage = async (
    fullName,
    phone_email,
    city_name,
    address,
    post_code,
    user_email,
    id
  ) => {
    const sql = `UPDATE ${this.tableName} SET full_name = ?, phone_no = ?, city = ?, address = ?, post_code = ?, user_email = ? WHERE id = ?`;

    const result = await DB.query(sql, [
      fullName,
      phone_email,
      city_name,
      address,
      post_code,
      user_email||null,
      id,
    ]);

    return result;
  };

  updateUserWithoutImagePhone = async (
    fullName,
    phone_phone,
    city_name,
    address,
    post_code,
    id
  ) => {
    const sql = `UPDATE ${this.tableName} SET full_name = ?, phone_no = ?, city = ?, address = ?, post_code = ? WHERE id = ?`;

    const result = await DB.query(sql, [
      fullName,
      phone_phone,
      city_name,
      address,
      post_code,
      id,
    ]);

    return result;
  };

  updateUserWhilePayment = async (
    fullName,
    city_name,
    address,
    post_code,
    phone_no,
    id
  ) => {
    const sql = `UPDATE ${this.tableName} SET full_name = ?, phone_no = ?, city = ?, address = ?, post_code = ? WHERE id = ?`;

    const result = await DB.query(sql, [
      fullName,
      phone_no,
      city_name,
      address,
      post_code,
      id,
    ]);

    return result;
  };

  delete = async (id) => {
    const sql = `DELETE FROM ${this.tableName}
        WHERE id = ?`;
    const result = await query(sql, [id]);
    const affectedRows = result ? result.affectedRows : 0;

    return affectedRows;
  };


  softDelete = async (id) => {
    try{
            const sql = ` UPDATE users
      SET user_name = CONCAT(
          user_name,
          '-d-',
          FLOOR(10000 + RAND() * 90000)
      )
      WHERE id = ?`;
      const result = await DB.query(sql, [id]);
      const affectedRows = result ? result.affectedRows : 0;

      return affectedRows;
    }catch(e){
      console.log("error-11111111111111111", e);
      return false;
    }
  };
}

module.exports = new UserModel();
