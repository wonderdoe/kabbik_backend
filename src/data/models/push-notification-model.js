const DB = require("../db");
const LoggerError = require("../../utils/logger-error");
const coreUtils = require("../../utils/core-utils");
const { JWT } = require("google-auth-library");
const fs = require("fs");
const admin = require("firebase-admin");
const axios = require("axios");
const StatusCheck = require("../../utils/status-code-check");

const moment = require("moment");
const cron = require("node-cron");

var serviceAccount = require("../../../service-account-file/kabbik-b93c7-firebase-adminsdk-zilwa-4f32ae6883.json");
const { getMessaging } = require("firebase-admin/messaging");

const { SchedulerClient, CreateScheduleCommand, DeleteScheduleCommand, ListSchedulesCommand, FlexibleTimeWindowMode, ActionAfterCompletion } = require("@aws-sdk/client-scheduler");
const { v4: uuidv4 } = require("uuid");
const { log } = require("console");


class PushNotificationModel {
  tableName_quiz_controller = "quiz_controller";
  tableName_quiz_questions = "quiz_questions";

  async getAccessToken() {
    try {
      const SERVICE_ACCOUNT_URL =
        "https://kabbik-space.sgp1.cdn.digitaloceanspaces.com/kabbik-b93c7-firebase-adminsdk-zilwa-4f32ae6883.json";

      const response = await axios.get(SERVICE_ACCOUNT_URL);
      const serviceAccount = response.data;

      const SCOPES = ["https://www.googleapis.com/auth/firebase.messaging"];
      const client = new JWT({
        email: serviceAccount.client_email,
        key: serviceAccount.private_key,
        scopes: SCOPES,
      });

      const tokens = await client.authorize();
            return tokens.access_token;
    } catch (error) {
      console.error("Error getting access token:", error);
      return false; // rethrow if you want to handle it further up
    }
  }

  gotoAuthorActivity = async (req) => {
    var data = {
      message: {
        data: {
          title: req.body.title,
          description: req.body.description,
          imageUrl: req.body.imageUrl,
          castcrewname: req.body.castcrew_name,
          gotoActivity: "gotoCastcrewActivity",
        },

        // "notification": {
        //     "title": req.body.title,
        //     "body": req.body.description,
        //     "image": req.body.imageUrl
        // },

        topic: "all-sub",
        // token:
        //   "fFr5e3JWSBi5kb7QgoSOM_:APA91bGACIrEQFEI5EsIZ8pz_Bu_mL4ZJGNnkZv2oYD2I6Za4Y06w1GE4tG6TOnyK8wflxFmBu33rmoe07aMRUTn2I9S_nehyQbBDg5_eElJ5mP4llRUVKY",
      },
    };

    const accessToken = await this.getAccessToken();
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    try {
      const url =
        "https://fcm.googleapis.com/v1/projects/kabbik-b93c7/messages:send";
      var config = {
        method: "POST",
        headers: headers,
        data: data,
        url,
      };
            const obj = await axios(config)
        .then(function (response) {
          
          // that.addResponseData(JSON.stringify(response.data))
          return response.data;
        })
        .catch(function (error) {
                    if (error.response) {
            return StatusCheck.checkStatus(error.response.data.errorCode);
            // return StatusCode.StatusCode.(res)
          }
        });

      
      // this.addResponseData(JSON.stringify(obj))
      return obj;
    } catch (error) {
      console.log(error);
      return null;
    }
  };

  gotoCastcrewActivity = async (req) => {
    var data = {
      message: {
        data: {
          title: req.body.title,
          description: req.body.description,
          imageUrl: req.body.imageUrl,
          castcrewname: req.body.castcrew_name,
          gotoActivity: "gotoCastcrewActivity",
        },

        // "notification": {
        //     "title": req.body.title,
        //     "body": req.body.description,
        //     "image": req.body.imageUrl
        // },

        topic: "all-sub",
        // token:
        //   "fFr5e3JWSBi5kb7QgoSOM_:APA91bGACIrEQFEI5EsIZ8pz_Bu_mL4ZJGNnkZv2oYD2I6Za4Y06w1GE4tG6TOnyK8wflxFmBu33rmoe07aMRUTn2I9S_nehyQbBDg5_eElJ5mP4llRUVKY",
      },
    };

    const accessToken = await this.getAccessToken();
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    try {
      const url =
        "https://fcm.googleapis.com/v1/projects/kabbik-b93c7/messages:send";
      var config = {
        method: "POST",
        headers: headers,
        data: data,
        url,
      };
      const obj = await axios(config)
        .then(function (response) {
          
          // that.addResponseData(JSON.stringify(response.data))
          return response.data;
        })
        .catch(function (error) {
                    if (error.response) {
            return StatusCheck.checkStatus(error.response.data.errorCode);
            // return StatusCode.StatusCode.(res)
          }
        });

      
      // this.addResponseData(JSON.stringify(obj))
      return obj;
    } catch (error) {
      console.log(error);
      return null;
    }
  };

