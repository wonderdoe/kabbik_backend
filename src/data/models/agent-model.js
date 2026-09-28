const DB = require('../db');
const LoggerError = require('../../utils/logger-error');
const s3Helper = require('../../utils/s3-helper');
const GlobalTask = require('../../utils/global-tasker');

class AgentModel {
    tableName = 'publishers';

    getAll = async () => {
        const sql = 'CALL get_entities(?)'
        try {
            const results = await DB.query(sql, [this.tableName])
            if (results) {
                // sp returns extra data, need the first one
                return results[0]
            }
            return undefined
        }
        catch (e) {
            LoggerError.log(e)
            return undefined
        }
    }

    getBlockedAgent = async () => {
        const sql = `SELECT * FROM ${this.tableName} WHERE deleted = ?`;
        try {
            const results = await DB.query(sql, [1])
            if (results) {
                // sp returns extra data, need the first one
                return results
            }
            return undefined
        }
        catch (e) {
            LoggerError.log(e)
            return undefined
        }
    }

    findById = async (id) => {
        const sql = 'CALL get_entity_by_id(?, ?)';
        try {
            const results = await DB.query(sql, [id, this.tableName]);
            if (results) {
                // sp returns extra data 2d array, need the first one
                return results[0][0];
            }
            return undefined;
        }
        catch (e) {
            LoggerError.log(e)
            return undefined;
        }
    }
    findByIdAgentBook = async (id) => {
        const sql = 'CALL get_entity_by_id(?, ?)';
        try {
            const results = await DB.query(sql, [id, "agent"]);
            if (results) {
                // sp returns extra data 2d array, need the first one
                return results[0][0];
            }
            return undefined;
        }
        catch (e) {
            LoggerError.log(e)
            return undefined;
        }
    }
    findByIdAgent = async (id) => {
        const sql = 'Select * from agent where id = ?';
        try {
            const results = await DB.query(sql, [id]);
            if (results) {
                // sp returns extra data 2d array, need the first one
                return results[0];
            }
            return undefined;
        }
        catch (e) {
            console.log(e);
            LoggerError.log(e)
            return undefined;
        }
    }


    updateAgentById = async (
        email,
        phone,
        full_name,
        address,
        imageUrl,
        id,
        en_name) => {
        try {
                        // var default_rate = 5
            // const sql = 'CALL get_castcrew_audiobook_details(?)';

            const sql = `UPDATE book_publishers SET email = ?, phone =?, full_name = ?, address = ?, imageUrl = ?, en_name = ? WHERE id = ? `;
            const result = await DB.query(sql, [email, phone, full_name, address, imageUrl, en_name, id]);
            // const sql = "SELECT * FROM cast_crew WHERE deleted = FALSE AND id = ? ORDER BY created_at DESC;";
            // const result = await DB.query(sql,[id]);
            if (result) {
                //console.log(re)
                // console.log(result[0]);
                return "Success";
            }
            return undefined;
        } catch (e) {
            console.log(e.message);
            // coreUtils.printStringify(e);
            // LoggerError.log(e)
            return undefined;
        }
    }


    addSubscription = async (
        phone, name, email, packageId, fromAgent, agentId, isSubscribed, purchase_time, next_purchase_time, userId, message, status) => {
        try {
            const sql = `INSERT INTO agent_log (phone, name, email, packageId, fromAgent, agentId, isSubscribed, purchase_time, next_purchase_time, userId, message, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`;
            const result = await DB.query(sql, [phone, name, email, packageId, fromAgent, agentId, isSubscribed, purchase_time, next_purchase_time, userId, message, status]);
            if (result) {
                return "Success";
            }
            return undefined;
        } catch (e) {
            console.log(e.message);
            return undefined;
        }
    }


    getSubscriptionPackageById = async (packageId) => {
        try {
            
            const sql = `SELECT * FROM kabbik.dynamic_subscription_packages  where subscriptionItemId = ?`;
            const result = await DB.query(sql, [packageId]);
            
            if (result) {
                return result[0];
            }
            return undefined;
        } catch (e) {
            console.log(e.message);
            return undefined;
        }
    }




    findByCredential = async (credential) => {
                const sql = 'CALL get_agent_by_credential(?)';
        try {
            const results = await DB.query(sql, [credential]);
            if (results) {
                // sp returns extra data 2d array, need the first one
                return results[0][0];
            }
            return undefined;
        }
        catch (e) {
            console.log("-------------e----------");
            console.log(e);
            LoggerError.log(e)
            return undefined;
        }
    }

