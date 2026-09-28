const DB = require('../db');
const LoggerError = require('../../utils/logger-error');
const coreUtils = require('../../utils/core-utils');
const nodemailer = require('nodemailer');
const { transporter } = require('./node-mailer');
const { dailySignupSubscriptionReportTemplate } = require('./EmailTemplate');
// import nodemailer from 'nodemailer';
// const { transporter } = require('./node-mailer');



class TrackModel {
    tableName = 'tracks';

    findOne = async (params) => {
        try {
            const sql = 'CALL get_track(?, ?)';
            const results = await DB.query(sql, [params[0], params[1]]);
            /* coreUtils.printStringify(result[0][0]);
            coreUtils.printStringify(result[1][0]); */
            var track = results[0][0];
            const trackCountObj = results[1][0];
            let key = Object.keys(trackCountObj)[0];
            track.is_favorite = trackCountObj[key] > 0 ? true : false;
            /* console.log('trackCountObj ' + trackCountObj);
            console.log('key ' + key);
            console.log('trackCount ' + trackCountObj[key]); */
            if (track) {
                return track;
            }
            return undefined;
            /* const sql = 'SELECT * FROM tracks WHERE id = ? LIMIT 1';
            const sql1 = 'SELECT EXISTS(SELECT * FROM users_tracks WHERE user_id = ? AND track_id = ?) AS TRACK_COUNT'
            const sql2 = 'SELECT COUNT(*) AS TRACK_COUNT FROM users_tracks WHERE user_id = ? AND track_id = ?';
            const result = await DB.query(sql, [params[0]]);
            const result1 = await DB.query(sql1, [params[1], params[0]]);
            const result2 = await DB.query(sql2, [params[1], params[0]]);
            /* console.log('params' + params);
            console.log('res' + coreUtils.printStringify(result));
            console.log('res 1' + coreUtils.printStringify(result1)); */
            /*             coreUtils.printStringify(result2.COUNT);
                        console.log('stringifyToObject' + coreUtils.stringifyToObject(result2));
                        const t = coreUtils.stringifyToObject(result1);
                        coreUtils.printStringify(t);
                        for (const key in result2[0]) {
                            if (result2[0].hasOwnProperty(key)) {
                                var value = result2[0][key];
                                //do something with value;
                                console.log('value' + value);
                            }
                        } */
            /* console.log('res 3' + result[0]);
            console.log('res 4' + result1[0]);
            if (results) {
                return results;
            } */
        }
        catch (e) {
            coreUtils.printStringify(e);
            LoggerError.log(e)
            return undefined;
        }
    }
    getCombinedDataForApp = async (boolValue) => {
        const sql = 'CALL get_combined_data_for_app()';
        try {
            const results = await DB.query(sql,[boolValue]);
            if (results) {
                return results;
            }
            return undefined;
        }
        catch (e) {
            coreUtils.printStringify(e);
            LoggerError.log(e)
            return undefined;
        }
    }

    getCombinedData = async () => {
        const sql = 'CALL get_combined_data()';
        try {
            const results = await DB.query(sql);
            if (results) {
                return results;
            }
            return undefined;
        }
        catch (e) {
            coreUtils.printStringify(e);
            LoggerError.log(e)
            return undefined;
        }
    }

    getPlaylist = async (count) => {
        const sql = 'CALL get_playlist(?)';
        try {
            const results = await DB.query(sql, [count]);
            if (results) {
                return results[0];
            }
            return undefined;
        }
        catch (e) {
            coreUtils.printStringify(e);
            LoggerError.log(e)
            return undefined;
        }
    }

    createTrack = async (
        name,
        description,
        author,
        audiobook,
        contributingArtists,
        category,
        genre,
        thumbPath,
        filePath
    ) => {
        const sql = 'CALL create_track_old(?, ?, ?, ?, ?, ?, ?, ?, ?)';
        try {
            const results = await DB.query(sql, [name, description, author, audiobook, contributingArtists, category, genre, thumbPath, filePath]);
            if (results) {
                // sp returns extra data, need the first one
                return results[0][0];
            }
        }
        catch (e) {
            coreUtils.printStringify(e);
            LoggerError.log(e)
            return undefined;
        }
    }

