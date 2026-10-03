const express = require('express')
const constants = require('./src/utils/constants')
const FileUtils = require('./src/utils/file-utils')
const http = require("http")
const https = require("https")
const fs = require("fs")
const coreUtils = require('./src/utils/core-utils')
const cookieParser = require("cookie-parser");
const multer = require("multer");
const SftpClient = require("ssh2-sftp-client");
const path = require("path");
const upload = multer({ dest: "uploads/" });

//newadded

const stripeRouter = require("./src/routers/v4/stripe-router.js");


const ResponseUtils = require('./src/utils/res-utils');
require('dotenv').config()
var cors = require('cors')

const app = express()


const port = Number(process.env.PORT || constants.PORT)

// const options = {
//     key: fs.readFileSync('./keys/ssl/star_kabbik_com.key'),
//     cert: fs.readFileSync('./keys/ssl/star_kabbik_com.crt'),
//     requestCert: true,
//     //ca: fs.readFileSync('/etc/ssl/certs/ca.crt'),
//     rejectUnauthorized: false 
// };
const options = {
  key: fs.readFileSync('./keys/ssl/star_kabbik_com.key'),
  cert: fs.readFileSync('./keys/ssl/star_kabbik_com.crt'),
  requestCert: true,
  //ca: fs.readFileSync('/etc/ssl/certs/ca.crt'),
  rejectUnauthorized: false 
};
// v1
const authRouter = require('./src/routers/v1/auth-router')
const userRouter = require('./src/routers/v1/user-router')
const audiobookRouter = require('./src/routers/v1/audiobook-router')
const trackRouter = require('./src/routers/v1/track-router')
const coreRouter = require('./src/routers/v1/core-router')
const favRouter = require('./src/routers/v1/fav-router')
const publisherRouter = require('./src/routers/v1/publisher-router')
const channelRouter = require('./src/routers/v1/channel-router')
const categoryRouter = require('./src/routers/v1/category-router')
const {
  categoryBulkUploadHandlers,
} = require('./src/routers/v1/category-bulk-upload-route')
const episodeRouter = require('./src/routers/v1/episode-router')
const fileRouter = require('./src/routers/v1/file-router')
const packageRouter = require('./src/routers/v1/package-router')
const paymentRouter = require('./src/routers/v1/payment-router')
const kabbikRouter = require('./src/routers/v1/kabbik-analytics-router')
const blogRouter = require("./src/routers/v1/blog-router.js");
const postRouter = require('./src/routers/v1/post-router');
const postTypeRouter = require('./src/routers/v1/post-type-router');
const eventRouter = require('./src/routers/v1/event-router');
const podcastRouter = require('./src/routers/v1/podcast-router');
const editorsPickRouter = require('./src/routers/v1/editors-pick-router');
const listeningStatsRouter = require('./src/routers/v1/listening-stats-router');
const userContributionRouter = require('./src/routers/v1/user-contribution-router');
const leaderboardRouter = require('./src/routers/v1/leaderboard-router');
const popularCategoriesRouter = require('./src/routers/v1/popular-categories-router');
const kabbikChatRouter = require('./src/routers/v1/kabbik-chat-router');
const kabbikChatAdminRouter = require('./src/routers/v1/kabbik-chat-admin-router');
const { initKabbikChatSocket } = require('./src/sockets/kabbik-chat-socket');
const gamezopRouter = require("./src/routers/v4/gamezop-router.js");
//v2
const coreRouterV2 = require('./src/routers/v2/core-router')
const audiobookRouterV2 = require('./src/routers/v2/audiobook-router')
	
const authRouterV2 = require('./src/routers/v2/auth-router')	
const categoryRouterV2 = require('./src/routers/v2/category-router')	
const blogsRouter = require('./src/routers/v2/blogs-router');
const kabbikRouterV2 = require('./src/routers/v2/kabbik-router');
const kabbikAdminRouterV2 = require('./src/routers/v2/kabbik-admin-router');
//v3	
const coreRouterV3 = require('./src/routers/v3/core-router')
const audiobookRouterV3 = require('./src/routers/v3/audiobook-router')
const bkashV3 = require('./src/routers/v3/bkash-router')
const googlepayV3 = require('./src/routers/v3/googlepay-router')
const quizRouterV3 = require('./src/routers/v3/quiz-router')
const pushNotificationV3 = require('./src/routers/v3/push-notification')