    findByCredentialBookAgent = async (credential) => {
        const sql = 'CALL get_book_publisher_by_credential(?)';
        try {
            const results = await DB.query(sql, [credential]);
                        if (results) {

                // sp returns extra data 2d array, need the first one
                return results[0][0];
            }
            return undefined;
        }
        catch (e) {
            console.log(e);
            LoggerError.log(e)
            return undefined;
        }
    }

    create = async (
        email,
        phone,
        fullName,
        passHash,
        address
    ) => {
        const sql = 'CALL create_agent(?, ?, ?, ?, ?)';
        try {
            const results = await DB.query(sql, [email, phone, fullName, passHash, address]);
            if (results) {
                // sp returns extra data 2d array, need the first one
                return results[0][0];
            }
                        return undefined;
        }
        catch (e) {
            console.log(e)
            LoggerError.log(e)
            return undefined;
        }
    }
    bookAgentCreate = async (
        email,
        phone,
        fullName,
        passHash,
        address,
        imageUrl,
        en_name
    ) => {

        const sql = 'CALL create_book_publisher(?, ?, ?, ?, ?, ?, ?)';
        const results = await DB.query(sql, [email, phone, fullName, passHash, address, imageUrl, en_name]);
        if (results) {
            // sp returns extra data 2d array, need the first one
            return results[0][0];
        }

    }

    update = async (
        fullName,
        address,
        id
    ) => {
        const sql = 'CALL update_publisher(?, ?, ?)';
        try {
            const result = await DB.query(sql, [fullName, address, id]);
            if (result) {
                // sp with update query returns obj with affected rows
                return result;
            }
            return undefined;
        }
        catch (e) {
            LoggerError.log(e)
            return undefined;
        }
    }

    updateAgentStatus = async (id, deletestatus) => {
        const sql = `UPDATE ${this.tableName} SET deleted = ? WHERE id = ?`;
        try {
            const result = await DB.query(sql, [deletestatus, id]);
            if (result) {
                // sp with update query returns obj with affected rows
                return result;
            }
            return undefined;
        }
        catch (e) {
            LoggerError.log(e)
            return undefined;
        }
    }




    getAgentsAudiobook = async (req) => {
        try {
            var publisherId = req.query.publisherId
                        const sql = `SELECT *, (SELECT 
                IFNULL(AVG(r.rating), 5)
            FROM
                ratings AS r
            WHERE
                r.audiobook_id = a.id) AS rating,
                (SELECT 
                    count(distinct apcl.user_id) as unique_paid_users
                FROM
                    audiobook_play_count_log AS apcl
                        LEFT JOIN
                    audiobooks AS ab ON apcl.audiobook_id = ab.id
                WHERE 
                ab.publisher_id = ? AND apcl.isSubscribedUser =1 AND apcl.isPremiumAudiobook =1 AND
                apcl.audiobook_id IS not null AND apcl.audiobook_id = a.id) AS unique_paid_user,
                (SELECT 
                    count(distinct apcl.user_id) as unique_free_users
                FROM
                    audiobook_play_count_log AS apcl
                        LEFT JOIN
                    audiobooks AS ab ON apcl.audiobook_id = ab.id
                WHERE 
                ab.publisher_id = ? AND apcl.isSubscribedUser = 0 AND
                apcl.audiobook_id IS not null AND apcl.audiobook_id = a.id ) AS unique_free_user
                FROM audiobooks as a WHERE a.approval_status = 1 AND a.publisher_id = ? AND a.deleted = 0 ORDER BY a.created_at`;
            const result = await DB.query(sql, [publisherId, publisherId, publisherId]);
                        if (result) {
                return result;
            }
            return undefined;

        } catch (e) {
            // coreUtils.printStringify(e);
            console.log(e);
            LoggerError.log(e)
            return undefined;
        }
    }

