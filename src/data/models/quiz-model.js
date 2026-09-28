// const mysql = require('mysql2/promise');
// require('dotenv').config();
const DB = require("../db");


// const DB = require("../db");


class QuizModel {

    // ---------------------------------------------------------------------
    // Timezone helpers — match_for_quiz timestamps are stored as UTC.
    // Frontend may send wall-clock datetimes plus an IANA timezone string.
    // ---------------------------------------------------------------------

    toUtcDateTime = (value, timezone) => {
        if (value === null || value === undefined || value === '') {
            return null;
        }

        let date;

        if (value instanceof Date) {
            date = value;
        }
        else if (typeof value === 'string') {
            const trimmed = value.trim();
            const hasTimezone = /Z$|[+-]\d{2}:?\d{2}$/.test(trimmed);

            if (hasTimezone) {
                date = new Date(trimmed);
            }
            else {
                if (!timezone) {
                    throw new Error(`Naive datetime '${value}' requires a timezone (e.g. 'Asia/Dhaka').`);
                }
                date = this.parseInTimezone(trimmed, timezone);
            }
        }
        else {
            throw new Error(`Unsupported datetime value: ${typeof value}`);
        }

        if (isNaN(date.getTime())) {
            throw new Error(`Invalid datetime: '${value}'`);
        }

        const pad = (n) => String(n).padStart(2, '0');
        return (
            `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ` +
            `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}:${pad(date.getUTCSeconds())}`
        );
    }