    updateTrackFiles = async (
        id,
        thumbPath,
        filePath
    ) => {
        const sql = 'UPDATE tracks SET thumb_path = ?, file_path = ? WHERE id = ?';
        try {
            const results = await DB.query(sql, [thumbPath, filePath, id]);
            if (results) {
                return results;
            }
        }
        catch (e) {
            coreUtils.printStringify(e);
            LoggerError.log(e)
            return undefined;
        }
    }

    emailQuizReportSender = async (req) => {
        try {
            const transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                  user: 'your@gmail.com',
                  pass: 'your_app_password',
                },
              });
            await transporter.sendMail({
              from: 'your@gmail.com',
              to,
              subject,
              html,
            });
        
            res.json({ message: 'Email sent successfully' });
          } catch (error) {
            res.status(500).json({ message: 'Failed to send email', error: error.message });
          }
    }

    sendEmail = async ({ to, subject, text, from }) => {
        try {
            const signupByAuthSourceQuery = `
            SELECT
                auth_src,
                COUNT(*) AS signup_count
            FROM users
            WHERE deleted = 0
              AND auth_src IS NOT NULL
              AND auth_src != ''
              AND DATE(CONVERT_TZ(created_at, '+00:00', '+06:00')) = CURDATE() - INTERVAL 1 DAY
            GROUP BY auth_src;
        `;

            const packageWiseStatsQuery = `
            SELECT
                sp.subscriptionItemId AS package_id,
                sp.name AS package_name,
                SUM(CASE WHEN uspl.is_subscribed = 1 AND uspl.is_first_payment = 1 AND uspl.rent_payment = 0
                         AND DATE(uspl.created_at) BETWEEN CURDATE() - INTERVAL 30 DAY AND CURDATE() - INTERVAL 1 DAY
                    THEN 1 ELSE 0 END) AS sub_last_30_days,
                SUM(CASE WHEN uspl.isCancelled = 1
                         AND DATE(uspl.created_at) BETWEEN CURDATE() - INTERVAL 30 DAY AND CURDATE() - INTERVAL 1 DAY
                    THEN 1 ELSE 0 END) AS unsub_last_30_days,
                SUM(CASE WHEN uspl.is_subscribed = 1 AND uspl.is_first_payment = 1 AND uspl.rent_payment = 0
                         AND DATE(uspl.created_at) BETWEEN CURDATE() - INTERVAL 7 DAY AND CURDATE() - INTERVAL 1 DAY
                    THEN 1 ELSE 0 END) AS sub_last_7_days,
                SUM(CASE WHEN uspl.isCancelled = 1
                         AND DATE(uspl.created_at) BETWEEN CURDATE() - INTERVAL 7 DAY AND CURDATE() - INTERVAL 1 DAY
                    THEN 1 ELSE 0 END) AS unsub_last_7_days,
                SUM(CASE WHEN uspl.is_subscribed = 1 AND uspl.is_first_payment = 1 AND uspl.rent_payment = 0
                         AND DATE(uspl.created_at) = CURDATE() - INTERVAL 1 DAY
                    THEN 1 ELSE 0 END) AS sub_yesterday,
                SUM(CASE WHEN uspl.isCancelled = 1
                         AND DATE(uspl.created_at) = CURDATE() - INTERVAL 1 DAY
                    THEN 1 ELSE 0 END) AS unsub_yesterday
            FROM user_subscription_payment_log AS uspl
            JOIN subscription_packages AS sp ON sp.subscriptionItemId = uspl.package_id
            WHERE DATE(uspl.created_at) >= CURDATE() - INTERVAL 30 DAY
              AND DATE(uspl.created_at) < CURDATE()
            GROUP BY  sp.name
            ;
        `;

            const [signups, packageStats] = await Promise.all([
                DB.query(signupByAuthSourceQuery),
                DB.query(packageWiseStatsQuery),
            ]);

            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            const reportDate = yesterday.toISOString().split('T')[0];
            const html = dailySignupSubscriptionReportTemplate({
                signups,
                packageStats,
                reportDate,
            });

            const mailOptions = {
                from:    from || '"No-Reply" <no-reply@kabbik.com>',
                to:      Array.isArray(to) ? to.join(', ') : to,
                subject,
                html,
                text,
                headers: {
                    'X-Priority': '1',
                    'X-Mailer':   'Node.js Nodemailer'
                }
            };

            const info = await transporter.sendMail(mailOptions);
            if (info) {
                return info;
            }
            return undefined;
        } catch (e) {
            coreUtils.printStringify(e);
            LoggerError.log(e);
            return undefined;
        }
    };
}

module.exports = new TrackModel;