//v4
const homeRouter = require('./src/routers/v4/home-router')
const userRouterV4 = require('./src/routers/v4/user-router')
const writerstoryV4 = require('./src/routers/v4/writerstory-router.js')
const upcomingV4 = require('./src/routers/v4/upcoming-router.js')
const nagadV4 = require('./src/routers/v4/nagad-router.js')
const upayV4 = require('./src/routers/v4/upay-router.js')
const academicV4 = require('./src/routers/v4/academic-router.js')
const dynamicV4 = require('./src/routers/v4/dynamic-router.js')
const agentV4 = require('./src/routers/v4/agent-router.js')
const herobanner = require('./src/routers/v4/hero-banner-router.js')
const bannersRouter = require('./src/routers/v4/banners-router.js')
const robiV4 = require('./src/routers/v4/robi-router.js')
const toffeeV4 = require('./src/routers/v4/toffee-router.js')
const myblV4 = require('./src/routers/v4/mybl-router.js')
const course = require('./src/routers/v4/course-router.js')
const session = require('./src/routers/v4/session-router.js')
const cronRouter = require('./src/routers/v4/cron-router.js')
const store = require("./src/routers/v4/store-router.js");
const rentRouter = require("./src/routers/v4/rent-router.js");
const amrpay = require("./src/routers/v4/amrpay-router.js");

const gpRouter = require("./src/routers/v4/gp-router.js");
const testRouter = require("./src/routers/v4/test-router.js");

const rewardRouter = require("./src/routers/v4/reward-router.js");

const cityPayRouter = require("./src/routers/v4/city-payment-router.js");

const referRouter = require("./src/routers/v4/refer-router.js");
const emailNotificationRouter = require("./src/routers/v4/EmailNotification-router.js");
const userPreferenceRouter = require("./src/routers/v4/user-preference-router.js");

const athorRouter = require("./src/routers/v1/Author-router.js");
const topAuthorsRouter = require('./src/routers/v4/top-authors-router');
const playListRouter=require("./src/routers/v1/playlist-router.js")

const affiliateRouter = require("./src/routers/v4/affiliate-router.js");
const subs_page_track_Router = require("./src/routers/v4/subs_page_track_router.js");
const continueBook_Router = require("./src/routers/v4/continueBookStatus-router.js");
const kabbikProductsRouter = require('./src/routers/kabbik-products-router');
const maintenanceRouter = require('./src/routers/maintenance-router');




const allowedOrigins=[
           "https://api.kabbik.com",
           "http://localhost:8080",
           "http://localhost:3000",
	   "http://localhost:3001",
	   "http://localhost:4000",
     "http://192.168.7.72:8090",
     "https://staging.kabbik.com",
           "http://localhost:8085",
           "http://localhost:8096",
           "https://kabbik.com",
	   "http://128.199.82.6:8087",
	   "https://city-acc-report.kabbik.com",
	   "https://www.kabbik.com",
           "https://mybl.kabbik.com",
           "https://old.kabbik.com",
           "https://admin.kabbik.com",
	   "http://128.199.86.104:3015",
	   "https://affiliate.kabbik.com",
	   "https://publisher.kabbik.com",
           "https://crm.kabbik.com",
           "http://crm.kabbik.com",
           "http://crm.kabbik.com/",
            "https://crm.kabbik.com/",
           "https://www.crm.kabbik.com",
           "https://www.crm.kabbik.com/",
           "https://pwa.kabbik.com",
	   "https://new.kabbik.com",
           "http://128.199.86.104:8087",
           "http://128.199.86.104:8085",
           "http://localhost:8090",
           "http://localhost:8097",
	   "http://128.199.86.104:3000",
           "http://128.199.86.104:3002",
           "http://128.199.86.104:3001",
	   "http://128.199.86.104:8099",
	   "http://128.199.86.104:8070",
	   "http://128.199.86.104:8096",
	   "http://128.199.86.104:3012",
           "http://127.0.0.1:5500",
	   "https://local-pwa.tgmg.app",
           "https://local-pwa.togumogu.com",
           "https://myblaudiobook.kabbik.com",
	   "http://myblaudiobook.kabbik.com",
           "https://bkash-staging.kabbik.com",
           "https://bkash.kabbik.com"
          ]