  gotoDetailsActivity = async (req) => {
        var data = {
      message: {
        notification: {
          title: req.body.title,
          body: req.body.description,
          image: req.body.imageUrl,
        },
        data: {
          title: req.body.title,
          description: req.body.description,
          imageUrl: req.body.imageUrl,
          audiobook_id: req.body.audiobookId.toString(),
          audiobook_title: req.body.audiobookTitle,
          gotoActivity: "gotoDetailsActivity",
        },
        apns: {
          payload: {
            aps: {
              category: "NEW_MESSAGE_CATEGORY",
            },
          },
        },
        topic: "all-sub",
        // token: "cPhdbzgATeq7ZNpRMCEdl0:APA91bEOaztcwfsaANCt9uxt3Tl5P5iwoccqTgbeifqdxRLjZuM9OmPQZzB3C_te--FZU2HsJhBGTREe1X0YSUNwwsyaDvSMQxmUVAYvTy1QgFuVarHXYN0",
      },
    };

    const insertAppNotificationSql = "CALL create_app_notification(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    try {
      var res = await DB.query(insertAppNotificationSql,
        [
          encodeURIComponent(req.body.title), req.body.imageUrl,
          encodeURIComponent(req.body.description), "Listen Now", 0, null, null,
          1, "All", "/book_details", JSON.stringify(data.message.data), "PUSH_NOTIFICATION", 1
        ]);
      const insertedId = res[0][0]?.inserted_id;
      if (insertedId) {
        data.message.data["notificationId"] = insertedId.toString()
      }
    } catch (_) {
    }