    getAgentSubscribedUsers = async (req) => {
        try {
            var agentId = req.query.agentId
            // const startDate = req.query.startDate;
            // const endDate = req.query.endDate;

            // var sql
            // if (startDate == null || endDate == null) {

            //     return "No Start Date/End Date specified";
            // } else {
                        const sql = `SELECT * from agent_log where 
                status = 1 AND agentId = ?`;
            const result = await DB.query(sql, [agentId]);
                        if (result) {
                return {
                    message: "Selected Subscribed User List By You",
                    data: result
                };
            }
            // }
            return undefined;

        } catch (e) {
            // coreUtils.printStringify(e);
            console.log(e);
            LoggerError.log(e)
            return undefined;
        }
    }
    getAgentSubscriptionReport = async (req) => {
        try {
            var agentId = req.query.agentId
            const startDate = req.query.startDate;
            const endDate = req.query.endDate;

            var sql
            if (startDate == null || endDate == null) {

                return "No Start Date/End Date specified";
            } else {
                const [startDay, startMonth, startYear] = startDate.split('-');
                const [endDay, endMonth, endYear] = endDate.split('-');
                const formattedStartDate = `${startYear}-${startMonth}-${startDay}`;
                const formattedEndDate = `${endYear}-${endMonth}-${endDay}`;

                sql = `SELECT sp.name, sp.rawPrice,(ROUND((sp.rawPrice * 0.15), 2)) as agent_comission, sp.length, al.name as registered_name, us.user_name as registered_phone, al.packageId, al.fromAgent, al.purchase_time, al.next_purchase_time
                    from agent_log as al 
                    left join users as us on us.id = al.userId 
                    left join dynamic_subscription_packages as sp on sp.subscriptionItemId = al.packageId
                    where 
                    al.status = 1 AND 
                    al.agentId = ? AND
                    (DATE_FORMAT(CONVERT_TZ(al.created_at, '+00:00', 'Asia/Dhaka'), '%Y-%m-%d') >= ?) AND
                    (DATE_FORMAT(CONVERT_TZ(al.created_at, '+00:00', 'Asia/Dhaka'), '%Y-%m-%d') <= ?)
                    order by al.created_at DESC`;
                const result = await DB.query(sql, [agentId, formattedStartDate, formattedEndDate]);
                var total_comission = 0;
                for (var i = 0; i < result.length; i++) {
                    total_comission += result[i].agent_comission;
                }
                if (result) {
                    return {
                        message: "Data Selected From " + startDate + " To " + endDate,
                        data: result,
                        total_comission: parseFloat(total_comission.toFixed(2))
                    };
                }
            }
            return undefined;

        } catch (e) {
            // coreUtils.printStringify(e);
            console.log(e);
            LoggerError.log(e)
            return undefined;
        }
    }
    getAgentsById = async (req) => {
        try {
            var publisherId = req.query.id
                        const sql = `SELECT * FROM book_publishers WHERE id =? LIMIT 1`;
            const result = await DB.query(sql, [publisherId]);
                        if (result) {
                return result[0];
            }
            return undefined;

        } catch (e) {
            // coreUtils.printStringify(e);
            console.log(e);
            LoggerError.log(e)
            return undefined;
        }
    }

    getAgentslist = async (req) => {
        try {
            var publisherId = req.query.publisherId
                        const sql = `SELECT bp.*
            FROM
            book_publishers AS bp
            WHERE
                bp.deleted = 0 ORDER BY bp.created_at DESC`;
            const result = await DB.query(sql, [publisherId]);
                        if (result) {
                return result;
            }
            return undefined;

        } catch (e) {
            // coreUtils.printStringify(e);
            console.log(e);
            LoggerError.log(e)
            return undefined;
        }
    }

    updateAgent = async (req) => {
        try {

            const currentUser = req.currentUser
            const sql = `UPDATE agent SET email = ?, phone =?, full_name = ?, address = ? WHERE id = ? `;
            const result = await DB.query(sql, [req.body.email, req.body.phone, req.body.full_name, req.body.address, currentUser.id]);

            if (result.affectedRows > 0) {
                return {data: "Success"};
            }
            return undefined;

        } catch (e) {
            // coreUtils.printStringify(e);
            console.log(e);
            LoggerError.log(e)
            return undefined;
        }
    }

