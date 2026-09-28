const constants = require('../utils/constants');
const ResponseUtils = require('../utils/res-utils');
const KabbikChatModel = require('../data/models/kabbik-chat-model');
const KabbikChatValidator = require('../validators/kabbik-chat-validator');
const {
  emitNewMessage,
  emitConversationUpdated,
} = require('../sockets/kabbik-chat-socket');

class KabbikChatAdminController {
  parsePagination = (req) => {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const pageSize = Math.min(
      Math.max(parseInt(req.query.pageSize, 10) || 20, 1),
      100
    );
    return { page, pageSize };
  };

  parseStatusFilter = (statusParam) => {
    if (!statusParam) return undefined;
    if (statusParam === 'open' || statusParam === '1') {
      return KabbikChatModel.STATUS_OPEN;
    }
    if (statusParam === 'closed' || statusParam === '2') {
      return KabbikChatModel.STATUS_CLOSED;
    }
    return undefined;
  };

  listConversations = async (req, res) => {
    try {
      await Promise.all(
        KabbikChatValidator.validateAdminListQuery().map((v) => v.run(req))
      );
      const validationError = KabbikChatValidator.getErrors(req);
      if (validationError) {
        return ResponseUtils.respondError(res, constants.HTTP_400, validationError);
      }

      const { page, pageSize } = this.parsePagination(req);
      const status = this.parseStatusFilter(req.query.status);

      const result = await KabbikChatModel.findAllConversations(page, pageSize, {
        status,
      });

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

  getMessages = async (req, res) => {
    try {
      await Promise.all(
        KabbikChatValidator.validateMessagesQuery().map((v) => v.run(req))
      );
      const validationError = KabbikChatValidator.getErrors(req);
      if (validationError) {
        return ResponseUtils.respondError(res, constants.HTTP_400, validationError);
      }

      const conversationId = parseInt(req.params.id, 10);
      if (!conversationId) {
        return ResponseUtils.respondError(res, constants.HTTP_400, 'Invalid conversation id');
      }

      const conversation = await KabbikChatModel.findById(conversationId);
      if (!conversation) {
        return ResponseUtils.respondError(res, constants.HTTP_404, 'Conversation not found');
      }

      if (req.query.after_message_id !== undefined) {
        const afterMessageId = parseInt(req.query.after_message_id, 10);
        const limit = Math.min(
          Math.max(parseInt(req.query.limit, 10) || 50, 1),
          100
        );

        const result = await KabbikChatModel.findMessagesAfterId(
          conversationId,
          afterMessageId,
          limit
        );

        return ResponseUtils.respond(res, constants.HTTP_200, result);
      }

      const { page, pageSize } = this.parsePagination(req);
      const order = req.query.order === 'desc' ? 'desc' : 'asc';

      const result = await KabbikChatModel.findMessagesByConversationId(
        conversationId,
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

  markRead = async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id, 10);
      if (!conversationId) {
        return ResponseUtils.respondError(res, constants.HTTP_400, 'Invalid conversation id');
      }

      const conversation = await KabbikChatModel.findById(conversationId);
      if (!conversation) {
        return ResponseUtils.respondError(res, constants.HTTP_404, 'Conversation not found');
      }

      const result = await KabbikChatModel.markMessagesReadByAdmin(conversationId);

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

  reply = async (req, res) => {
    try {
      await Promise.all(
        KabbikChatValidator.validateReply().map((v) => v.run(req))
      );
      const validationError = KabbikChatValidator.getErrors(req);
      if (validationError) {
        return ResponseUtils.respondError(res, constants.HTTP_400, validationError);
      }

      const conversationId = parseInt(req.params.id, 10);
      if (!conversationId) {
        return ResponseUtils.respondError(res, constants.HTTP_400, 'Invalid conversation id');
      }

      const conversation = await KabbikChatModel.findById(conversationId);
      if (!conversation) {
        return ResponseUtils.respondError(res, constants.HTTP_404, 'Conversation not found');
      }

      const { message } = req.body;
      const adminId = req.currentUser.id;

      const createdMessage = await KabbikChatModel.createMessage(
        conversationId,
        KabbikChatModel.SENDER_TYPE_ADMIN || 2,
        adminId,
        message
      );

      if (!createdMessage) {
        return ResponseUtils.respondError(
          res,
          constants.HTTP_500,
          constants.INTERNAL_SERVER_ERROR
        );
      }

      emitNewMessage(conversationId, createdMessage);
      emitConversationUpdated(conversationId, {
        status: conversation.status,
        last_message_at: createdMessage.created_at,
      });

      return ResponseUtils.respond(res, constants.HTTP_201, { data: createdMessage });
    } catch (err) {
      console.error(err);
      return ResponseUtils.respondError(
        res,
        constants.HTTP_500,
        constants.INTERNAL_SERVER_ERROR
      );
    }
  };

  closeConversation = async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id, 10);
      if (!conversationId) {
        return ResponseUtils.respondError(res, constants.HTTP_400, 'Invalid conversation id');
      }

      const existing = await KabbikChatModel.findById(conversationId);
      if (!existing) {
        return ResponseUtils.respondError(res, constants.HTTP_404, 'Conversation not found');
      }

      const conversation = await KabbikChatModel.closeConversation(conversationId);
      emitConversationUpdated(conversationId, {
        status: KabbikChatModel.STATUS_CLOSED,
        last_message_at: conversation.last_message_at,
      });

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

  reopenConversation = async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id, 10);
      if (!conversationId) {
        return ResponseUtils.respondError(res, constants.HTTP_400, 'Invalid conversation id');
      }

      const existing = await KabbikChatModel.findById(conversationId);
      if (!existing) {
        return ResponseUtils.respondError(res, constants.HTTP_404, 'Conversation not found');
      }

      const conversation = await KabbikChatModel.reopenConversation(conversationId);
      emitConversationUpdated(conversationId, {
        status: KabbikChatModel.STATUS_OPEN,
        last_message_at: conversation.last_message_at,
      });

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
}

module.exports = new KabbikChatAdminController();
