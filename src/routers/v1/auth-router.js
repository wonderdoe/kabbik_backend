const express = require("express");
const router = express.Router();
const authController = require("../../controllers/auth-controller");
const limiter = require("express-rate-limit");
const authorize = require("../../middlewares/auth-middleware");
const devOnly = require("../../middlewares/dev-only-middleware");


const limitConfig = limiter.rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minutes
  limit: 150, // Limit each IP to 100 requests per `window` (here, per 15 minutes)
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  handler: (req, res, next, options) => {
    authController.blockIp(req);
    res.status(429).json({
      success: false,
      message: "Too many requests. IP temporarily blocked.",
    });
  },
});

router.post("/login", authController.login);
router.post("/sign-up-with-password", authController.signUpWithPassword);    
router.post("/reset-password", authController.resetPassword);   
router.post("/token-data", authController.getTokenWiseData);
router.post("/login-password", authController.login_password);
router.post("/post-device",authorize, authController.postDevice);
router.post("/logout",authorize, authController.logout);
router.get("/device-list",authorize,authController.getDeviceList);
router.post("/set-password", authController.setPassword);
router.post("/login-google", authController.loginGoogle);
router.post("/login-fb", authController.loginFb);
router.post("/otp", authController.createOtp);
router.post("/otpnew2",limitConfig, authController.createOtpNew2);
router.post("/otpnew", limitConfig,authController.createOtpNew);
router.get("/get-otp-secretkey", authController.getOtpSecretKey);
router.post("/otp_blocker", authController.otp_blocker);
router.post("/otp/verify2", authController.verifyOtp2);
router.post("/otp/verify", authController.verifyOtp);
router.post("/otp/resend", authController.resendOtp);
router.post("/login-agent", authController.loginAgent);
router.post("/login-book-publisher", authController.loginBookPublisher);
router.post(
  "/login-book-publisher-admin",
  authController.loginBookPublisherForAdmin
);
router.post("/signup-agent", authController.signupAgent);
router.post("/signup-book-publisher", authController.signupBookPublisher);
router.post("/login-admin", authController.loginAdmin);
router.post(
  "/dev/bootstrap-admin",
  devOnly,
  authController.bootstrapSwaggerAdmin
);
router.post("/sms-test", authController.sendOtpTest);

router.post("/mybl", authController.myblLogin);
router.post("/togumogu", authController.togumoguLogin);
router.post("/bKash", authController.bkashLogin);
router.post("/toffee/login", authController.toffeeLogin);
router.post("/toffee/login2", authController.toffeeLogin2);

router.get("/jwt-verify", authController.jwtVerify);
router.post("/save-bkash-token", authController.saveBkashToken);
router.get("/bkash-token-validity", authController.bkashTokenAvailability);
router.delete("/delete-bkash-token", authController.deleteBkashToken);
router.post("/apple-redirect", express.urlencoded({ extended: true }), authController.appleRedirect);


module.exports = router;