    getAgentsAudiobookSummaryToday = async (req) => {
        var publisherId = req.query.publisherId

                try {
            const sql = `SELECT 
                COUNT(apcl.id) AS total_played
            FROM
                audiobook_play_count_log AS apcl
                    LEFT JOIN
                episodes AS ep ON apcl.episode_id = ep.id
                    LEFT JOIN
                audiobooks AS ab ON ep.audiobook_id = ab.id
            WHERE 
            ab.publisher_id = ? AND
            apcl.episode_id IS Not Null AND
                (DATE_FORMAT(CONVERT_TZ(apcl.created_at, '+00:00', '+6:00'),
                        '%Y%m%d') = DATE_FORMAT(CONVERT_TZ(SUBDATE(NOW(), 0), '+00:00', '+6:00'),
                        '%Y%m%d'));`;
            const result = await DB.query(sql, [publisherId]);
            const sql2 = `SELECT 
                COUNT(apcl.id) AS web
            FROM
                audiobook_play_count_log AS apcl
                LEFT JOIN
                episodes AS ep ON apcl.episode_id = ep.id
                    LEFT JOIN
                audiobooks AS ab ON ep.audiobook_id = ab.id
            WHERE 
            ab.publisher_id = ? AND apcl.episode_id IS Not Null and
                (DATE_FORMAT(CONVERT_TZ(apcl.created_at, '+00:00', '+6:00'),
                        '%Y%m%d') = DATE_FORMAT(CONVERT_TZ(SUBDATE(NOW(), 0), '+00:00', '+6:00'),
                        '%Y%m%d')) AND apcl.from_channel = 'web';`;
            const result2 = await DB.query(sql2, [publisherId]);

            const sql3 = `SELECT 
                COUNT(apcl.id) AS android
            FROM
                audiobook_play_count_log AS apcl
                LEFT JOIN
                episodes AS ep ON apcl.episode_id = ep.id
                    LEFT JOIN
                audiobooks AS ab ON ep.audiobook_id = ab.id
            WHERE 
            ab.publisher_id = ? AND apcl.episode_id IS Not Null and
                (DATE_FORMAT(CONVERT_TZ(apcl.created_at, '+00:00', '+6:00'),
                        '%Y%m%d') = DATE_FORMAT(CONVERT_TZ(SUBDATE(NOW(), 0), '+00:00', '+6:00'),
                        '%Y%m%d')) AND apcl.from_channel = 'android';`;
            const result3 = await DB.query(sql3, [publisherId]);


            const sql31 = `SELECT 
                COUNT(apcl.id) AS android
            FROM
                audiobook_play_count_log AS apcl
                LEFT JOIN
                episodes AS ep ON apcl.episode_id = ep.id
                    LEFT JOIN
                audiobooks AS ab ON ep.audiobook_id = ab.id
            WHERE 
            ab.publisher_id = ? AND apcl.episode_id IS Not Null and
                (DATE_FORMAT(CONVERT_TZ(apcl.created_at, '+00:00', '+6:00'),
                        '%Y%m%d') = DATE_FORMAT(CONVERT_TZ(SUBDATE(NOW(), 0), '+00:00', '+6:00'),
                        '%Y%m%d')) AND apcl.from_channel != 'android' AND apcl.from_channel != 'web';`;
            const result31 = await DB.query(sql31, [publisherId]);

            const sql4 = `SELECT 
                COUNT(apcl.id) AS total_played
            FROM 
                audiobook_play_count_log AS apcl
                LEFT JOIN
                episodes AS ep ON apcl.episode_id = ep.id
                    LEFT JOIN
                audiobooks AS ab ON ep.audiobook_id = ab.id
            WHERE 
            ab.publisher_id = ? AND apcl.episode_id IS Not Null and (apcl.audiobook_id IN (Select ab.id from audiobooks as ab where ab.price = 0 and ab.deleted = 0)
            OR apcl.episode_id IN (Select ep.id from episodes ep WHERE ep.audiobook_id IN (Select ab.id from audiobooks as ab where ab.price = 0 and ab.deleted = 0))) AND
                (DATE_FORMAT(CONVERT_TZ(apcl.created_at, '+00:00', '+6:00'),
                        '%Y%m%d') = DATE_FORMAT(CONVERT_TZ(SUBDATE(NOW(), 0), '+00:00', '+6:00'),
                        '%Y%m%d'));`;
            const result4 = await DB.query(sql4, [publisherId]);

            const sql5 = `SELECT 
                COUNT(apcl.id) AS total_played
            FROM
                audiobook_play_count_log AS apcl
                LEFT JOIN
                episodes AS ep ON apcl.episode_id = ep.id
                    LEFT JOIN
                audiobooks AS ab ON ep.audiobook_id = ab.id
            WHERE 
            ab.publisher_id = ? AND apcl.episode_id IS Not Null and (apcl.audiobook_id IN (Select ab.id from audiobooks as ab where ab.price != 0 and ab.deleted = 0)
                    OR apcl.episode_id IN (Select ep.id from episodes ep WHERE ep.audiobook_id IN (Select ab.id from audiobooks as ab where ab.price != 0 and ab.deleted = 0))) AND
                (DATE_FORMAT(CONVERT_TZ(apcl.created_at, '+00:00', '+6:00'),
                        '%Y%m%d') = DATE_FORMAT(CONVERT_TZ(SUBDATE(NOW(), 0), '+00:00', '+6:00'),
                        '%Y%m%d'));`;
            const result5 = await DB.query(sql5, [publisherId]);
            if (result) {
                return {
                    "total_played": "" + result[0].total_played,
                    "web": "" + result2[0].web,
                    "android": "" + result3[0].android,
                    "not_defined": "" + result31[0].not_defined,
                    "free": "" + result4[0].total_played,
                    "paid": "" + result5[0].total_played
                }
            }
            return undefined;

        } catch (e) {
            console.log(e)
            coreUtils.printStringify(e);
            LoggerError.log(e)
            return undefined;
        }
    }

