const DB = require('../db');
const { withTransaction } = require('../db-transaction-utils');
const LoggerError = require('../../utils/logger-error');

const SENDER_TYPE_USER = 1;
const SENDER_TYPE_ADMIN = 2;
const STATUS_OPEN = 1;
const STATUS_CLOSED = 2;

class KabbikChatModel {
  conversationsTable = 'kabbik_conversations';
  messagesTable = 'kabbik_messages';

  mapConversationRow = (row) => {
    if (!row) return null;
    return {
      id: row.id,
      user_id: row.user_id,
      subject: row.subject,
      status: row.status,
      last_message_at: row.last_message_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
      full_name: row.full_name || undefined,
      image_url: row.image_url || undefined,
      unread_from_user_count:
        row.unread_from_user_count !== undefined
          ? Number(row.unread_from_user_count)
          : undefined,
    };
  };

  mapMessageRow = (row) => {
    if (!row) return null;
    return {
      id: row.id,
      conversation_id: row.conversation_id,
      sender_type: row.sender_type,
      sender_id: row.sender_id,
      message: row.message,
      is_read: row.is_read,
      created_at: row.created_at,
    };
  };

  findByUserId = async (userId) => {
    try {
      const sql = `SELECT * FROM ${this.conversationsTable} WHERE user_id = ? LIMIT 1`;
      const rows = await DB.query(sql, [userId]);
      return rows && rows.length > 0 ? this.mapConversationRow(rows[0]) : null;
    } catch (err) {
      LoggerError.log(err);
      throw err;
    }
  };

  findById = async (conversationId) => {
    try {
      const sql = `SELECT * FROM ${this.conversationsTable} WHERE id = ? LIMIT 1`;
      const rows = await DB.query(sql, [conversationId]);
      return rows && rows.length > 0 ? this.mapConversationRow(rows[0]) : null;
    } catch (err) {
      LoggerError.log(err);
      throw err;
    }
  };

  getOrCreateConversation = async (userId, subject = null) => {
    try {
      const existing = await this.findByUserId(userId);
      if (existing) {
        return existing;
      }

      const insertSql = `
        INSERT INTO ${this.conversationsTable} (user_id, subject, status)
        VALUES (?, ?, ?)
      `;
      try {
        const result = await DB.query(insertSql, [userId, subject, STATUS_OPEN]);
        return await this.findById(result.insertId);
      } catch (insertErr) {
        if (insertErr.code === 'ER_DUP_ENTRY') {
          return await this.findByUserId(userId);
        }
        throw insertErr;
      }
    } catch (err) {
      LoggerError.log(err);
      throw err;
    }
  };

  findAllConversations = async (page, pageSize, filters = {}) => {
    try {
      const conditions = ['1=1'];
      const params = [];

      if (filters.status !== undefined && filters.status !== null && filters.status !== '') {
        conditions.push('c.status = ?');
        params.push(filters.status);
      }

      const whereClause = conditions.join(' AND ');
      const offset = (page - 1) * pageSize;

      const countSql = `
        SELECT COUNT(*) AS total
        FROM ${this.conversationsTable} c
        WHERE ${whereClause}
      `;

      const listSql = `
        SELECT c.*,
          u.full_name,
          u.image_url,
          COUNT(CASE WHEN m.sender_type = ${SENDER_TYPE_USER} AND m.is_read = 0 THEN 1 END) AS unread_from_user_count
        FROM ${this.conversationsTable} c
        JOIN users u ON u.id = c.user_id
        LEFT JOIN ${this.messagesTable} m ON m.conversation_id = c.id
        WHERE ${whereClause}
        GROUP BY c.id, u.full_name, u.image_url
        ORDER BY c.last_message_at DESC, c.created_at DESC
        LIMIT ? OFFSET ?
      `;

      const countResult = await DB.query(countSql, params);
      const listResult = await DB.query(listSql, [...params, pageSize, offset]);

      return {
        data: (listResult || []).map((row) => this.mapConversationRow(row)),
        total: countResult[0].total,
        page,
        pageSize,
      };
    } catch (err) {
      LoggerError.log(err);
      throw err;
    }
  };

