const DB = require('../db');
const { withTransaction } = require('../db-transaction-utils');
const LoggerError = require('../../utils/logger-error');
const { formatTimestamps, formatInstantUtc } = require('../../utils/date-utils');

class EventModel {
  tableName = 'events';

  mapEventRow = (row, options = {}) => {
    if (!row) return null;

    const event = formatTimestamps({
      id: row.id,
      user_id: row.user_id,
      title: row.title,
      description: row.description,
      event_type: row.event_type,
      location: row.location,
      event_date_time: formatInstantUtc(row.event_date_time),
      maxSeat: row.maxSeat,
      joined_count: row.joined_count,
      tag: row.tag,
      tagColor: row.tagColor,
      banner_image: row.banner_image,
      status: row.status,
      created_at: row.created_at,
      updated_at: row.updated_at,
    });

    if (options.includeJoinedByMe) {
      event.joined_by_me = row.joined_by_me === 1 || row.joined_by_me === true;
    }

    if (options.includeDetail) {
      event.seatsLeft = Math.max((row.maxSeat || 0) - (row.joined_count || 0), 0);
      event.isJoinedByMe = row.is_joined_by_me === 1 || row.is_joined_by_me === true
        || row.joined_by_me === 1 || row.joined_by_me === true;
    }

    return event;
  };

  buildListFilters = (filters) => {
    const conditions = ['e.deleted = 0'];
    const params = [];

    const isPast = filters.past === true || filters.past === 'true' || filters.past === '1';

    if (isPast) {
      conditions.push('e.event_date_time < NOW()');
    } else {
      conditions.push('e.event_date_time >= NOW()');
    }

    if (filters.tag) {
      conditions.push('e.tag = ?');
      params.push(filters.tag);
    }

    if (filters.event_type) {
      conditions.push('e.event_type = ?');
      params.push(filters.event_type);
    }

    if (filters.status !== undefined && filters.status !== null && filters.status !== '') {
      conditions.push('e.status = ?');
      params.push(filters.status);
    }

    const orderDir = isPast ? 'DESC' : 'ASC';

    return { conditions, params, orderDir };
  };