    getAgentPackageList = async (req) => {
        try {

            const sql = `SELECT * FROM kabbik.dynamic_subscription_packages order by subscriptionItemId`;
            const result = await DB.query(sql);
                        // const result = await DB.query(sql);
            GlobalTask.insertLogsOptional({
                USERID: req.currentUser ? req.currentUser.id : "",
                userAction: "GetSubscriptionList",
                endpoint: "/v3/googlepay/googlepay_subscription_list",
                forTask: "Agent Subscription",
                source: req.query.source,
                platform: req.query.platform,
                user_ip: req.user_ip
            })
                .catch(error => {
                    console.error("Error:", error);
                });

                        if (result) {
                return result;
            }
            return undefined;

        } catch (e) {
            console.log("edwedw" + e)
            return undefined;
        }
    }

    getAgentsAudiobookSummary = async (req) => {
        var publisherId = req.query.publisherId

                try {
            const sql = `SELECT 
                COUNT(apcl.id) AS total_played
            FROM
                audiobook_play_count_log AS apcl
                    LEFT JOIN
                episodes AS ep ON apcl.episode_id = ep.id
                    LEFT JOIN
                audiobooks AS ab ON ep.audiobook_id = ab.id
            WHERE 
            ab.publisher_id = ? AND
            apcl.episode_id IS Not Null;`;
            const result = await DB.query(sql, [publisherId]);
            const sql2 = `SELECT 
                COUNT(apcl.id) AS web
            FROM
                audiobook_play_count_log AS apcl
                LEFT JOIN
                episodes AS ep ON apcl.episode_id = ep.id
                    LEFT JOIN
                audiobooks AS ab ON ep.audiobook_id = ab.id
            WHERE 
            ab.publisher_id = ? AND apcl.episode_id IS Not Null AND apcl.from_channel = 'web';`;
            const result2 = await DB.query(sql2, [publisherId]);

            const sql3 = `SELECT 
                COUNT(apcl.id) AS android
            FROM
                audiobook_play_count_log AS apcl
                LEFT JOIN
                episodes AS ep ON apcl.episode_id = ep.id
                    LEFT JOIN
                audiobooks AS ab ON ep.audiobook_id = ab.id
            WHERE 
            ab.publisher_id = ? AND apcl.episode_id IS Not Null AND apcl.from_channel = 'android';`;
            const result3 = await DB.query(sql3, [publisherId]);


            const sql31 = `SELECT 
                COUNT(apcl.id) AS android
            FROM
                audiobook_play_count_log AS apcl
                LEFT JOIN
                episodes AS ep ON apcl.episode_id = ep.id
                    LEFT JOIN
                audiobooks AS ab ON ep.audiobook_id = ab.id
            WHERE 
            ab.publisher_id = ? AND apcl.episode_id IS Not Null AND apcl.from_channel != 'android' AND apcl.from_channel != 'web';`;
            const result31 = await DB.query(sql31, [publisherId]);

            const sql4 = `SELECT 
                COUNT(apcl.id) AS total_played
            FROM 
                audiobook_play_count_log AS apcl
                LEFT JOIN
                episodes AS ep ON apcl.episode_id = ep.id
                    LEFT JOIN
                audiobooks AS ab ON ep.audiobook_id = ab.id
            WHERE 
            ab.publisher_id = ? AND apcl.episode_id IS Not Null and (apcl.audiobook_id IN (Select ab.id from audiobooks as ab where ab.price = 0 and ab.deleted = 0)
            OR apcl.episode_id IN (Select ep.id from episodes ep WHERE ep.audiobook_id IN (Select ab.id from audiobooks as ab where ab.price = 0 and ab.deleted = 0)));`;
            const result4 = await DB.query(sql4, [publisherId]);

            const sql5 = `SELECT 
                COUNT(apcl.id) AS total_played
            FROM
                audiobook_play_count_log AS apcl
                LEFT JOIN
                episodes AS ep ON apcl.episode_id = ep.id
                    LEFT JOIN
                audiobooks AS ab ON ep.audiobook_id = ab.id
            WHERE
            ab.publisher_id = ? AND apcl.episode_id IS Not Null and (apcl.audiobook_id IN (Select ab.id from audiobooks as ab where ab.price != 0 and ab.deleted = 0)
                    OR apcl.episode_id IN (Select ep.id from episodes ep WHERE ep.audiobook_id IN (Select ab.id from audiobooks as ab where ab.price != 0 and ab.deleted = 0)));`;
            const result5 = await DB.query(sql5, [publisherId]);
            if (result) {
                return {
                    "total_played": "" + result[0].total_played,
                    "web": "" + result2[0].web,
                    "android": "" + result3[0].android,
                    "not_defined": "" + result31[0].not_defined,
                    "free": "" + result4[0].total_played,
                    "paid": "" + result5[0].total_played
                }
            }
            return undefined;

        } catch (e) {
            console.log(e)
            coreUtils.printStringify(e);
            LoggerError.log(e)
            return undefined;
        }
    }