    parseInTimezone = (naiveDateTime, timezone) => {
        try {
            new Intl.DateTimeFormat('en-US', { timeZone: timezone });
        } catch (e) {
            throw new Error(`Invalid IANA timezone: '${timezone}'`);
        }

        const match = naiveDateTime.match(/^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})(?::(\d{2}))?$/);
        if (!match) {
            throw new Error(`Unrecognized datetime format: '${naiveDateTime}'`);
        }
        const [, y, mo, d, h, mi, s] = match;
        const year = +y, month = +mo, day = +d, hour = +h, minute = +mi, second = +(s || 0);

        const utcGuess = Date.UTC(year, month - 1, day, hour, minute, second);

        const dtf = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            year: 'numeric', month: '2-digit', day: '2-digit',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            hour12: false
        });

        const parts = dtf.formatToParts(new Date(utcGuess)).reduce((acc, p) => {
            acc[p.type] = p.value;
            return acc;
        }, {});

        const asSeenInTz = Date.UTC(
            +parts.year,
            +parts.month - 1,
            +parts.day,
            parts.hour === '24' ? 0 : +parts.hour,
            +parts.minute,
            +parts.second
        );

        const offsetMs = asSeenInTz - utcGuess;
        return new Date(utcGuess - offsetMs);
    }

    // Returns the calendar date (YYYY-MM-DD) of a UTC timestamp as seen
    // in the given IANA timezone. Used to match quiz_access.access_date.
    getDateInDhaka = (utcDate) => {
        if (!utcDate) return null;
    
        const d = utcDate instanceof Date ? utcDate : new Date(utcDate);
        if (isNaN(d.getTime())) return null;
    
        const dhakaDate = new Date(d.getTime() + 6 * 60 * 60 * 1000);
    
        const pad = (n) => String(n).padStart(2, '0');
        return `${dhakaDate.getUTCFullYear()}-${pad(dhakaDate.getUTCMonth() + 1)}-${pad(dhakaDate.getUTCDate())}`;
    };

    // Accepts 1/2/3/4 or 'A'/'B'/'C'/'D' and returns tinyint 1-4
    normalizeAnswer = (value) => {
        if (value === undefined || value === null) return null;
        if (typeof value === 'number') return value;
        const str = String(value).toUpperCase().trim();
        const map = { A: 1, B: 2, C: 3, D: 4 };
        if (map[str] !== undefined) return map[str];
        const num = parseInt(str, 10);
        return isNaN(num) ? null : num;
    }

    // Safe positive int (for LIMIT clauses — inlined, not bound).
    safeLimit = (value, fallback = 10) => {
        const n = parseInt(value, 10);
        if (isNaN(n) || n <= 0) return fallback;
        return Math.min(n, 1000);
    }

    // ---------------------------------------------------------------------
    // match_for_quiz
    // ---------------------------------------------------------------------
    getTodayAndTomorrowMatches(matches) {
        const now = new Date();
      
        const today = now.toDateString();
        const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();
      
        return {
          today:    matches.filter(m => new Date(m.match_starts).toDateString() === today),
          tomorrow: matches.filter(m => new Date(m.match_starts).toDateString() === tomorrow),
        };
      }
    

    getMatches = async (userId) => {
                const sql = `
            SELECT id, country1, country2, flag1, flag2, group_info,
                   quiz_starts_at, quiz_duration, DATE_FORMAT(DATE_ADD(match_starts, INTERVAL 6 HOUR), '%Y-%m-%d %H:%i:%s') AS match_starts,
    DATE_FORMAT(DATE_ADD(match_ends, INTERVAL 6 HOUR), '%Y-%m-%d %H:%i:%s') AS match_ends,
                   isActive, created_at, updated_at,banner,matchNo
            FROM match_for_quiz
            WHERE isActive = 1
              AND match_ends >= UTC_TIMESTAMP()
              AND match_starts < UTC_TIMESTAMP() + INTERVAL 2 DAY
            ORDER BY match_starts ASC
        `;
        
        try {
            let rows = await DB.query(sql);
                        let {today,tomorrow} =  this.getTodayAndTomorrowMatches(rows);
            rows=[...today||[],...tomorrow||[]]
            if(userId){
                let sql2 = `SELECT match_id FROM quiz_result WHERE user_id = ?`
                const played_match = await DB.query(sql2,[userId]);
                                const playedIds = new Set(played_match.map(r => r.match_id));

                rows =  rows?.map(match => ({
                    ...match,
                    played: playedIds.has(match.id),
                }));
            }
            return rows || [];
        } catch (e) {
            console.log(e);
            return [];
        }
    }



    getPrevMatches = async () => {
        const sql = `
            SELECT id, country1, country2, flag1, flag2, group_info,
                   quiz_starts_at, quiz_duration, DATE_FORMAT(DATE_ADD(match_starts, INTERVAL 6 HOUR), '%Y-%m-%d %H:%i:%s') AS match_starts,
    DATE_FORMAT(DATE_ADD(match_ends, INTERVAL 6 HOUR), '%Y-%m-%d %H:%i:%s') AS match_ends,
                   isActive, created_at, updated_at,banner,matchNo
            FROM match_for_quiz
            WHERE isActive = 1
              AND match_ends < UTC_TIMESTAMP()
            ORDER BY match_starts ASC
        `;
        try {
            const rows = await DB.query(sql);
            return rows || [];
        } catch (e) {
            console.log(e);
            return [];
        }
    }

    getMatchById = async (id) => {
        const sql = `
            SELECT id, country1, country2, flag1, flag2, group_info,matchNo,
                   quiz_starts_at, quiz_duration, DATE_FORMAT(DATE_ADD(match_starts, INTERVAL 6 HOUR), '%Y-%m-%d %H:%i:%s') AS match_starts,
    DATE_FORMAT(DATE_ADD(match_ends, INTERVAL 6 HOUR), '%Y-%m-%d %H:%i:%s') AS match_ends,
                   isActive, created_at, updated_at
            FROM match_for_quiz
            WHERE id = ?
            LIMIT 1
        `;
        try {
            const rows = await DB.query(sql, [id]);
            if (rows && rows.length) {
                return rows[0];
            }
            return undefined;
        } catch (e) {
            console.log(e);
            return undefined;
        }
    }

    createMatch = async (payload) => {
        const sql = `
            INSERT INTO match_for_quiz
            (country1, country2, flag1, flag2, group_info,
             quiz_starts_at, quiz_duration, match_starts, match_ends, isActive,banner,matchNo)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?,?)
        `;
        try {
            const tz = payload.timezone; // e.g. 'Asia/Dhaka'
            const result = await DB.query(sql, [
                payload.country1,
                payload.country2,
                payload.flag1 || null,
                payload.flag2 || null,
                payload.group_info || null,
                this.toUtcDateTime(payload.quiz_starts_at, tz),
                payload.quiz_duration || null,
                this.toUtcDateTime(payload.match_starts, tz),
                this.toUtcDateTime(payload.match_ends, tz),
                payload.isActive !== undefined ? payload.isActive : 1,
                payload.banner ||null,
                payload.matchNo || null
            ]);
            if (result) {
                return result.insertId;
            }
            return undefined;
        } catch (e) {
            console.log(e);
            return undefined;
        }
    }

    updateMatch = async (id, payload) => {
        try {
            const tz = payload.timezone;
            const fields = [];
            const params = [];

            const allowed = ['country1', 'country2', 'flag1', 'flag2', 'group_info', 'quiz_duration', 'isActive'];
            for (let i = 0; i < allowed.length; i++) {
                if (payload[allowed[i]] !== undefined) {
                    fields.push(`${allowed[i]} = ?`);
                    params.push(payload[allowed[i]]);
                }
            }

            const tsFields = ['quiz_starts_at', 'match_starts', 'match_ends'];
            for (let i = 0; i < tsFields.length; i++) {
                if (payload[tsFields[i]] !== undefined) {
                    fields.push(`${tsFields[i]} = ?`);
                    params.push(this.toUtcDateTime(payload[tsFields[i]], tz));
                }
            }

            if (!fields.length) {
                return 0;
            }

            params.push(id);
            const sql = `UPDATE match_for_quiz SET ${fields.join(', ')}, updated_at = UTC_TIMESTAMP() WHERE id = ?`;
            const result = await DB.query(sql, params);
            if (result) {
                return result.affectedRows;
            }
            return 0;
        } catch (e) {
            console.log(e);
            return undefined;
        }
    }

    deleteMatch = async (id) => {
        const sql = 'DELETE FROM match_for_quiz WHERE id = ?';
        try {
            const result = await DB.query(sql, [id]);
            if (result) {
                return result.affectedRows;
            }
            return 0;
        } catch (e) {
            console.log(e);
            return undefined;
        }
    }

    // ---------------------------------------------------------------------
    // quiz_questions
    // ---------------------------------------------------------------------

    createQuestion = async (payload) => {
        const sql = `
            INSERT INTO quiz_questions
            (match_id, question, option_1, option_2, option_3, option_4, answer, category, deleted)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        try {
            const result = await DB.query(sql, [
                payload.match_id,
                payload.question,
                payload.option_1,
                payload.option_2,
                payload.option_3,
                payload.option_4,
                this.normalizeAnswer(payload.answer),
                payload.category || null,
                0
            ]);
            if (result) {
                return result.insertId;
            }
            return undefined;
        } catch (e) {
            console.log(e);
            return undefined;
        }
    }

    updateQuestion = async (id, payload) => {
        try {
            const fields = [];
            const params = [];

            const allowed = ['match_id', 'question', 'option_1', 'option_2', 'option_3', 'option_4', 'category', 'deleted'];
            for (let i = 0; i < allowed.length; i++) {
                if (payload[allowed[i]] !== undefined) {
                    fields.push(`${allowed[i]} = ?`);
                    params.push(payload[allowed[i]]);
                }
            }

            if (payload.answer !== undefined) {
                fields.push('answer = ?');
                params.push(this.normalizeAnswer(payload.answer));
            }

            if (!fields.length) {
                return 0;
            }

            params.push(id);
            const sql = `UPDATE quiz_questions SET ${fields.join(', ')}, updated_at = UTC_TIMESTAMP() WHERE id = ?`;
            const result = await DB.query(sql, params);
            if (result) {
                return result.affectedRows;
            }
            return 0;
        } catch (e) {
            console.log(e);
            return undefined;
        }
    }

    // Soft delete
    deleteQuestion = async (id) => {
        const sql = 'UPDATE quiz_questions SET deleted = 1, updated_at = UTC_TIMESTAMP() WHERE id = ?';
        try {
            const result = await DB.query(sql, [id]);
            if (result) {
                return result.affectedRows;
            }
            return 0;
        } catch (e) {
            console.log(e);
            return undefined;
        }
    }

    hardDeleteQuestion = async (id) => {
        const sql = 'DELETE FROM quiz_questions WHERE id = ?';
        try {
            const result = await DB.query(sql, [id]);
            if (result) {
                return result.affectedRows;
            }
            return 0;
        } catch (e) {
            console.log(e);
            return undefined;
        }
    }

    getQuestionById = async (id, includeCorrectAnswer = false) => {
        try {
            let sql = `
                SELECT id, match_id, question, option_1, option_2, option_3, option_4,
                       category, deleted, created_at, updated_at
            `;
            if (includeCorrectAnswer) {
                sql += ', answer';
            }
            sql += ' FROM quiz_questions WHERE id = ? AND (deleted = 0 OR deleted IS NULL) LIMIT 1';

            const rows = await DB.query(sql, [id]);
            if (rows && rows.length) {
                return rows[0];
            }
            return undefined;
        } catch (e) {
            console.log(e);
            return undefined;
        }
    }

    getQuestionsByMatchId = async (matchId, includeCorrectAnswer = false) => {
        try {
            let sql = `
                SELECT id, match_id, question, option_1, option_2, option_3, option_4,
                       category, created_at, updated_at
            `;
            // if (includeCorrectAnswer) {
            //     sql += ', answer';
            // }
            sql += `
                FROM quiz_questions
                WHERE match_id = ?
                  AND (deleted = 0 OR deleted IS NULL)
                ORDER BY id ASC
            `;
            const rows = await DB.query(sql, [matchId]);
            return rows || [];
        } catch (e) {
            console.log(e);
            return [];
        }
    }

    // ---------------------------------------------------------------------
    // quiz_access
    // ---------------------------------------------------------------------

    grantAccess = async (payload) => {
        const sql = `
            INSERT INTO quiz_access (user_id, access_date, created_at, updated_at)
            VALUES (?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())
        `;
        try {
            const result = await DB.query(sql, [payload.user_id, payload.access_date]);
            if (result) {
                return result.insertId;
            }
            return undefined;
        } catch (e) {
            console.log(e);
            return undefined;
        }
    }

    getAccessByUserAndDate = async (userId, accessDate) => {
        const sql = `
            SELECT id, user_id, access_date, created_at, updated_at
            FROM quiz_access
            WHERE user_id = ? AND access_date = ?
            LIMIT 1
        `;
        try {
            const rows = await DB.query(sql, [userId, accessDate]);
                        if (rows && rows.length) {
                return rows[0];
            }
            return undefined;
        } catch (e) {
            console.log(e);
            return undefined;
        }
    }

    // ---------------------------------------------------------------------
    // Quiz join / submit
    //   - join: user must have access for the match date AND not yet submitted
    //   - submit: user must have access AND only one submission per match_id
    // ---------------------------------------------------------------------

    joinQuiz = async ({ user_id, match_id, timezone }) => {
        try {
            const match = await this.getMatchById(match_id);
            if (!match) {
                return { success: false, statusCode: 404, message: 'Match not found' };
            }
            if (parseInt(match.isActive, 10) !== 1) {
                return { success: false, statusCode: 403, message: 'Match is not active' };
            }

            const matchDate = this.getDateInDhaka(match.match_starts, timezone);
                        const access = await this.getAccessByUserAndDate(user_id, matchDate);
            if (!access) {
                return { success: false, statusCode: 403, message: 'User does not have quiz access for this match date' };
            }

            // Already submitted? (one submission per user per match)
            const existing = await DB.query(
                'SELECT id FROM quiz_result WHERE user_id = ? AND match_id = ? LIMIT 1',
                [user_id, match_id]
            );
            if (existing && existing.length) {
                return { success: false, statusCode: 200, message: 'Quiz already submitted for this match' };
            }

            const questions = await this.getQuestionsByMatchId(match_id, false);
            return {
                success: true,
                statusCode: 200,
                data: {
                    match: match,
                    match_date: matchDate,
                    questions: questions
                }
            };
        } catch (e) {
            console.log(e);
            return { success: false, statusCode: 500, message: 'Failed to join quiz' };
        }
    }

    submitQuiz = async ({ user_id, match_id, answers, timezone, time_used_sec_to_submit }) => {
        try {
            const match = await this.getMatchById(match_id);
            if (!match) {
                return { success: false, statusCode: 404, message: 'Match not found' } ;
            }

            const matchDate = this.getDateInDhaka(match.match_starts, timezone);
            const access = await this.getAccessByUserAndDate(user_id, matchDate);
            if (!access) {
                return { success: false, statusCode: 403, message: 'User does not have quiz access for this match date' };
            }

            if (!Array.isArray(answers) || answers.length === 0) {
                return { success: false, statusCode: 400, message: 'No answers submitted' };
            }

            // Guard against duplicate submission.
            // NOTE: For full race-safety, add the unique index:
            //   ALTER TABLE quiz_result ADD UNIQUE KEY uniq_user_match (user_id, match_id);
            const existingRows = await DB.query(
                'SELECT id FROM quiz_result WHERE user_id = ? AND match_id = ? LIMIT 1',
                [user_id, match_id]
            );
            if (existingRows && existingRows.length) {
                return { success: false, statusCode: 409, message: 'Duplicate submission is not allowed' };
            }

            // Load active questions for this match (with correct answers).
            const questionRows = await DB.query(`
                SELECT id, answer
                FROM quiz_questions
                WHERE match_id = ? AND (deleted = 0 OR deleted IS NULL)
            `, [match_id]);

            if (!questionRows || !questionRows.length) {
                return { success: false, statusCode: 400, message: 'No active questions found for this match' };
            }

            const questionMap = {};
            for (let i = 0; i < questionRows.length; i++) {
                questionMap[questionRows[i].id] = questionRows[i];
            }

            let correctCount = 0;
            for (let i = 0; i < answers.length; i++) {
                const a = answers[i];
                const q = questionMap[a.question_id];
                if (!q) continue;

                const selected = this.normalizeAnswer(a.selected_option);
                const correct = (q.answer === null || q.answer === undefined)
                    ? null
                    : parseInt(q.answer, 10);

                if (selected !== null && correct !== null && selected === correct) {
                    correctCount += 1;
                }
            }

            // Compute time used if the client didn't provide it.
            let timeUsedSec = parseInt(time_used_sec_to_submit, 10);
            if (isNaN(timeUsedSec) || timeUsedSec < 0) {
                const timeRows = await DB.query(
                    'SELECT TIMESTAMPDIFF(SECOND, ?, UTC_TIMESTAMP()) AS sec',
                    [match.quiz_starts_at]
                );
                const sec = (timeRows && timeRows.length) ? timeRows[0].sec : 0;
                timeUsedSec = Math.max(0, parseInt(sec || 0, 10));
            }

            const insertResult = await DB.query(`
                INSERT INTO quiz_result
                (user_id, match_id, result, total_question, time_used_sec_to_submit, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, UTC_TIMESTAMP(), UTC_TIMESTAMP())
            `, [user_id, match_id, correctCount, questionRows.length, timeUsedSec]);

            return {
                success: true,
                statusCode: 200,
                data: {
                    result_id: insertResult ? insertResult.insertId : undefined,
                    user_id: user_id,
                    match_id: match_id,
                    result: correctCount,
                    total_question: questionRows.length,
                    time_used_sec_to_submit: timeUsedSec
                }
            };
        } catch (e) {
            console.log(e);
            // If the unique index catches a duplicate at the DB level, return 409.
            if (e && (e.code === 'ER_DUP_ENTRY' || e.errno === 1062)) {
                return { success: false, statusCode: 409, message: 'Duplicate submission is not allowed' };
            }
            return { success: false, statusCode: 500, message: 'Failed to submit quiz' };
        }
    }

    // ---------------------------------------------------------------------
    // Results / leaderboards
    // ---------------------------------------------------------------------

    getResultByUserAndMatch = async (userId, matchId) => {
        const sql = `
            SELECT id, user_id, match_id, result, total_question,
                   time_used_sec_to_submit, created_at, updated_at
            FROM quiz_result
            WHERE user_id = ? AND match_id = ?
            LIMIT 1
        `;
        try {
            const rows = await DB.query(sql, [userId, matchId]);
            if (rows && rows.length) {
                return rows[0];
            }
            return undefined;
        } catch (e) {
            console.log(e);
            return undefined;
        }
    }

    getMatchwiseWinners = async ({ matchId, limit } = {}) => {
        const lim = this.safeLimit(limit, 150);
        const params = [];
        let matchFilter = '';
        if (matchId) {
            matchFilter = 'AND m.id = ?';
            params.push(matchId);
        }
 
        // const sql = `
        //     SELECT
        //         m.id              AS match_id,
        //         m.country1,
        //         m.country2,
        //         m.flag1,
        //         m.flag2,
        //         m.group_info,
        //         m.match_starts,
        //         m.match_ends,
        //         w.user_id,
        //         u.name            AS user_name,
        //         u.msisdn          AS user_phone,
        //         w.result,
        //         w.total_question,
        //         w.time_used_sec_to_submit,
        //         w.submitted_at
        //     FROM (
        //         SELECT
        //             qr.user_id,
        //             qr.match_id,
        //             qr.result,
        //             qr.total_question,
        //             qr.time_used_sec_to_submit,
        //             qr.created_at AS submitted_at,
        //             ROW_NUMBER() OVER (
        //                 PARTITION BY qr.match_id
        //                 ORDER BY qr.result                  DESC,
        //                          qr.time_used_sec_to_submit ASC,
        //                          qr.created_at              ASC
        //             ) AS rn
        //         FROM quiz_result qr
        //     ) w
        //     INNER JOIN match_for_quiz m ON m.id = w.match_id
        //     LEFT  JOIN users           u ON u.id = w.user_id
        //     WHERE w.rn = 1
        //       AND m.match_ends < UTC_TIMESTAMP()
        //       ${matchFilter}
        //     ORDER BY m.match_starts DESC
        //     LIMIT ${lim}
        // `;
        const sql = `SELECT ranked.*
        FROM (
            SELECT 
                t.id AS quiz_result_id,
                t.user_id,
                t.result,
                t.total_question,
                t.match_id,
                t.created_at AS submitted_at,
                m.country1,
                m.country2,
                m.flag1,
                m.flag2,
                m.group_info,
                m.matchNo,
                DATE_FORMAT(DATE_ADD(match_starts, INTERVAL 6 HOUR), '%Y-%m-%d %H:%i:%s') AS match_starts,
                DATE_FORMAT(DATE_ADD(match_ends, INTERVAL 6 HOUR), '%Y-%m-%d %H:%i:%s') AS match_ends,
                CASE
                    WHEN u.user_name LIKE '880%' THEN
                        CONCAT(
                            LEFT(u.user_name, 5),
                            '****',
                            RIGHT(u.user_name, 4)
                        )
                    WHEN u.user_name LIKE '%@%' THEN
                        CONCAT(
                            LEFT(SUBSTRING_INDEX(u.user_name, '@', 1), 1),
                            '****',
                            RIGHT(SUBSTRING_INDEX(u.user_name, '@', 1), 7),
                            '@',
                            SUBSTRING_INDEX(u.user_name, '@', -1)
                        )
                    ELSE u.user_name
                END AS full_name,
                u.image_url,
                DATE_FORMAT(DATE_ADD(match_starts, INTERVAL 6 HOUR), '%Y-%m-%d %H:%i:%s') AS quiz_starts_at,
                ROW_NUMBER() OVER (
                    PARTITION BY t.match_id 
                    ORDER BY t.result DESC, t.time_used_sec_to_submit ASC
                ) AS rn
            FROM quiz_result t
            INNER JOIN match_for_quiz m ON m.id = t.match_id
            left join users as u on t.user_id=u.id
            WHERE m.match_ends < UTC_TIMESTAMP() 
            ORDER BY m.matchNo DESC
        ) ranked
        WHERE rn = 1;`


 
        try {
            let rows = await DB.query(sql, params);
            // let {today,tomorrow} =  this.getTodayAndTomorrowMatches(rows);
            
            return   rows;
        } catch (e) {
            console.log(e);
            return [];
        }
    }
 
    // Top scorers across all matches whose match_starts falls on the
    // given date (DATE compared in the DB session timezone).
    getDayWinners = async (date, limit = 10) => {
        const lim = this.safeLimit(limit, 10); 
        const sql = `
            SELECT qr.user_id, u.name, qr.match_id,
                   qr.result, qr.total_question, qr.time_used_sec_to_submit,
                   qr.created_at AS submitted_at
            FROM quiz_result qr
            INNER JOIN match_for_quiz m ON m.id = qr.match_id
            LEFT JOIN users u ON u.id = qr.user_id
            WHERE DATE(m.match_starts) = ?
            ORDER BY qr.result DESC,
                     qr.time_used_sec_to_submit ASC,
                     qr.created_at ASC
            LIMIT ${lim}
        `;
        try {
            const rows = await DB.query(sql, [date]);
            return rows || [];
        } catch (e) {
            console.log(e);
            return [];
        }
    }
}

// module.exports = new QuizModel;

module.exports = new QuizModel;