    const accessToken = await this.getAccessToken();
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    try {
      const url =
        "https://fcm.googleapis.com/v1/projects/kabbik-b93c7/messages:send";
      var config = {
        method: "POST",
        headers: headers,
        data: data,
        url,
      };
      const obj = await axios(config)
        .then(function (response) {
          return response.data;
        })
        .catch(function (error) {
          if (error.response) {
                        return StatusCheck.checkStatus(error.response.data.errorCode);
          }
        });
      return obj;
    } catch (error) {
      console.log(error);
      return null;
    }
  };

  nonSubscribeUserActivity = async (req) => {
    try {
      
      const unSubUserTokensQuery = `
      SELECT distinct ft.token
      FROM fcm_token AS ft
      left JOIN users AS usr
      ON usr.id = ft.user_id
      WHERE
       ${ req.body.type?
         "usr.is_subscribed =" +(req.body.type === "unSubscribedUsers" ? "0 and" : "1 and")
       :''}
       ft.created_at < ?
       AND ft.created_at > ?
       `;
          

    // ${ req.body.type?
    //     "usr.is_subscribed =" +(req.body.type === "unSubscribedUsers" ? "0 and" : "1 and")
    //   :''}
    //   ft.created_at < ?
    //   AND ft.created_at > ?
    //   and
    

      const unSubUserTokens = await DB.query(unSubUserTokensQuery, [
        req.body.startDate,
        req.body.endDate,
      ]);
      

      var payloadData = {
        title: req.body.title,
        description: req.body.description,
        imageUrl: req.body.imageUrl ?? ""
      };
      if(req.body.arguments){
        payloadData.arguments =JSON.stringify(req.body.arguments);
        payloadData.isBackground='false'
      }
      

      if(req.body.audiobook_id && req.body.audiobook_title){
        payloadData.audiobook_id= req.body.audiobook_id.toString();
        payloadData.audiobook_title= req.body.audiobook_title;
        payloadData["gotoActivity"] = "gotoDetailsActivity";
      }else if (req.body.gotoActivity==="gotoCategoryWiseBookActivity") {
         payloadData["gotoActivity"] = "gotoCategoryWiseBookActivity";
      }else if(req.body.type === "unSubscribedUsers"){
        payloadData["gotoActivity"] = "gotoSubscriptionPage";

      }
      
      const insertAppNotificationSql = "CALL create_app_notification(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
      const userType = req.body.type === "unSubscribedUsers" ? "FREE_USER" : "SUBSCRIBED_USER";
      let page;
      if(req.body.audiobook_id){
        page = "/book_details"
      }else if(req.body.gotoActivity==="gotoCategoryWiseBookActivity"){
        page="/categories"
      }else if(req.body.type === "unSubscribedUsers"){
        page =  "/subscription"
      }

      
      const checkDuplicateSql = `
        SELECT * 
        FROM app_notification 
        WHERE title = ? 
        AND DATE(CONVERT_TZ(created_at, '+00:00', '+06:00')) = DATE(CONVERT_TZ(NOW(), '+00:00', '+06:00'))
        LIMIT 1
      `;

      try {
        const existingNotification = await DB.query(checkDuplicateSql, [
          encodeURIComponent(req.body.title)
        ]);

        if (existingNotification.length == 0) {
          let text ;
          if( req.body?.audiobook_id){
            text ="Listen Now"
          }else if(
            req.body.gotoActivity==="gotoCategoryWiseBookActivity"
          ){
            text = "Buy Full Category"
          }else{
            text = "SUBSCRIBE";
          }
          let isGradient=req.body?.audiobook_id?0:1;
          let color1=req.body?.audiobook_id?null:"0xFFFF0505";
          let color2=req.body?.audiobook_id?null:"0xff6B0000";

          var res = await DB.query(insertAppNotificationSql,
            [
              encodeURIComponent(req.body.title), req.body.imageUrl,
              encodeURIComponent(req.body.description), text, isGradient, color1, color2,
              1, userType, page, JSON.stringify(payloadData), "PUSH_NOTIFICATION", 1
            ]);
          const insertedId = res[0][0]?.inserted_id;
          if (insertedId) {
            payloadData["notificationId"] = insertedId.toString()
          }

        }
      } catch (err) { console.log(err)}

      // Initialize Firebase app only if it's not already initialized
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      }

      const batchSize = 500;
      let successful = 0;
      let unsuccessful = 0;

      const batches = [];

      for (let i = 0; i < unSubUserTokens.length; i += batchSize) {
        const batch = unSubUserTokens
          .slice(i, i + batchSize)
          .map((item) => item.token);

        batches.push(batch);
      }

      
      const promises = batches.map(async (batch) => {
        const message = {
          data: payloadData,
          notification: {
            title: req.body.title,
            body: req.body.description,
            image: req.body.imageUrl,
          },
          android: {
            priority: "high",
          },
          tokens: batch,
        };

        try {
          return admin
            .messaging()
            .sendEachForMulticast(message)
            .then((response) => {
              unsuccessful += response.failureCount;
              successful += response.successCount;
            });
        } catch (error) {
          console.log(error);
          return null;
        }
      });
      try {
        await Promise.all(promises);
      } catch (e) { }
      return {
        success: true,
        Successful: successful,
        UnSuccessful: unsuccessful,
      };
    } catch (e) {
      return {
        success: true,
        message: "theres someting fcm server issue"
      };
    }
  };

  gotoQuizActivity = async (req) => {
    var data = {
      data: {
        title: req.body.title,
        description: req.body.description,
        imageUrl: req.body.imageUrl,
        gotoActivity: "gotoQuizActivity",
      },

      // "notification": {
      //     "title": req.body.title,
      //     "body": req.body.description,
      //     "image": req.body.imageUrl
      // },
      topic: "all-sub",
      // registration_ids: [
      //   "fFr5e3JWSBi5kb7QgoSOM_:APA91bGACIrEQFEI5EsIZ8pz_Bu_mL4ZJGNnkZv2oYD2I6Za4Y06w1GE4tG6TOnyK8wflxFmBu33rmoe07aMRUTn2I9S_nehyQbBDg5_eElJ5mP4llRUVKY",
      // ],
    };

    const headers = {
      Authorization:
        "key=AAAAwR_5ano:APA91bGw_cabMQP0xuItRs0zS-uHZhOBYJHJm92lQA51klFjp8yexX9-hAaL5YG64fE-AZzUPUrifCCaytmbwifnL2sBxoQIpXwSu9aWS-wZpqIhmu9RAbhgTSI_ZXHUYtxKJARJzCe5",
      "Content-Type": "application/json",
    };
    const that = this;
    try {
      // console.log("dta IT: " + JSON.stringify(headersData))
      // console.log("dta BODY: " + JSON.stringify(bodyData))
      const url = "https://fcm.googleapis.com/fcm/send";
      var config = {
        method: "POST",
        headers: headers,
        data: data,
        url,
      };
            const obj = await axios(config)
        .then(function (response) {
          
          // that.addResponseData(JSON.stringify(response.data))
          return response.data;
        })
        .catch(function (error) {
                    if (error.response) {
            return StatusCheck.checkStatus(error.response.data.errorCode);
            // return StatusCode.StatusCode.(res)
          }
        });

      
      // this.addResponseData(JSON.stringify(obj))
      return obj;
    } catch (error) {
      return null;
    }
  };
  gotoSubscriptionPage = async (req) => {
    var data = {
      message: {
        data: {
          title: req.body.title,
          description: req.body.description,
          imageUrl: req.body.imageUrl,
          gotoActivity: "gotoSubscriptionPage",
        },

        notification: {
          title: req.body.title,
          body: req.body.description,
          image: req.body.imageUrl,
        },

        topic: "all-sub",
        //token: "cPhdbzgATeq7ZNpRMCEdl0:APA91bEOaztcwfsaANCt9uxt3Tl5P5iwoccqTgbeifqdxRLjZuM9OmPQZzB3C_te--FZU2HsJhBGTREe1X0YSUNwwsyaDvSMQxmUVAYvTy1QgFuVarHXYN0",
      },
    };
    const insertAppNotificationSql = "CALL create_app_notification(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
    try {
      var res = await DB.query(insertAppNotificationSql,
        [
          encodeURIComponent(req.body.title), req.body.imageUrl,
          encodeURIComponent(req.body.description), "SUBSCRIBE", 1, "0xFFFF0505", "0xff6B0000",
          1, "FREE_USER", "/subscription", JSON.stringify(data.message.data), "PUSH_NOTIFICATION", 1
        ]);
      const insertedId = res[0][0]?.inserted_id;
      if (insertedId) {
        data.message.data["notificationId"] = insertedId.toString()
      }

    } catch (_) { }

    const accessToken = await this.getAccessToken();
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    try {
      const url =
        "https://fcm.googleapis.com/v1/projects/kabbik-b93c7/messages:send";
      var config = {
        method: "POST",
        headers: headers,
        data: data,
        url,
      };
      const obj = await axios(config)
        .then(function (response) {
          return response.data;
        })
        .catch(function (error) {
          if (error.response) {
            return StatusCheck.checkStatus(error.response.data.errorCode);
          }
        });
      return obj;
    } catch (error) {
      return null;
    }
  };

  common = async (req) => {

    let notificationPayload={
      title: req.body.title,
      description: req.body.description,
      imageUrl: req.body.imageUrl || null,
      gotoPage: req.body.gotoPage||'',
      gotoActivity: req.body.gotoActivity ? req.body.gotoActivity : "common",
    };
    if(req.body.audiobook_id){
      
      notificationPayload.audiobook_id= req.body.audiobook_id;
      notificationPayload.audiobook_title= req.body.audiobook_title 

    }else if(req.body.courseId){
      notificationPayload.courseId= req.body.courseId;
    }

    var data = {
      message: {
        data:notificationPayload ,
        notification: {
          title: req.body.title,
          body: req.body.description,
          image: req.body.imageUrl,
        },

        apns: {
          payload: {
            aps: {
              category: "NEW_MESSAGE_CATEGORY",
            },
          },
        },

        topic: "all-sub",
        // token: "dkjig0XUREa6HjTThV7xd5:APA91bE9jrxy_O7h7z5RSIBq7jJeeDzl-zU8bWohzh2laCCYUz8u7sqe594-Git8rm4kTVUPc5f6eKWi4O5c2ynMVoNSSC-3VxEH991iAKkRAIG-pco-qr4",
      },
    };
    
    const insertAppNotificationSql = "CALL create_app_notification(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";

    try {
      let text = req.body?.audiobook_id?"Listen Now":"SUBSCRIBE";
      if(req.body?.gotoActivity==='dynamicScreen'){
        text = null;
      }
      let isGradient=req.body?.gotoActivity==='gotoSubscriptionPage'?0:1;
      let color1=req.body?.audiobook_id?null:"0xFFFF0505";
      let color2=req.body?.audiobook_id?null:"0xff6B0000";
      var res = await DB.query(insertAppNotificationSql,
        [
          encodeURIComponent(req.body.title), req.body.imageUrl,
          encodeURIComponent(req.body.description), text|| null, isGradient, color1 || null,color2|| null,
          0, "All", req.body.gotoPage || null, JSON.stringify(data.message.data), "PUSH_NOTIFICATION", 1
        ]);
      const insertedId = res[0][0]?.inserted_id;
      if (insertedId) {
        data.message.data["notificationId"] = insertedId.toString()
      }
    } catch (_) {
    }

    const accessToken = await this.getAccessToken();
    const headers = {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    };

    try {
      const url =
        "https://fcm.googleapis.com/v1/projects/kabbik-b93c7/messages:send";
      var config = {
        method: "POST",
        headers: headers,
        data: data,
        url,
      };
      const obj = await axios(config)
        .then(function (response) {
          return response.data;
        })
        .catch(function (error) {
          if (error.response) {
            return StatusCheck.checkStatus(error.response.data.errorCode);
          }
        });
      return obj;
    } catch (error) {
      console.error(error);
      return null;
    }
  };


  generateTimeAndDateRangesForDB({
    baseDateTime,           // 'YYYY-MM-DD HH:mm:ss' (Dhaka time)
    totalLoops = 20,
    timeStepMinutes = 2,
    firstRangeMonths = 2,
    nextRangeMonths = 2,
  }) {
    const results = [];

    // Base execution time (Dhaka)
    const baseTime = moment.tz(
      baseDateTime,
      'YYYY-MM-DD HH:mm:ss',
      'Asia/Dhaka'
    );
    
    // Start = now (Dhaka), End = now - firstRangeMonths
    let startDate = moment.tz('Asia/Dhaka');
    let endDate = startDate.clone().subtract(firstRangeMonths, 'months');

    for (let i = 0; i < totalLoops; i++) {
      // const runTimeUTC = baseTime
      //   .clone()
      //   .add(i * timeStepMinutes, 'minutes')
      //   .utc()
      //   .tz('Asia/Dhaka')
      //   .format('YYYY-MM-DD HH:mm:ss');
      const runTimeUTC = baseTime
      .clone()
      .add(i * timeStepMinutes, 'minutes')
      .utc()
      .format('YYYY-MM-DDTHH:mm:ss');

      results.push({
        runTimeUTC,
        // DB DATETIME format
        startDate: startDate.format('YYYY-MM-DD HH:mm:ss'),
        endDate: endDate.format('YYYY-MM-DD HH:mm:ss'),
      });

      // shift range backward
      startDate = endDate.clone();
      endDate = endDate.clone().subtract(nextRangeMonths, 'months');
      if(nextRangeMonths<3){
        nextRangeMonths++;
      }
    }

    return results;
  }



  scheduledAwsOnetimeNotification = async (req) => {
    let { redirectRoute, payload, dateTime } = req.body;
    let dateTimeData;
    if((payload?.startDate && payload.endDate) || !redirectRoute.includes('/send-notification-to-un-sub-user') ){
      const targetTime = moment.tz(dateTime , 'YYYY-MM-DD HH:mm:ss', 'Asia/Dhaka');
      const isoTimeUTC = targetTime.utc().format("YYYY-MM-DDTHH:mm:ss");
      dateTimeData=[{startDate:payload.startDate || '',endDate:payload?.endDate || '',runTimeUTC:isoTimeUTC  }]
    }else{
      dateTimeData = this.generateTimeAndDateRangesForDB({baseDateTime: dateTime ? dateTime :new Date()})
    }
    let successCount=0,failedCount=0;
        dateTimeData.forEach(async(item)=>{
        payload.startDate=item?.startDate;
        payload.endDate=item?.endDate;
        
        const REGION = process.env.AWS_REGION;
        const ACCOUNT_ID = process.env.AWS_ACCOUNT_ID;
        const LAMBDA_NAME = process.env.AWS_PUSH_NOTIFICATION_LAMBDA_NAME;

        const schedulerClient = new SchedulerClient({
          region: REGION,
          credentials: {
            accessKeyId: process.env.SCHEDULED_NOTIFICATION_AWS_ACCESS_KEY,
            secretAccessKey: process.env.SCHEDULED_NOTIFICATION_AWS_SECRET_ACCESS_KEY,
          }
        });

        // const targetTime = moment(dateTime, 'YYYY-MM-DD HH:mm:ss');
        // const targetTime = moment.tz(item?.runTimeUTC, 'YYYY-MM-DD HH:mm:ss', 'Asia/Dhaka');
        // const isoTimeUTC = targetTime.utc().format("YYYY-MM-DDTHH:mm:ss");
        const targetTime = moment.utc(
          item?.runTimeUTC,
          'YYYY-MM-DDTHH:mm:ss',
          true
        );

        if (!targetTime.isValid() || targetTime.isBefore(moment())) {
                    return { success: false, message: 'Cannot schedule notification in the past' };
        }

        if (!redirectRoute) {
          return { success: false, message: 'Missing required fields:  redirectRoute' };
        }

        try {
          // Insert into DB
          const insertSql = `INSERT INTO sheduled_notification(title, name, payload, scheduled_time) VALUES (?, ?, ?, ?)`;
          const scheduleName = `kabbik-job-${uuidv4()}`;
                    await schedulerClient.send(new CreateScheduleCommand({
            Name: scheduleName,
            ScheduleExpression: `at(${item?.runTimeUTC})`,
            //  GroupName: "kabbik-notification-group",
            // Always specify the timezone. Since `isoTimeUTC` is UTC, specify "UTC".
            // If you were using `targetTimeDhaka.format("YYYY-MM-DDTHH:mm:ss")` directly,
            // then you would set `ScheduleExpressionTimezone: "Asia/Dhaka"`.
            ScheduleExpressionTimezone: "UTC",
            State: "ENABLED",
            FlexibleTimeWindow: {
              Mode: FlexibleTimeWindowMode.OFF, // Ensures exact execution at the specified time
            },
            Target: {
              Arn: `arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${LAMBDA_NAME}`,
              RoleArn: "arn:aws:iam::182807400388:role/kabbik_push_notification", // The IAM role for EventBridge Scheduler to invoke the Lambda
              RetryPolicy: {
                MaximumRetryAttempts: 0,
                MaximumEventAgeInSeconds: 60 // ✅ explicitly set this too
              },
              Input: JSON.stringify({
                redirectRoute: redirectRoute,
                payload, // Pass the jobId to your Lambda if needed
              }),
            },
            ActionAfterCompletion: ActionAfterCompletion.DELETE, // Automatically deletes the schedule after it runs once
          }));
                    successCount++;
          try {
            await DB.query(insertSql, [payload.title, scheduleName, JSON.stringify(payload), item?.runTimeUTC]);
          } catch (e) { console.log(e,"logs1")}

          
          

        } catch (e) {
          failedCount++;
          console.log(e,"logs2")
          return { success: false, message: 'Failed to schedule notification' };
        }
    })


    return {
      success: true,
      message: `${successCount} schedule createdSuccessfully. ${failedCount?(failedCount+"schedule failed  to create."):''} ` ,
      // scheduleName
    };

    
  };



  cancelScheduledNotification = async (req) => {
    const schedulerClient = new SchedulerClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.SCHEDULED_NOTIFICATION_AWS_ACCESS_KEY,
        secretAccessKey: process.env.SCHEDULED_NOTIFICATION_AWS_SECRET_ACCESS_KEY,
      }

    });

    try {
      await schedulerClient.send(new DeleteScheduleCommand({
        Name: req.query.scheduleName,
      }));

      return { success: true, message: `successfully cancelled notification.` };
    } catch (error) {
      return { success: false, message: `Error: ${error.message}` };
    }
  };


  listAllSchedules = async () => {
    const REGION = process.env.AWS_REGION;
    const ACCOUNT_ID = process.env.AWS_ACCOUNT_ID;
    const LAMBDA_NAME = process.env.AWS_PUSH_NOTIFICATION_LAMBDA_NAME;

    const schedulerClient = new SchedulerClient({
      region: REGION,
      credentials: {
        accessKeyId: process.env.SCHEDULED_NOTIFICATION_AWS_ACCESS_KEY,
        secretAccessKey: process.env.SCHEDULED_NOTIFICATION_AWS_SECRET_ACCESS_KEY,
      }

    });

    // const arn = `arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${LAMBDA_NAME}`;
    const arn = `function:${LAMBDA_NAME}`;

    try {
      const response = await schedulerClient.send(new ListSchedulesCommand({
      }));
      
      const filteredSchedules = response.Schedules?.filter(
        (schedule) => schedule.Target?.Arn.includes( arn)
      ) || [];

      const scheduleNames = filteredSchedules.map((s) => s.Name);

      if (scheduleNames.length === 0) return [];

      const placeholders = scheduleNames.map(() => '?').join(',');
      const sqlFindSql = `SELECT name, title, scheduled_time FROM sheduled_notification WHERE name IN (${placeholders}) order by scheduled_time asc`;
      const rows = await DB.query(sqlFindSql, scheduleNames);

      const nameToData = {};
      rows.forEach(row => {
        nameToData[row.name] = {
          title: row.title,
          scheduled_time: row.scheduled_time
        };
      });

      // Inject title and schedule time into each schedule object
      filteredSchedules.forEach(schedule => {
        const data = nameToData[schedule.Name];
        if (data) {
          schedule.title = data.title;
          schedule.scheduleTime = data.scheduled_time;
        } else {
          schedule.title = '';
          schedule.scheduleTime = '';
        }
      });


      return [filteredSchedules, response.NextToken];

    } catch (error) {
      console.error("Error listing schedules:", error);
      return null;
    }
  };

  
  listAllSchedulesNew = async (req) => {
    const REGION = process.env.AWS_REGION;
    const ACCOUNT_ID = process.env.AWS_ACCOUNT_ID;
    const LAMBDA_NAME = process.env.AWS_PUSH_NOTIFICATION_LAMBDA_NAME;
    const nextToken = req.body.nextToken;

    const schedulerClient = new SchedulerClient({
      region: REGION,
      credentials: {
        accessKeyId: process.env.SCHEDULED_NOTIFICATION_AWS_ACCESS_KEY,
        secretAccessKey: process.env.SCHEDULED_NOTIFICATION_AWS_SECRET_ACCESS_KEY,
      }

    });

    // const arn = `arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${LAMBDA_NAME}`;
    const arn = `function:${LAMBDA_NAME}`;

    try {
      const response = await schedulerClient.send(new ListSchedulesCommand({
        NextToken: nextToken || null,
      }));
      
      const filteredSchedules = response.Schedules?.filter(
        (schedule) => schedule.Target?.Arn.includes( arn)
      ) || [];

      const scheduleNames = filteredSchedules.map((s) => s.Name);

      if (scheduleNames.length === 0) return [];

      const placeholders = scheduleNames.map(() => '?').join(',');
      const sqlFindSql = `SELECT name, title, scheduled_time FROM sheduled_notification WHERE name IN (${placeholders}) order by scheduled_time asc`;
      const rows = await DB.query(sqlFindSql, scheduleNames);

      const nameToData = {};
      rows.forEach(row => {
        nameToData[row.name] = {
          title: row.title,
          scheduled_time: row.scheduled_time
        };
      });

      // Inject title and schedule time into each schedule object
      filteredSchedules.forEach(schedule => {
        const data = nameToData[schedule.Name];
        if (data) {
          schedule.title = data.title;
          schedule.scheduleTime = data.scheduled_time;
        } else {
          schedule.title = '';
          schedule.scheduleTime = '';
        }
      });


      return [filteredSchedules, response.NextToken];

    } catch (error) {
      console.error("Error listing schedules:", error);
      return null;
    }
  };




}

module.exports = new PushNotificationModel();