// app.use((req, res, next) => {
//     if (!req.path.startsWith(constants.API)) return next();
//     const requestOrigin = req.headers.origin || null;
//     const isAllowedOrigin = !!requestOrigin && allowedOrigins.includes(requestOrigin);
//     if(req.path.includes('v1/episodes/add-with-bgm')){
//       console.log("[ORIGIN_CHECK]", {
//           method: req.method,
//           path: req.path,
//           origin: requestOrigin,
//           isAllowedOrigin
//       });
//     }
//     next();
// });

// enabling cors for all requests by using cors middleware
const corsOptions = {
    origin: allowedOrigins,
    credentials: true,
    // methods:  ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    // allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'Access-Control-Allow-Origin','Access-Control-Allow-Methods','Access-Control-Allow-Headers','Access-Control-Allow-Credentials','X-Debug-Session-Id'],
    // exposedHeaders: ['Content-Type', 'Authorization'],
    // maxAge: 86400
}
app.use(cors(corsOptions))
// #region agent log
// app.use((req, res, next) => {
//     const p = req.path || ''
//     if (!p.includes('/episodes')) return next()
//     res.on('finish', () => {
//         fetch('http://127.0.0.1:7908/ingest/8d57e12b-1e8a-4388-831c-c58c1e36eddc',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'7208f6'},body:JSON.stringify({sessionId:'7208f6',runId:'pre-fix',location:'app.js:episodes-cors-debug',message:'response finished',data:{method:req.method,path:p,origin:req.headers.origin||null,statusCode:res.statusCode,acao:res.getHeader('Access-Control-Allow-Origin')||null,allowMethods:res.getHeader('Access-Control-Allow-Methods')||null},timestamp:Date.now(),hypothesisId:'H-cors-headers'})}).catch(()=>{})
//     })
//     next()
// })
// #endregion agent log
// app.options('*', cors(corsOptions))

// Enable pre-flight
// app.options("*", cors());
// parse requests of content-type: application/json
// parses incoming requests with JSON payloads

app.use(constants.API + constants.VERSION_4 + "/send-webhook-stripe", stripeRouter);

app.use(express.json({limit: '100mb'}))

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return ResponseUtils.respondError(
      res,
      400,
      'Invalid JSON body. Escape control characters inside strings (use \\n for newlines, \\t for tabs).'
    );
  }
  next(err);
});

// parse requests of application/x-www-form-urlencoded
app.use(express.urlencoded({
    extended: true,
    limit: '100mb'
}))

