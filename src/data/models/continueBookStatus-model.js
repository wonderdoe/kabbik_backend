const DB = require('../db');
const LoggerError = require('../../utils/logger-error');

class continueBookStatusModel {
    tableName = 'continueBookStatus';

    postBookListenStatus = async (req) => {
        try {
                       const data = req.body.data || [];

            const finished_at = new Date()
            .toISOString()
            .slice(0, 19)
            .replace('T', ' ');

            const filteredData = data
            .filter(item => item?.user_id && item?.bookId)
            .map(item => {
                const finished =
                item.total_listen_time >= item.total_duration ? 1 : 0;

                return [
                    Number(item.bookId),
                    Number(item.user_id),
                    Number(item.current_episode),
                    Number(item.total_duration) || 0,
                    Number(item.total_listen_time) || 0,
                    finished ? finished_at : null,
                    Number(item.current_timer || 0),
                    finished,
                ];
            });

            

        if (!filteredData.length){
            throw new Error('Error Occured')
        }

         const ListenInsertQuery = `
            INSERT INTO continueBookStatus  (
                book_id,
                user_id,
                current_episode,
                total_duration,
                total_listen_time,
                finished_at,
                current_timer,
                finished
            ) VALUES ?
            ON DUPLICATE KEY UPDATE 
                current_episode=VALUES(current_episode),
                total_listen_time=VALUES(total_listen_time),
                finished=VALUES(finished),
                finished_at=VALUES(finished_at),
                current_timer=VALUES(current_timer);
	    `;


            // let jsResult1;
                        const result = await DB.query(ListenInsertQuery, [filteredData]);
            

             if (result) {
                return {
                    "status": true,
                    "message": "Listen data created"
                };
            }
            return undefined;
        } catch (e) {
            console.log(e)
            LoggerError.log(e)
            return undefined;
        }
    }

    getUserWiseContinueData = async (req) => {

        try {
         const { userId } = req.params;
         let {limit=20,page=1}=req.query;
         let offset = (Number(page)-1)*Number(limit);

         console.log(userId,limit,offset)
         if(!userId){
            throw new error('user not found')
         }
         const UserWiseContinueDataSql = `
            SELECT  cbs.book_id,cbs.current_episode,cbs.current_timer,
                    LEAST(1,cbs.total_listen_time/cbs.total_duration) AS complete_percentage, 
                    ab.name AS book_name, ab.banner_path AS banner,ab.thumb_path AS book_cover,ab.contributing_artists ,ab.play_count,ab.author_name, ab.total_duration
            FROM continueBookStatus AS cbs 
            LEFT JOIN audiobooks AS ab ON ab.id =  cbs.book_id
            WHERE cbs.user_id= ? ORDER BY cbs.updated_at DESC LIMIT ? offset ? ;`;

        const totalCountSql = `
            SELECT COUNT(*) AS total_count FROM continueBookStatus WHERE user_id= ?;`;
            const totalCountResult = await DB.query(totalCountSql, [userId]);
            const totalCount = totalCountResult[0].total_count;
            // let jsResult1;
            const result = await DB.query(UserWiseContinueDataSql, [
                userId,
                Number(limit),
                offset
            ]);

             if (result) {
                return {
                    "status": true,
                    "message": "success",
                    data:result,
                    pagination:{
                        total:totalCount,
                        page:Number(page),
                        limit:Number(limit)
                    }
                };
            }
            return undefined;
        } catch (e) {
            console.log(e)
            LoggerError.log(e)
            return undefined;
        }
    }

    getBookCompletedData=async (req) => {

        try {
             
         const { userId } = req.params;

         const BookCompletedStatsSql = `
            SELECT 
            COUNT(*) AS total_book_finished,
            SUM(
                case when cbs.finished_at> NOW() - INTERVAL 1 DAY  then 1
                ELSE 0
                END 
            ) AS today_finished_count,
            SUM(
                case when cbs.finished_at> NOW()-INTERVAL 30 DAY then 1
                ELSE 0 
                END 
            )AS this_monthly_finished_count,
            SUM(
                case when cbs.finished_at > NOW() - INTERVAL 365 DAY then 1
                ELSE 0
                END 
            ) AS this_yearly_finished_count
            FROM continueBookStatus AS cbs WHERE cbs.user_id= ? AND cbs.finished = 1;`
        ;


            // let jsResult1;
            const result = await DB.query(BookCompletedStatsSql, [
                userId
            ]);

             if (result) {
                return {
                    "status": true,
                    "message": "course created",
                    data: result
                };
            }
            return undefined;
        } catch (e) {
            console.log(e)
            LoggerError.log(e)
            return undefined;
        }
    }

     
   

}

module.exports = new continueBookStatusModel;