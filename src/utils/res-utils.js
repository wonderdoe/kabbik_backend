// module.exports = class ResponseUtils {
    
//  static respondError(res, status, msg) {
//         var statusCode = status || 500;
//         res.setHeader('Content-Type', 'application/json');
//         return res.status(statusCode).json({ 
//             success : "false",
//             message: msg
//          })
//     }

//     static respond(res, status, payloads) {
//         return res.status(status).type("application/json").json(payloads)
//     }
// }

module.exports = class ResponseUtils {

  static respondError(res, status, msg, code) {
    // 🔒 Prevent double response crash
    if (res.headersSent) return;

    const payload = {
      success: false,
      message: msg,
    };
    if (code) {
      payload.code = code;
    }

    return res
      .status(status || 500)
      .json(payload);
  }

  static respond(res, status, payloads) {
    // 🔒 Prevent double response crash
    if (res.headersSent) return;

    return res
      .status(status)
      .json(payloads);
  }
};