    getAgentsPaidUsersSummary = async (req) => {
        var publisherId = req.query.publisherId

                try {
            const sql = `SELECT 
                count(distinct apcl.user_id) as unique_users
            FROM
                audiobook_play_count_log AS apcl
                    LEFT JOIN
                audiobooks AS ab ON apcl.audiobook_id = ab.id
            WHERE 
            ab.publisher_id = ? AND
            apcl.audiobook_id IS not null;`;
            const result = await DB.query(sql, [publisherId]);

                        const sql2 = `SELECT 
                count(distinct apcl.user_id) as unique_paid_users
            FROM
                audiobook_play_count_log AS apcl
                    LEFT JOIN
                audiobooks AS ab ON apcl.audiobook_id = ab.id
            WHERE 
            ab.publisher_id = ? AND apcl.isSubscribedUser =1 AND apcl.isPremiumAudiobook =1 AND
            apcl.audiobook_id IS not null;`;
            const result2 = await DB.query(sql2, [publisherId]);

            const sql3 = `SELECT 
                count(distinct apcl.user_id) as unique_free_users
            FROM
                audiobook_play_count_log AS apcl
                    LEFT JOIN
                audiobooks AS ab ON apcl.audiobook_id = ab.id
            WHERE 
            ab.publisher_id = ? AND apcl.isSubscribedUser = 0 AND
            apcl.audiobook_id IS not null;`;
            const result3 = await DB.query(sql3, [publisherId]);


            //     const sql31 = `SELECT 
            //     COUNT(apcl.id) AS android
            // FROM
            //     audiobook_play_count_log AS apcl
            //     LEFT JOIN
            //     episodes AS ep ON apcl.episode_id = ep.id
            //         LEFT JOIN
            //     audiobooks AS ab ON ep.audiobook_id = ab.id
            // WHERE 
            // ab.publisher_id = ? AND apcl.episode_id IS Not Null AND apcl.from_channel != 'android' AND apcl.from_channel != 'web';`;
            //     const result31 = await DB.query(sql31, [publisherId]);

            //     const sql4 = `SELECT 
            //     COUNT(apcl.id) AS total_played
            // FROM 
            //     audiobook_play_count_log AS apcl
            //     LEFT JOIN
            //     episodes AS ep ON apcl.episode_id = ep.id
            //         LEFT JOIN
            //     audiobooks AS ab ON ep.audiobook_id = ab.id
            // WHERE 
            // ab.publisher_id = ? AND apcl.episode_id IS Not Null and (apcl.audiobook_id IN (Select ab.id from audiobooks as ab where ab.price = 0 and ab.deleted = 0)
            // OR apcl.episode_id IN (Select ep.id from episodes ep WHERE ep.audiobook_id IN (Select ab.id from audiobooks as ab where ab.price = 0 and ab.deleted = 0)));`;
            //     const result4 = await DB.query(sql4, [publisherId]);

            //     const sql5 = `SELECT 
            //     COUNT(apcl.id) AS total_played
            // FROM
            //     audiobook_play_count_log AS apcl
            //     LEFT JOIN
            //     episodes AS ep ON apcl.episode_id = ep.id
            //         LEFT JOIN
            //     audiobooks AS ab ON ep.audiobook_id = ab.id
            // WHERE 
            // ab.publisher_id = ? AND apcl.episode_id IS Not Null and (apcl.audiobook_id IN (Select ab.id from audiobooks as ab where ab.price != 0 and ab.deleted = 0)
            //         OR apcl.episode_id IN (Select ep.id from episodes ep WHERE ep.audiobook_id IN (Select ab.id from audiobooks as ab where ab.price != 0 and ab.deleted = 0)));`;
            //     const result5 = await DB.query(sql5, [publisherId]);
            if (result) {
                return {
                    "unique_users": "" + result[0].unique_users,
                    "unique_paid_users": "" + result2[0].unique_paid_users,
                    "unique_free_users": "" + result3[0].unique_free_users
                }
            }
            return undefined;

        } catch (e) {
            console.log(e)
            coreUtils.printStringify(e);
            LoggerError.log(e)
            return undefined;
        }
    }