  findMessagesByConversationId = async (
    conversationId,
    page,
    pageSize,
    order = 'asc'
  ) => {
    try {
      const orderDir = order === 'desc' ? 'DESC' : 'ASC';
      const offset = (page - 1) * pageSize;

      const countSql = `
        SELECT COUNT(*) AS total
        FROM ${this.messagesTable}
        WHERE conversation_id = ?
      `;

      const listSql = `
        SELECT *
        FROM ${this.messagesTable}
        WHERE conversation_id = ?
        ORDER BY created_at ${orderDir}
        LIMIT ? OFFSET ?
      `;

      const countResult = await DB.query(countSql, [conversationId]);
      const listResult = await DB.query(listSql, [
        conversationId,
        pageSize,
        offset,
      ]);

      return {
        data: (listResult || []).map((row) => this.mapMessageRow(row)),
        total: countResult[0].total,
        page,
        pageSize,
      };
    } catch (err) {
      LoggerError.log(err);
      throw err;
    }
  };

  findMessagesByUserId = async (userId, page, pageSize, order = 'asc') => {
    try {
      const conversation = await this.findByUserId(userId);
      if (!conversation) {
        return { data: [], total: 0, page, pageSize };
      }
      return await this.findMessagesByConversationId(
        conversation.id,
        page,
        pageSize,
        order
      );
    } catch (err) {
      LoggerError.log(err);
      throw err;
    }
  };

  findMessagesAfterId = async (conversationId, afterMessageId, limit = 50) => {
    try {
      const listSql = `
        SELECT *
        FROM ${this.messagesTable}
        WHERE conversation_id = ? AND id > ?
        ORDER BY id ASC
        LIMIT ?
      `;
      const listResult = await DB.query(listSql, [
        conversationId,
        afterMessageId,
        limit,
      ]);

      const messages = (listResult || []).map((row) => this.mapMessageRow(row));
      const lastId =
        messages.length > 0
          ? messages[messages.length - 1].id
          : afterMessageId;

      return {
        data: messages,
        after_message_id: lastId,
      };
    } catch (err) {
      LoggerError.log(err);
      throw err;
    }
  };

  findMessagesByUserIdAfterId = async (userId, afterMessageId, limit = 50) => {
    try {
      const conversation = await this.findByUserId(userId);
      if (!conversation) {
        return { data: [], after_message_id: afterMessageId };
      }
      return await this.findMessagesAfterId(
        conversation.id,
        afterMessageId,
        limit
      );
    } catch (err) {
      LoggerError.log(err);
      throw err;
    }
  };

  persistMessageOnConnection = async (
    query,
    conversationId,
    senderType,
    senderId,
    message
  ) => {
    const normalizedConversationId = parseInt(conversationId, 10);
    const normalizedSenderId = parseInt(senderId, 10);
    const normalizedSenderType = parseInt(senderType, 10);

    if (!Number.isInteger(normalizedConversationId) || normalizedConversationId <= 0) {
      throw new Error('kabbik_chat invalid conversation id');
    }
    if (!Number.isInteger(normalizedSenderId) || normalizedSenderId <= 0) {
      throw new Error('kabbik_chat invalid sender id');
    }
    if (!Number.isInteger(normalizedSenderType)) {
      throw new Error('kabbik_chat invalid sender type');
    }

    const insertSql = `
      INSERT INTO ${this.messagesTable}
        (conversation_id, sender_type, sender_id, \`message\`, is_read)
      VALUES (?, ?, ?, ?, 0)
    `;
    const insertResult = await query(insertSql, [
      normalizedConversationId,
      normalizedSenderType,
      normalizedSenderId,
      message,
    ]);

    if (insertResult.insertId == null) {
      throw new Error('kabbik_chat insert missing insertId');
    }

    const updateSql = `
      UPDATE ${this.conversationsTable}
      SET last_message_at = NOW()
      WHERE id = ?
    `;
    await query(updateSql, [normalizedConversationId]);

    const selectSql = `SELECT * FROM ${this.messagesTable} WHERE id = ? LIMIT 1`;
    const rows = await query(selectSql, [insertResult.insertId]);
    if (!rows?.length) {
      throw new Error(
        `kabbik_chat message not found after insert id=${insertResult.insertId}`
      );
    }

    return this.mapMessageRow(rows[0]);
  };