app.use(cookieParser());
app.use('/api', kabbikProductsRouter);
app.use('/api', maintenanceRouter);
app.use(constants.API + constants.VERSION_1 + '/auth', authRouter)
app.use(constants.API + constants.VERSION_1 + '/users/me', listeningStatsRouter)
app.use(constants.API + constants.VERSION_1 + '/users/me', userContributionRouter)
app.use(constants.API + constants.VERSION_1 + '/users', userRouter)
app.use(constants.API + constants.VERSION_1 + '/audiobooks', audiobookRouter)
app.use(constants.API + constants.VERSION_1 + '/tracks', trackRouter)
app.use(constants.API + constants.VERSION_1 + '/core', coreRouter)
app.use(constants.API + constants.VERSION_1 + '/favs', favRouter)
app.use(constants.API + constants.VERSION_1 + '/publishers', publisherRouter)
app.use(constants.API + constants.VERSION_1 + '/channels', channelRouter)
app.use(constants.API + constants.VERSION_1 + '/categories', popularCategoriesRouter)
app.use(constants.API + constants.VERSION_1 + '/categories', categoryRouter)
// Aliases for category bulk-upload (swagger / gateway paths without full /api/v1 prefix)
app.post('/categories/admin/bulk-upload', ...categoryBulkUploadHandlers)
app.post(
  constants.API + '/admin/categories/bulk-upload',
  ...categoryBulkUploadHandlers
)
app.post(
  constants.VERSION_1 + '/categories/admin/bulk-upload',
  ...categoryBulkUploadHandlers
)
app.use(constants.API + constants.VERSION_1 + '/episodes', episodeRouter)
app.use(constants.API + constants.VERSION_1 + '/files', fileRouter)
app.use(constants.API + constants.VERSION_1 + '/packages', packageRouter)
app.use(constants.API + constants.VERSION_1 + '/payment', paymentRouter)
app.use(constants.API + constants.VERSION_1 + '/kabbikanalytics', kabbikRouter)
app.use(constants.API + constants.VERSION_1 + "/playlist", playListRouter);
app.use(constants.API + constants.VERSION_1 + '/posts', postRouter);
app.use(constants.API + constants.VERSION_1 + '/post-types', postTypeRouter);
app.use(constants.API + constants.VERSION_1 + '/events', eventRouter);
app.use(constants.API + constants.VERSION_1 + '/podcasts', podcastRouter);
app.use(constants.API + constants.VERSION_1 + '/editors-picks', editorsPickRouter);
app.use(constants.API + constants.VERSION_1 + '/leaderboard', leaderboardRouter);
app.use(constants.API + constants.VERSION_1 + '/kabbik', kabbikChatRouter);
app.use(constants.API + constants.VERSION_1 + '/kabbik/admin', kabbikChatAdminRouter);

app.use(constants.API + constants.VERSION_2 + '/core', coreRouterV2)
app.use(constants.API + constants.VERSION_2 + '/auth', authRouterV2)
app.use(constants.API + constants.VERSION_2 + '/audiobooks', audiobookRouterV2)
app.use(constants.API + constants.VERSION_2 + '/categories', categoryRouterV2)	
app.use(constants.API + constants.VERSION_2 + '/blogs', blogsRouter);
app.use(constants.API + constants.VERSION_2 + '/kabbik', kabbikRouterV2);
app.use(constants.API + constants.VERSION_2 + '/kabbik/admin', kabbikAdminRouterV2);
app.use(constants.API + constants.VERSION_3 + '/core', coreRouterV3)
app.use(constants.API + constants.VERSION_3 + '/audiobooks', audiobookRouterV3)
app.use(constants.API + constants.VERSION_3 + '/bkash', bkashV3)
app.use(constants.API + constants.VERSION_3 + '/googlepay', googlepayV3)
app.use(constants.API + constants.VERSION_3 + '/quiz', quizRouterV3)
app.use(constants.API + constants.VERSION_3 + '/pushnotification', pushNotificationV3)
app.use(constants.API + constants.VERSION_4 + '/home', homeRouter)
app.use(constants.API + constants.VERSION_4 + '/user', userRouterV4)
app.use(constants.API + constants.VERSION_4 + '/story', writerstoryV4)
app.use(constants.API + constants.VERSION_4 + '/upcoming', upcomingV4)
app.use(constants.API + constants.VERSION_4 + '/nagad', nagadV4)
app.use(constants.API + constants.VERSION_4 + '/upay', upayV4)
app.use(constants.API + constants.VERSION_4 + '/academic', academicV4)
app.use(constants.API + constants.VERSION_4 + '/dynamic', dynamicV4)
app.use(constants.API + constants.VERSION_4 + '/agent', agentV4)
app.use(constants.API + constants.VERSION_4 + '/herobanner',herobanner)
app.use(constants.API + constants.VERSION_4 + '/promotionBanners', bannersRouter)
app.use(constants.API + constants.VERSION_4 + '/robi',robiV4)
app.use(constants.API + constants.VERSION_4 + '/toffee',toffeeV4)
app.use(constants.API + constants.VERSION_4 + '/mybl',myblV4)
app.use(constants.API + constants.VERSION_4 + '/session',session)
app.use(constants.API + constants.VERSION_4 + '/cron', cronRouter)
app.use(constants.API + constants.VERSION_4 + "/store", store);
app.use(constants.API + constants.VERSION_4 + "/rent", rentRouter);
app.use(constants.API + constants.VERSION_4 + "/entertainment", gamezopRouter);

 
app.use(constants.API + constants.VERSION_4 + "/amrpay", amrpay);

