const constants = require('../utils/constants');
const ResponseUtils = require('../utils/res-utils');
const KabbikChatModel = require('../data/models/kabbik-chat-model');
const KabbikChatValidator = require('../validators/kabbik-chat-validator');

class KabbikChatController {
  parsePagination = (req) => {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.min(
      Math.max(parseInt(req.query.pageSize, 10) || 20, 1),
      100
    );
    return { page, pageSize };
  };

  getOrCreateConversation = async (req, res) => {
    try {
      await Promise.all(
        KabbikChatValidator.validateCreateConversation().map((v) => v.run(req))
      );
      const validationError = KabbikChatValidator.getErrors(req);
      if (validationError) {
        return ResponseUtils.respondError(res, constants.HTTP_400, validationError);
      }

      const userId = req.currentUser.id;
      const subject = req.body.subject || null;
      const conversation = await KabbikChatModel.getOrCreateConversation(
        userId,
        subject
      );

      return ResponseUtils.respond(res, constants.HTTP_200, { data: conversation });
    } catch (err) {
      console.error(err);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };

  getMessages = async (req, res) => {
    try {
      await Promise.all(
        KabbikChatValidator.validateMessagesQuery().map((v) => v.run(req))
      );
      const validationError = KabbikChatValidator.getErrors(req);
      if (validationError) {
        return ResponseUtils.respondError(res, constants.HTTP_400, validationError);
      }

      const userId = req.currentUser.id;

      if (req.query.after_message_id !== undefined) {
        const afterMessageId = parseInt(req.query.after_message_id, 10);
        const limit = Math.min(
          Math.max(parseInt(req.query.limit, 10) || 50, 1),
          100
        );

        const result = await KabbikChatModel.findMessagesByUserIdAfterId(
          userId,
          afterMessageId,
          limit
        );

        return ResponseUtils.respond(res, constants.HTTP_200, result);
      }

      const { page, pageSize } = this.parsePagination(req);
      const order = req.query.order === 'desc' ? 'desc' : 'asc';

      const result = await KabbikChatModel.findMessagesByUserId(
        userId,
        page,
        pageSize,
        order
      );

      return ResponseUtils.respond(res, constants.HTTP_200, result);
    } catch (err) {
      console.error(err);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };

  sendMessage = async (req, res) => {
    try {
      await Promise.all(
        KabbikChatValidator.validateSendMessage().map((v) => v.run(req))
      );
      const validationError = KabbikChatValidator.getErrors(req);
      if (validationError) {
        return ResponseUtils.respondError(res, constants.HTTP_400, validationError);
      }

      const userId = req.currentUser.id;
      const { message } = req.body;

      const result = await KabbikChatModel.sendUserMessage(userId, message);
      if (result.error) {
        return ResponseUtils.respondError(res, constants.HTTP_400, result.error);
      }

      return ResponseUtils.respond(res, constants.HTTP_201, { data: result.data });
    } catch (err) {
      console.error(err);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };

  markRead = async (req, res) => {
    try {
      const userId = req.currentUser.id;
      const result = await KabbikChatModel.markMessagesReadByUser(userId);

      return ResponseUtils.respond(res, constants.HTTP_200, { data: result });
    } catch (err) {
      console.error(err);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };
}

module.exports = new KabbikChatController();