  persistMessage = async (conversationId, senderType, senderId, message, query) => {
    if (query) {
      return this.persistMessageOnConnection(
        query,
        conversationId,
        senderType,
        senderId,
        message
      );
    }

    return withTransaction((txQuery) =>
      this.persistMessageOnConnection(
        txQuery,
        conversationId,
        senderType,
        senderId,
        message
      )
    );
  };

  sendUserMessage = async (userId, message) => {
    const normalizedUserId = parseInt(userId, 10);
    if (!Number.isInteger(normalizedUserId) || normalizedUserId <= 0) {
      return { error: 'Invalid user id' };
    }

    return withTransaction(async (query) => {
      const selectSql = `
        SELECT * FROM ${this.conversationsTable}
        WHERE user_id = ?
        LIMIT 1
        FOR UPDATE
      `;
      const rows = await query(selectSql, [normalizedUserId]);
      if (!rows || rows.length === 0) {
        return { error: 'Conversation not found. Create a conversation first.' };
      }

      const conversation = rows[0];

      if (conversation.status === STATUS_CLOSED) {
        const reopenSql = `
          UPDATE ${this.conversationsTable}
          SET status = ?
          WHERE id = ?
        `;
        await query(reopenSql, [STATUS_OPEN, conversation.id]);
      }

      const createdMessage = await this.persistMessageOnConnection(
        query,
        conversation.id,
        SENDER_TYPE_USER,
        normalizedUserId,
        message
      );

      return { data: createdMessage };
    });
  };

  createMessage = async (conversationId, senderType, senderId, message) =>
    this.persistMessage(conversationId, senderType, senderId, message);

  markMessagesReadByUser = async (userId) => {
    try {
      const conversation = await this.findByUserId(userId);
      if (!conversation) {
        return { updated: 0 };
      }

      const sql = `
        UPDATE ${this.messagesTable}
        SET is_read = 1
        WHERE conversation_id = ?
          AND sender_type = ${SENDER_TYPE_ADMIN}
          AND is_read = 0
      `;
      const result = await DB.query(sql, [conversation.id]);
      return { updated: result.affectedRows || 0, conversation_id: conversation.id };
    } catch (err) {
      LoggerError.log(err);
      throw err;
    }
  };

  markMessagesReadByAdmin = async (conversationId) => {
    try {
      const sql = `
        UPDATE ${this.messagesTable}
        SET is_read = 1
        WHERE conversation_id = ?
          AND sender_type = ${SENDER_TYPE_USER}
          AND is_read = 0
      `;
      const result = await DB.query(sql, [conversationId]);
      return { updated: result.affectedRows || 0, conversation_id: conversationId };
    } catch (err) {
      LoggerError.log(err);
      throw err;
    }
  };

  updateStatus = async (conversationId, status) => {
    try {
      const sql = `
        UPDATE ${this.conversationsTable}
        SET status = ?
        WHERE id = ?
      `;
      await DB.query(sql, [status, conversationId]);
      return await this.findById(conversationId);
    } catch (err) {
      LoggerError.log(err);
      throw err;
    }
  };

  closeConversation = async (conversationId) => {
    return this.updateStatus(conversationId, STATUS_CLOSED);
  };

  reopenConversation = async (conversationId) => {
    return this.updateStatus(conversationId, STATUS_OPEN);
  };
}

KabbikChatModel.SENDER_TYPE_USER = SENDER_TYPE_USER;
KabbikChatModel.SENDER_TYPE_ADMIN = SENDER_TYPE_ADMIN;
KabbikChatModel.STATUS_OPEN = STATUS_OPEN;
KabbikChatModel.STATUS_CLOSED = STATUS_CLOSED;

module.exports = new KabbikChatModel();
