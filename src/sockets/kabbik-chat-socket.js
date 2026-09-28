const { Server } = require('socket.io');
const { createAdapter } = require('@socket.io/redis-adapter');
const { createClient } = require('redis');
const CoreModel = require('../data/models/core-model');
const UserModel = require('../data/models/user-model');
const KabbikChatModel = require('../data/models/kabbik-chat-model');
const JWTHelper = require('../utils/jwt-helper');
const constants = require('../utils/constants');
const { getRedisClientOptions } = require('../utils/redis-options');

const ADMIN_ROLE = 2;
const MAX_MESSAGE_LENGTH = 5000;
const SOCKET_IO_PATH = `${constants.API}/socket.io`;
const LEGACY_SOCKET_IO_PATH = '/socket.io';

let io = null;

const conversationRoom = (conversationId) => `conversation:${conversationId}`;

const rewriteLegacySocketPath = (req) => {
  const url = req.url || '';
  const path = url.split('?')[0];
  if (path === LEGACY_SOCKET_IO_PATH || path.startsWith(`${LEGACY_SOCKET_IO_PATH}/`)) {
    const queryIndex = url.indexOf('?');
    const query = queryIndex >= 0 ? url.slice(queryIndex) : '';
    const suffix = path.slice(LEGACY_SOCKET_IO_PATH.length);
    req.url = `${SOCKET_IO_PATH}${suffix}${query}`;
  }
};

const installLegacySocketPathAlias = (server) => {
  server.prependListener('request', (req) => {
    rewriteLegacySocketPath(req);
  });
  server.prependListener('upgrade', (req) => {
    rewriteLegacySocketPath(req);
  });
};

const createRedisClient = () => createClient(getRedisClientOptions());

const extractHandshakeToken = (socket) => {
  const authToken = socket.handshake.auth?.token;
  if (authToken) {
    return authToken;
  }

  const queryToken = socket.handshake.query?.token;
  if (Array.isArray(queryToken)) {
    return queryToken[0] || null;
  }
  if (typeof queryToken === 'string' && queryToken) {
    return queryToken;
  }

  const authHeader =
    socket.handshake.headers?.authorization ||
    socket.handshake.headers?.Authorization;
  if (typeof authHeader === 'string' && authHeader) {
    const bearer = 'Bearer ';
    if (authHeader.startsWith(bearer)) {
      return authHeader.slice(bearer.length).trim();
    }
    return authHeader.trim();
  }

  return null;
};

const authenticateSocket = async (socket, next) => {
  try {
    const token = extractHandshakeToken(socket);
    if (!token) {
      console.error('socket auth failed: missing token', {
        hasAuth: Boolean(socket.handshake.auth?.token),
        hasQueryToken: Boolean(socket.handshake.query?.token),
        hasAuthHeader: Boolean(
          socket.handshake.headers?.authorization ||
            socket.handshake.headers?.Authorization
        ),
      });
      return next(new Error('UNAUTHORIZED'));
    }

    let jwtPayload;
    try {
      jwtPayload = JWTHelper.verifyToken(token);
    } catch (err) {
      console.error('socket auth failed: invalid token', {
        error: err?.message,
      });
      return next(new Error('UNAUTHORIZED'));
    }

    let entity;

    if (jwtPayload.role === ADMIN_ROLE) {
      entity = await UserModel.findById(jwtPayload.user_id);
    } else {
      entity = await CoreModel.findByIdRole(
        jwtPayload.user_id,
        jwtPayload.role
      );
    }

    if (!entity) {
      console.error('socket auth failed: user not found', {
        user_id: jwtPayload.user_id,
        role: jwtPayload.role,
      });
      return next(new Error('UNAUTHORIZED'));
    }

    socket.data.jwt = jwtPayload;
    socket.data.currentUser = entity;
    socket.data.isAdmin = jwtPayload.role === ADMIN_ROLE;
    return next();
  } catch (err) {
    console.error('socket auth failed: unexpected error', {
      error: err?.message,
    });
    return next(new Error('UNAUTHORIZED'));
  }
};

const emitSocketError = (socket, code, message) => {
  socket.emit('error', { code, message });
};

const handleUserConnection = async (socket) => {
  const userId = socket.data.currentUser.id;
  const conversation = await KabbikChatModel.findByUserId(userId);

  if (conversation) {
    await socket.join(conversationRoom(conversation.id));
    socket.data.activeConversationId = conversation.id;
  }

  socket.emit('connected', {
    role: socket.data.jwt.role,
    conversation_id: conversation ? conversation.id : null,
  });
};

const handleAdminConnection = (socket) => {
  socket.emit('connected', {
    role: socket.data.jwt.role,
    conversation_id: null,
  });
};

const validateMessageText = (message) => {
  if (typeof message !== 'string') return false;
  const trimmed = message.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_MESSAGE_LENGTH;
};