  findAll = async (page, pageSize, filters = {}, userId = null) => {
    try {
      const { conditions, params, orderDir } = this.buildListFilters(filters);
      const whereClause = conditions.join(' AND ');
      const offset = (page - 1) * pageSize;

      let joinClause = '';
      let selectExtra = '0 AS joined_by_me';
      const listParams = [...params];

      if (userId) {
        joinClause = `
          LEFT JOIN event_joins ej ON ej.event_id = e.id AND ej.user_id = ? AND ej.status = 1
        `;
        selectExtra = 'CASE WHEN ej.id IS NOT NULL THEN 1 ELSE 0 END AS joined_by_me';
        listParams.unshift(userId);
      }

      const countSql = `SELECT COUNT(*) AS total FROM ${this.tableName} e WHERE ${whereClause}`;
      const listSql = `
        SELECT e.*, ${selectExtra}
        FROM ${this.tableName} e
        ${joinClause}
        WHERE ${whereClause}
        ORDER BY e.event_date_time ${orderDir}
        LIMIT ? OFFSET ?
      `;

      const [countResult, listResult] = await Promise.all([
        DB.query(countSql, params),
        DB.query(listSql, [...listParams, pageSize, offset]),
      ]);

      return {
        data: (listResult || []).map((row) => this.mapEventRow(row, { includeJoinedByMe: true })),
        total: countResult[0].total,
        page,
        pageSize,
      };
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  findById = async (eventId, userId = null) => {
    try {
      const params = [eventId];
      let joinClause = '';
      let selectExtra = '0 AS is_joined_by_me';

      if (userId) {
        joinClause = `
          LEFT JOIN event_joins ej ON ej.event_id = e.id AND ej.user_id = ? AND ej.status = 1
        `;
        selectExtra = 'CASE WHEN ej.id IS NOT NULL THEN 1 ELSE 0 END AS is_joined_by_me';
        params.unshift(userId);
      }

      const sql = `
        SELECT e.*, ${selectExtra}
        FROM ${this.tableName} e
        ${joinClause}
        WHERE e.id = ? AND e.deleted = 0
        LIMIT 1
      `;

      const result = await DB.query(sql, params);
      if (!result || result.length === 0) return null;
      return this.mapEventRow(result[0], { includeDetail: true });
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  create = async (userId, data) => {
    try {
      const sql = `
        INSERT INTO ${this.tableName}
          (user_id, title, description, event_type, location, event_date_time, maxSeat, tag, tagColor, banner_image)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;
      const result = await DB.query(sql, [
        userId,
        data.title,
        data.description || null,
        data.event_type || null,
        data.location || null,
        data.event_date_time,
        data.maxSeat,
        data.tag || null,
        data.tagColor || null,
        data.banner_image || null,
      ]);

      return { id: result.insertId };
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  update = async (eventId, data) => {
    try {
      const existing = await DB.query(
        `SELECT id, joined_count FROM ${this.tableName} WHERE id = ? AND deleted = 0 LIMIT 1`,
        [eventId]
      );
      if (!existing || existing.length === 0) {
        return { error: 'Event not found' };
      }

      if (data.maxSeat !== undefined && data.maxSeat < existing[0].joined_count) {
        return { error: 'maxSeat cannot be less than current joined_count' };
      }

      const fields = [];
      const values = [];

      const allowed = [
        'title', 'description', 'event_type', 'location', 'event_date_time',
        'maxSeat', 'tag', 'tagColor', 'banner_image', 'status',
      ];

      for (const key of allowed) {
        if (data[key] !== undefined) {
          fields.push(`${key} = ?`);
          values.push(data[key]);
        }
      }

      if (fields.length === 0) {
        return { error: 'No fields to update' };
      }

      values.push(eventId);
      await DB.query(
        `UPDATE ${this.tableName} SET ${fields.join(', ')} WHERE id = ? AND deleted = 0`,
        values
      );

      return { id: eventId };
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  softDelete = async (eventId) => {
    try {
      const result = await DB.query(
        `UPDATE ${this.tableName} SET deleted = 1, status = 2 WHERE id = ? AND deleted = 0`,
        [eventId]
      );
      if (!result || result.affectedRows === 0) {
        return { error: 'Event not found' };
      }
      return { id: eventId };
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  joinEvent = async (eventId, userId) => {
    try {
      return await withTransaction(async (query) => {
        const eventRows = await query(
          `SELECT id, maxSeat, joined_count, status, deleted
           FROM ${this.tableName} WHERE id = ? AND deleted = 0 FOR UPDATE`,
          [eventId]
        );

        if (!eventRows || eventRows.length === 0) {
          return { error: 'Event not found', statusCode: 404 };
        }

        const event = eventRows[0];

        if (event.status !== 1) {
          return { error: 'Event is not available for joining', statusCode: 400 };
        }

        const joinRows = await query(
          `SELECT id, status FROM event_joins
           WHERE event_id = ? AND user_id = ? FOR UPDATE`,
          [eventId, userId]
        );

        const existing = joinRows && joinRows.length > 0 ? joinRows[0] : null;

        if (existing && existing.status === 1) {
          return { idempotent: true, eventId };
        }

        if (event.joined_count >= event.maxSeat) {
          return { error: 'Event is full', statusCode: 409 };
        }

        if (existing && existing.status === 2) {
          await query(
            `UPDATE event_joins SET status = 1, joined_at = NOW() WHERE id = ?`,
            [existing.id]
          );
        } else {
          await query(
            `INSERT INTO event_joins (event_id, user_id, status) VALUES (?, ?, 1)`,
            [eventId, userId]
          );
        }

        await query(
          `UPDATE ${this.tableName} SET joined_count = joined_count + 1 WHERE id = ?`,
          [eventId]
        );

        return { eventId, joined: true };
      });
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  leaveEvent = async (eventId, userId) => {
    try {
      return await withTransaction(async (query) => {
        const joinRows = await query(
          `SELECT id FROM event_joins
           WHERE event_id = ? AND user_id = ? AND status = 1 FOR UPDATE`,
          [eventId, userId]
        );

        if (!joinRows || joinRows.length === 0) {
          return { error: 'Not joined', statusCode: 404 };
        }

        await query(
          `UPDATE event_joins SET status = 2 WHERE id = ?`,
          [joinRows[0].id]
        );

        await query(
          `UPDATE ${this.tableName} SET joined_count = GREATEST(joined_count - 1, 0) WHERE id = ?`,
          [eventId]
        );

        return { eventId, left: true };
      });
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  findParticipants = async (eventId, page, pageSize, status = 1) => {
    try {
      const offset = (page - 1) * pageSize;

      const countSql = `
        SELECT COUNT(*) AS total
        FROM event_joins ej
        WHERE ej.event_id = ? AND ej.status = ?
      `;
      const listSql = `
        SELECT
          ej.id,
          ej.event_id,
          ej.user_id,
          ej.status,
          ej.joined_at,
          u.full_name,
          u.user_email,
          u.image_url
        FROM event_joins ej
        INNER JOIN users u ON u.id = ej.user_id
        WHERE ej.event_id = ? AND ej.status = ?
        ORDER BY ej.joined_at DESC
        LIMIT ? OFFSET ?
      `;

      const [countResult, listResult] = await Promise.all([
        DB.query(countSql, [eventId, status]),
        DB.query(listSql, [eventId, status, pageSize, offset]),
      ]);

      return {
        data: listResult || [],
        total: countResult[0].total,
        page,
        pageSize,
      };
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  findJoinedByUser = async (userId, page, pageSize) => {
    try {
      const offset = (page - 1) * pageSize;

      const countSql = `
        SELECT COUNT(*) AS total
        FROM event_joins ej
        INNER JOIN ${this.tableName} e ON e.id = ej.event_id
        WHERE ej.user_id = ? AND ej.status = 1 AND e.deleted = 0
      `;
      const listSql = `
        SELECT e.*
        FROM event_joins ej
        INNER JOIN ${this.tableName} e ON e.id = ej.event_id
        WHERE ej.user_id = ? AND ej.status = 1 AND e.deleted = 0
        ORDER BY e.event_date_time ASC
        LIMIT ? OFFSET ?
      `;

      const [countResult, listResult] = await Promise.all([
        DB.query(countSql, [userId]),
        DB.query(listSql, [userId, pageSize, offset]),
      ]);

      return {
        data: (listResult || []).map((row) => this.mapEventRow(row, { includeJoinedByMe: false })),
        total: countResult[0].total,
        page,
        pageSize,
      };
    } catch (e) {
      LoggerError.log(e);
      throw e;
    }
  };

  eventExists = async (eventId) => {
    try {
      const result = await DB.query(
        `SELECT id FROM ${this.tableName} WHERE id = ? AND deleted = 0 LIMIT 1`,
        [eventId]
      );
      return result && result.length > 0;
    } catch (e) {
      LoggerError.log(e);
      return false;
    }
  };
}

module.exports = new EventModel();