    getAgentsAudiobookSummaryYesterday = async (req) => {
        var publisherId = req.query.publisherId

                try {
            const sql = `SELECT 
                COUNT(apcl.id) AS total_played
            FROM
                audiobook_play_count_log AS apcl
                    LEFT JOIN
                episodes AS ep ON apcl.episode_id = ep.id
                    LEFT JOIN
                audiobooks AS ab ON ep.audiobook_id = ab.id
            WHERE 
            ab.publisher_id = ? AND
            apcl.episode_id IS Not Null AND
            (DATE_FORMAT(CONVERT_TZ(apcl.created_at, '+00:00', '+6:00'),
            '%Y%m%d') = DATE_FORMAT(CONVERT_TZ(SUBDATE(NOW(), 1), '+00:00', '+6:00'),
            '%Y%m%d'));`;
            const result = await DB.query(sql, [publisherId]);
            const sql2 = `SELECT 
                COUNT(apcl.id) AS web
            FROM
                audiobook_play_count_log AS apcl
                LEFT JOIN
                episodes AS ep ON apcl.episode_id = ep.id
                    LEFT JOIN
                audiobooks AS ab ON ep.audiobook_id = ab.id
            WHERE 
            ab.publisher_id = ? AND apcl.episode_id IS Not Null and
            (DATE_FORMAT(CONVERT_TZ(apcl.created_at, '+00:00', '+6:00'),
            '%Y%m%d') = DATE_FORMAT(CONVERT_TZ(SUBDATE(NOW(), 1), '+00:00', '+6:00'),
            '%Y%m%d')) AND apcl.from_channel = 'web';`;
            const result2 = await DB.query(sql2, [publisherId]);

            const sql3 = `SELECT 
                COUNT(apcl.id) AS android
            FROM
                audiobook_play_count_log AS apcl
                LEFT JOIN
                episodes AS ep ON apcl.episode_id = ep.id
                    LEFT JOIN
                audiobooks AS ab ON ep.audiobook_id = ab.id
            WHERE 
            ab.publisher_id = ? AND apcl.episode_id IS Not Null and
            (DATE_FORMAT(CONVERT_TZ(apcl.created_at, '+00:00', '+6:00'),
            '%Y%m%d') = DATE_FORMAT(CONVERT_TZ(SUBDATE(NOW(), 1), '+00:00', '+6:00'),
            '%Y%m%d')) AND apcl.from_channel = 'android';`;
            const result3 = await DB.query(sql3, [publisherId]);


            const sql31 = `SELECT 
                COUNT(apcl.id) AS android
            FROM
                audiobook_play_count_log AS apcl
                LEFT JOIN
                episodes AS ep ON apcl.episode_id = ep.id
                    LEFT JOIN
                audiobooks AS ab ON ep.audiobook_id = ab.id
            WHERE 
            ab.publisher_id = ? AND apcl.episode_id IS Not Null and
            (DATE_FORMAT(CONVERT_TZ(apcl.created_at, '+00:00', '+6:00'),
            '%Y%m%d') = DATE_FORMAT(CONVERT_TZ(SUBDATE(NOW(), 1), '+00:00', '+6:00'),
            '%Y%m%d')) AND apcl.from_channel != 'android' AND apcl.from_channel != 'web';`;
            const result31 = await DB.query(sql31, [publisherId]);

            const sql4 = `SELECT 
                COUNT(apcl.id) AS total_played
            FROM 
                audiobook_play_count_log AS apcl
                LEFT JOIN
                episodes AS ep ON apcl.episode_id = ep.id
                    LEFT JOIN
                audiobooks AS ab ON ep.audiobook_id = ab.id
            WHERE 
            ab.publisher_id = ? AND apcl.episode_id IS Not Null and (apcl.audiobook_id IN (Select ab.id from audiobooks as ab where ab.price = 0 and ab.deleted = 0)
            OR apcl.episode_id IN (Select ep.id from episodes ep WHERE ep.audiobook_id IN (Select ab.id from audiobooks as ab where ab.price = 0 and ab.deleted = 0))) AND
            (DATE_FORMAT(CONVERT_TZ(apcl.created_at, '+00:00', '+6:00'),
            '%Y%m%d') = DATE_FORMAT(CONVERT_TZ(SUBDATE(NOW(), 1), '+00:00', '+6:00'),
            '%Y%m%d'));`;
            const result4 = await DB.query(sql4, [publisherId]);

            const sql5 = `SELECT 
                COUNT(apcl.id) AS total_played
            FROM
                audiobook_play_count_log AS apcl
                LEFT JOIN
                episodes AS ep ON apcl.episode_id = ep.id
                    LEFT JOIN
                audiobooks AS ab ON ep.audiobook_id = ab.id
            WHERE 
            ab.publisher_id = ? AND apcl.episode_id IS Not Null and (apcl.audiobook_id IN (Select ab.id from audiobooks as ab where ab.price != 0 and ab.deleted = 0)
                    OR apcl.episode_id IN (Select ep.id from episodes ep WHERE ep.audiobook_id IN (Select ab.id from audiobooks as ab where ab.price != 0 and ab.deleted = 0))) AND
                    (DATE_FORMAT(CONVERT_TZ(apcl.created_at, '+00:00', '+6:00'),
                    '%Y%m%d') = DATE_FORMAT(CONVERT_TZ(SUBDATE(NOW(), 1), '+00:00', '+6:00'),
                    '%Y%m%d'));`;
            const result5 = await DB.query(sql5, [publisherId]);
            if (result) {
                return {
                    "total_played": "" + result[0].total_played,
                    "web": "" + result2[0].web,
                    "android": "" + result3[0].android,
                    "not_defined": "" + result31[0].not_defined,
                    "free": "" + result4[0].total_played,
                    "paid": "" + result5[0].total_played
                }
            }
            return undefined;

        } catch (e) {
            console.log(e)
            coreUtils.printStringify(e);
            LoggerError.log(e)
            return undefined;
        }
    }

    getAdminPublishserId = async (adminId) => {
        const sql = 'SELECT id FROM publishers WHERE admin_id = ?';
        try {
            const results = await DB.query(sql, adminId);
            if (results) {
                // sp returns extra data 2d array, need the first one
                //console.log(results)
                return results[0];
            }
            return undefined;
        }
        catch (e) {
            LoggerError.log(e)
            return undefined;
        }
    }

    delete = async (
        id
    ) => {
        const sql = 'CALL delete_entity_soft(?, ?)';
        try {
            const results = await DB.query(sql, [id, this.tableName]);
            if (results) {
                // sp returns extra data 2d array, need the first one
                return results[0][0];
            }
            return undefined;
        }
        catch (e) {
            LoggerError.log(e)
            return undefined;
        }
    }
}

module.exports = new AgentModel;