const logPersistError = (err, context) => {
  const isFk =
    err?.code === 'ER_NO_REFERENCED_ROW' ||
    err?.code === 'ER_NO_REFERENCED_ROW_2';
  console.error(
    isFk
      ? 'send_message persist error (FK constraint on sender_id or conversation_id):'
      : 'send_message persist error:',
    {
      ...context,
      error: err?.message,
      code: err?.code,
      errno: err?.errno,
      sqlMessage: err?.sqlMessage,
      sql: err?.sql,
    }
  );
};

const handleSendMessage = async (socket, payload = {}) => {
  try {
    const isAdmin = socket.data.isAdmin;
    let conversationId;
    let senderType;
    const senderId = socket.data.currentUser.id;

    if (isAdmin) {
      conversationId = parseInt(payload.conversation_id, 10);
      if (!conversationId) {
        socket.emit('send_message_error', {
          code: 'VALIDATION_ERROR',
          message: 'conversation_id is required for admin',
        });
        return;
      }
      senderType = KabbikChatModel.SENDER_TYPE_ADMIN;
    } else if (payload.conversation_id !== undefined) {
      emitSocketError(socket, 'FORBIDDEN', 'Users cannot specify conversation_id');
      return;
    }

    if (!validateMessageText(payload.message)) {
      socket.emit('send_message_error', {
        code: 'VALIDATION_ERROR',
        message: 'Message must be between 1 and 5000 characters',
      });
      return;
    }

    const messageText = payload.message.trim();
    let createdMessage;
    let conversation;

    if (isAdmin) {
      conversation = await KabbikChatModel.findById(conversationId);
      if (!conversation) {
        socket.emit('send_message_error', {
          code: 'NOT_FOUND',
          message: 'Conversation not found',
        });
        return;
      }

      try {
        createdMessage = await KabbikChatModel.createMessage(
          conversationId,
          senderType,
          senderId,
          messageText
        );
      } catch (err) {
        logPersistError(err, { conversationId, senderType, senderId });
        socket.emit('send_message_error', {
          code: 'PERSIST_FAILED',
          message: 'Failed to save message',
        });
        return;
      }
    } else {
      let result;
      try {
        result = await KabbikChatModel.sendUserMessage(senderId, messageText);
      } catch (err) {
        logPersistError(err, { senderType: KabbikChatModel.SENDER_TYPE_USER, senderId });
        socket.emit('send_message_error', {
          code: 'PERSIST_FAILED',
          message: 'Failed to save message',
        });
        return;
      }

      if (result.error) {
        socket.emit('send_message_error', {
          code: 'NOT_FOUND',
          message: 'Conversation not found. Create one via REST first.',
        });
        return;
      }

      createdMessage = result.data;
      conversationId = createdMessage.conversation_id;
      conversation = await KabbikChatModel.findById(conversationId);

      if (!socket.data.activeConversationId) {
        await socket.join(conversationRoom(conversationId));
        socket.data.activeConversationId = conversationId;
      }
    }

    if (!createdMessage) {
      console.error('send_message persist error: createMessage returned null', {
        conversationId,
        senderType,
        senderId,
      });
      socket.emit('send_message_error', {
        code: 'PERSIST_FAILED',
        message: 'Failed to save message',
      });
      return;
    }

    try {
      socket.emit('send_message_ack', {
        message_id: createdMessage.id,
        conversation_id: conversationId,
      });

      io.to(conversationRoom(conversationId)).emit('new_message', {
        message: createdMessage,
      });

      io.to(conversationRoom(conversationId)).emit('conversation_updated', {
        conversation_id: conversationId,
        status: conversation?.status,
        last_message_at: createdMessage.created_at,
      });
    } catch (err) {
      console.error('send_message emit error:', {
        conversationId,
        messageId: createdMessage.id,
        error: err?.message,
      });
    }
  } catch (err) {
    console.error('send_message unexpected error:', {
      error: err?.message,
      stack: err?.stack,
    });
    socket.emit('send_message_error', {
      code: 'PERSIST_FAILED',
      message: 'Failed to save message',
    });
  }
};

const handleMessageRead = async (socket, payload = {}) => {
  const isAdmin = socket.data.isAdmin;

  try {
    if (isAdmin) {
      const conversationId = parseInt(payload.conversation_id, 10);
      if (!conversationId) {
        emitSocketError(socket, 'VALIDATION_ERROR', 'conversation_id is required');
        return;
      }

      const conversation = await KabbikChatModel.findById(conversationId);
      if (!conversation) {
        emitSocketError(socket, 'NOT_FOUND', 'Conversation not found');
        return;
      }

      const result = await KabbikChatModel.markMessagesReadByAdmin(conversationId);
      io.to(conversationRoom(conversationId)).emit('message_read', {
        conversation_id: conversationId,
        reader_type: KabbikChatModel.SENDER_TYPE_ADMIN,
      });
      return result;
    }

    const result = await KabbikChatModel.markMessagesReadByUser(
      socket.data.currentUser.id
    );

    if (result.conversation_id) {
      io.to(conversationRoom(result.conversation_id)).emit('message_read', {
        conversation_id: result.conversation_id,
        reader_type: KabbikChatModel.SENDER_TYPE_USER,
      });
    }
  } catch (err) {
    console.error('message_read error:', err);
    emitSocketError(socket, 'INTERNAL_ERROR', 'Failed to mark messages as read');
  }
};