app.use(constants.API + constants.VERSION_4 + '/course', course);

app.use(constants.API + constants.VERSION_1 + "/blog", blogRouter);
app.use(constants.API + constants.VERSION_4 + "/stripe", stripeRouter);

app.use(constants.API + constants.VERSION_4 + "/gp", gpRouter);
//kk
app.use(constants.API + constants.VERSION_4 + "/test", testRouter);

app.use(constants.API + constants.VERSION_4 + "/reward", rewardRouter);

app.use(constants.API + constants.VERSION_4 + "/city-pay", cityPayRouter);
app.use(constants.API + constants.VERSION_4 + "/refer", referRouter);
app.use(constants.API + constants.VERSION_4 + "/email-notification", emailNotificationRouter);
app.use(constants.API + constants.VERSION_4 + "/user-preference", userPreferenceRouter);
app.use(constants.API + constants.VERSION_4 + '/authors', topAuthorsRouter);
app.use(constants.API + constants.VERSION_4 + "/authors", athorRouter);
app.use(constants.API + constants.VERSION_4 + "/affiliate", affiliateRouter);
app.use(constants.API + constants.VERSION_4 + "/subs-page-track", subs_page_track_Router);
app.use(constants.API + constants.VERSION_4 + "/continue-listen-track", continueBook_Router);
app.use(constants.API + constants.VERSION_4 + "/health",(req,res)=>{
  res.json({ success: true, message: "Health check successful" });
});


app.use(constants.API + constants.VERSION_4+"/bl-file-upload",upload.single("file"),async(req,res)=>{
  const sftpConfig = {
    host: "172.22.111.106",
    port: 22,
    username: "audiobook",
    password: "yh#nfo9n5aQoL#b&1(cE_dA"
  }
  const localPath = req.file?.path; // file stored locally
  const remotePath = `/data01/audiobook/${req.file.originalname}`; // final destination

  const sftp = new SftpClient();
  try {
    await sftp.connect(sftpConfig);

    // upload to remote server
    await sftp.put(localPath, remotePath);

    // cleanup local temp file
    fs.unlinkSync(localPath);
    res.json({ success: true, message: "File uploaded successfully", remotePath });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  } finally {
    sftp.end();
  }
})


require('./src/swagger/swagger-setup').mountSwagger(app);

app.use((req, res) => {
  return ResponseUtils.respondError(
    res,
    200,
    `Route not found: ${req.method} ${req.originalUrl}`
  );
});


app.use(express.static('static'))

FileUtils.createDirectoryIfNotExists('./files-temp')

// const multer = require("multer");
// const upload = multer({ dest: "uploads/" });
// app.post("/upload_files", upload.array("file"), uploadFiles);

// function uploadFiles(req, res) {
//     console.log(req.body);
//     console.log(req.files);
//     res.json({ message: "Successfully uploaded files" });
// }



// app.listen(port, () => {
//     console.log(`kabbik app listening at http://localhost:${port}`)
// })


let server;
if (process.env.ENV === 'dev') {
  server = http.createServer(app);
} else {
  server = https.createServer(options, app);
}

initKabbikChatSocket(server, corsOptions).catch((err) => {
  console.error('Failed to initialize Kabbik chat socket:', err);
});

server.listen(port, () => {});
