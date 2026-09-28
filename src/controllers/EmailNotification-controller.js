
const emailNotificationModel = require("../data/models/emailNotification-model");

require("dotenv").config();

class EmailNotificationController {

  create=async(req, res)=> {
    try {
      const { email,userId } = req.body;
      if (!email) {
        return res.status(400).json({ message: "Email are required" });
      }
        const result = await emailNotificationModel.create(email,userId);

      return res.status(200).json({ 
        message: "Email Notification Created Successfully", 
        result
      });
    } catch (error) {
      console.error("EmailNotificationController: create", error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  getAllEmail=async(req, res)=> {
    try {
        const result = await emailNotificationModel.findAll();

      return res.status(200).json({ 
        message: "Ok", 
        result
      });
    } catch (error) {
      console.error("EmailNotificationController: create", error);
      return res.status(500).json({ message: "Server error" });
    }
  }

  
}

module.exports = new EmailNotificationController();