const handleTyping = (socket, payload = {}) => {
  const isAdmin = socket.data.isAdmin;
  let conversationId;

  if (isAdmin) {
    conversationId = parseInt(payload.conversation_id, 10);
    if (!conversationId) {
      return;
    }
  } else {
    conversationId = socket.data.activeConversationId;
    if (!conversationId) {
      return;
    }
  }

  const isTyping = Boolean(payload.is_typing);

  io.to(conversationRoom(conversationId)).emit('typing', {
    conversation_id: conversationId,
    sender_type: isAdmin
      ? KabbikChatModel.SENDER_TYPE_ADMIN
      : KabbikChatModel.SENDER_TYPE_USER,
    sender_id: socket.data.currentUser.id,
    is_typing: isTyping,
  });
};

const handleJoinConversation = async (socket, payload = {}) => {
  if (!socket.data.isAdmin) {
    emitSocketError(socket, 'FORBIDDEN', 'Only admins can join conversations');
    return;
  }

  const conversationId = parseInt(payload.conversation_id, 10);
  if (!conversationId) {
    emitSocketError(socket, 'VALIDATION_ERROR', 'conversation_id is required');
    return;
  }

  const conversation = await KabbikChatModel.findById(conversationId);
  if (!conversation) {
    emitSocketError(socket, 'NOT_FOUND', 'Conversation not found');
    return;
  }

  await socket.join(conversationRoom(conversationId));
  socket.data.adminViewingConversationId = conversationId;
};

const handleLeaveConversation = async (socket, payload = {}) => {
  if (!socket.data.isAdmin) {
    emitSocketError(socket, 'FORBIDDEN', 'Only admins can leave conversations');
    return;
  }

  const conversationId = parseInt(payload.conversation_id, 10);
  if (!conversationId) {
    emitSocketError(socket, 'VALIDATION_ERROR', 'conversation_id is required');
    return;
  }

  await socket.leave(conversationRoom(conversationId));
  if (socket.data.adminViewingConversationId === conversationId) {
    socket.data.adminViewingConversationId = null;
  }
};

const registerSocketHandlers = (socketIo) => {
  socketIo.use(authenticateSocket);

  socketIo.on('connection', async (socket) => {
    try {
      if (socket.data.isAdmin) {
        handleAdminConnection(socket);
      } else {
        await handleUserConnection(socket);
      }
    } catch (err) {
      console.error('connection setup error:', err);
      socket.disconnect(true);
      return;
    }

    socket.on('join_conversation', (payload) => handleJoinConversation(socket, payload));
    socket.on('leave_conversation', (payload) => handleLeaveConversation(socket, payload));
    socket.on('send_message', (payload) => handleSendMessage(socket, payload));
    socket.on('message_read', (payload) => handleMessageRead(socket, payload));
    socket.on('typing', (payload) => handleTyping(socket, payload));
  });
};

const initKabbikChatSocket = async (server, corsOptions = {}) => {
  io = new Server(server, {
    cors: {
      origin: corsOptions.origin || true,
      credentials: corsOptions.credentials !== false,
    },
    path: SOCKET_IO_PATH,
  });
  installLegacySocketPathAlias(server);

  try {
    const pubClient = createRedisClient();
    const subClient = pubClient.duplicate();

    pubClient.on('error', (err) => console.error('Socket Redis pub error:', err));
    subClient.on('error', (err) => console.error('Socket Redis sub error:', err));

    await pubClient.connect();
    await subClient.connect();
    io.adapter(createAdapter(pubClient, subClient));
    console.log('Socket.io Redis adapter connected');
  } catch (err) {
    console.error('Socket.io Redis adapter failed — running in-memory only:', err.message);
  }

  registerSocketHandlers(io);
  return io;
};

const emitNewMessage = (conversationId, message) => {
  if (!io) return;
  io.to(conversationRoom(conversationId)).emit('new_message', { message });
};

const emitMessageRead = (conversationId, readerType) => {
  if (!io) return;
  io.to(conversationRoom(conversationId)).emit('message_read', {
    conversation_id: conversationId,
    reader_type: readerType,
  });
};

const emitConversationUpdated = (conversationId, { status, last_message_at }) => {
  if (!io) return;
  io.to(conversationRoom(conversationId)).emit('conversation_updated', {
    conversation_id: conversationId,
    status,
    last_message_at,
  });
};

const getIO = () => io;

module.exports = {
  initKabbikChatSocket,
  emitNewMessage,
  emitMessageRead,
  emitConversationUpdated,
  getIO,
  conversationRoom,
};
