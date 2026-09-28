const DB = require('../db');

class RewardModel {


  generateRedeem(length) {
    var result = "";
    var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    var charactersLength = characters.length;
    for (var i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    // var setResult = "Kabbik-" + result;
    return result;
  }


  async getAllTierReward(req) {
    const rewardSql = `
    SELECT 
      tr.id AS tier_id,
      tr.name AS tier_name,
      tr.min_point,
      tr.max_point,
      td.id AS reward_id, 
      td.tier_id, 
      td.title,
       td.icon_path,
	td.icon_path2,
        td.offer_id,
         td.offer_title,
           td.description, 
           td.user_info_screen_title, 
           td.after_claim_expire_in_day,
           td.required_user_info_input_field, 
           td.reward_type,
            td.greeting_message, 
            td.required_point
    FROM tier AS tr
    JOIN tier_reward AS td ON tr.id = td.tier_id
    ORDER BY tr.min_point ASC, td.required_point ASC;
  `;

    try {
      const tierRewardList = await DB.query(rewardSql); // assuming this returns an array

      // Use a Map to keep track of tiers and preserve order
      const tierMap = new Map();

      for (const row of tierRewardList) {
        if (!tierMap.has(row.tier_id)) {
          tierMap.set(row.tier_id, {
            id: row.tier_id,
            name: row.tier_name,
            min_point: row.min_point,
            max_point: row.max_point,
            rewards: []
          });
        }

        tierMap.get(row.tier_id).rewards.push({
          id: row.reward_id,
          title: row.title,
          icon_path: row.icon_path,
          icon_path2: row.icon_path2,
          required_point: row.required_point,
          offer_id: row.offer_id,
          offer_title: row.offer_title,
          description: row.description,
          user_info_screen_title: row.user_info_screen_title,
          after_claim_expire_in_day: row.after_claim_expire_in_day,
          required_user_info_input_field: JSON.parse(row.required_user_info_input_field),
          reward_type: row.reward_type,
          greeting_message: row.greeting_message,
          required_point: row.required_point

        });
      }

      // Convert Map values to array
      const data = Array.from(tierMap.values());

      return {
        success: true,
        message: "Successful",
        data: data
      };

    } catch (e) {
      console.log("Error:", e);
      return {
        success: false,
        message: "Something went wrong",
        data: []
      };
    }
  }


  async getUserRewardProfile(req) {
    const userId = req.query.userId;

    if (!userId) {
      return {
        status: false,
        message: "user not found"
      };
    }

    const userCurrentTierSql = `
    SELECT tr.id AS tier_id, tr.name, tr.min_point, tr.max_point, tu.user_id, us.full_name as user_name, 
           tu.acquired_point AS user_acquired_point, tu.balance_point AS user_balance_point
    FROM tier_user_current_tier AS tu 
    JOIN tier AS tr ON tu.tier_id = tr.id 
    JOIN users AS us ON us.id = tu.user_id
    WHERE us.id = ? 
    LIMIT 1;
  `;

    const fetchFeatureSql = `
    SELECT tp.leading_icon,tp.leading_icon2, tp.title, tp.trailing_title, tp.type_reward, tp.trailing_icon,
           tp.is_child_exsits, tp.child_limit, tp.goto_page 
    FROM tier_profile_feature AS tp 
    WHERE status = 1 order by priority;
  `;

    const rewardSql = `
    SELECT td.id, td.tier_id, td.title, td.after_claim_expire_in_day, td.icon_path,td.icon_path2, td.offer_id, td.offer_title,
           td.description, td.user_info_screen_title, td.required_user_info_input_field, 
           td.reward_type, td.greeting_message, td.required_point
    FROM tier_reward td 
    WHERE td.tier_id = ? 
    LIMIT ?;
  `;

    const taskSql = `
    SELECT tsk.id AS taskId, leading_icon,leading_icon2, tsk.title, tsk.point 
    FROM tier_point_earning_task AS tsk 
    WHERE tsk.status = 1 
    LIMIT ?;
  `;

    try {
      var userTierRes = await DB.query(userCurrentTierSql, [userId]);

      if (userTierRes.length === 0) {
        const insertDefaultTier = `
          INSERT INTO tier_user_current_tier (user_id, tier_id, acquired_point, balance_point)
          VALUES (?, ?, ?, ?)
        `;
        const insertEarnLog = `INSERT INTO tier_user_point_earn_log (user_id, task_id, point, ui_additional_info) 
                               VALUES (?, ?, ?, ?)`;

        await Promise.all([
          DB.query(insertDefaultTier, [userId, 1, 10, 10]),
          DB.query(insertEarnLog, [userId, 17, 10, JSON.stringify({ "title": "অভিনন্দন! লগইন করার জন্য আপনি ১০ পয়েন্ট পেয়েছেন।" })])
        ]);

        userTierRes = await DB.query(userCurrentTierSql, [userId]);
      }

      if (!userTierRes || userTierRes.length === 0) {

        return {
          status: false,
          message: "user tier not found"
        };

      }


      const userTier = userTierRes[0];
      const featureList = await DB.query(fetchFeatureSql);

      const result = {
        user_tier: userTier,
        featureList: []
      };

      for (const item of featureList) {
        item.is_child_exsits = item.is_child_exsits === 1 ? true : false;

        const feature = { ...item, items: [] };
        if (item.is_child_exsits) {
          if (item.type_reward === "reward") {
            const rewardItems = await DB.query(rewardSql, [userTier.tier_id, item.child_limit]);

            feature.items = rewardItems.map(reward => {
              if (typeof reward.required_user_info_input_field === 'string') {
                try {
                  reward.required_user_info_input_field = JSON.parse(reward.required_user_info_input_field);
                } catch (err) {
                  console.warn(`Failed to parse user_info_input_field for reward ID ${reward.reward_id}`);
                  reward.required_user_info_input_field = [];
                }
              }
              return reward;
            });

          } else if (item.type_reward === "task") {
            const taskItems = await DB.query(taskSql, [item.child_limit]);
            feature.items = taskItems;
          }
        }

        result.featureList.push(feature);
      }

      return {
        success: true,
        message: "Successful",
        data: result
      };

    } catch (e) {
      console.error("Error in getUserRewardProfile:", e);
      return {
        success: false,
        message: "Something went wrong",
        data: []
      };
    }
  }



  async insertEarningPoint(userId, taskId, details) {
    try {
      if (!userId || !taskId)
        return {
          success: false,
          message: "Task not found"
        };
      const insertSql = ` CALL tier_insert_earning_point(?, ?, ?)`;
      await DB.query(insertSql, [userId, taskId, details]);

      //       const findTask = `SELECT * from tier_point_earning_task where id = ? limit 1`;
      //       const task = await DB.query(findTask, [taskId]);
      //       if (!task || task.length === 0) {
      //         return {
      //           success: false,
      //           message: "Task not found"
      //         };
      //       }
      //       // 1. Insert earning log
      //       await DB.query(`
      //         INSERT INTO tier_user_point_earn_log (user_id, task_id, point, ui_additional_info)
      //         VALUES (?, ?, ?, ?)
      //       `, [userId, task[0].id, task[0].point, details]);

      //       // 2. Get current user tier (if any)
      //       const currentTierRows = await DB.query(`
      //         SELECT * FROM tier_user_current_tier WHERE user_id = ?
      //       `, [userId]);


      //       let newAquiredPoint = task[0].point;
      //       let newBalancePoint = task[0].point;
      //       if (currentTierRows.length > 0) {
      //         const current = currentTierRows[0];
      //         newAquiredPoint += current.acquired_point;
      //         newBalancePoint += current.balance_point;
      //       }

      //       // 3. Find appropriate tier
      //       const tierRows = await DB.query(`
      //   SELECT id FROM tier
      //   WHERE min_point <= ? AND max_point >= ?
      //   ORDER BY min_point DESC
      //   LIMIT 1
      // `, [newAquiredPoint, newAquiredPoint]);

      //       const newTierId = tierRows.length ? tierRows[0].id : null;
      //       if (!newTierId) {
      //         console.warn(`No matching tier for point total: ${newAquiredPoint}`);
      //         return false;
      //       }

      //       // 4. Update or Insert current tier
      //       if (currentTierRows.length > 0) {
      //         await DB.query(`
      //           UPDATE tier_user_current_tier
      //           SET acquired_point = ?, balance_point = ?, tier_id = ?
      //           WHERE user_id = ?
      //         `, [newAquiredPoint, newBalancePoint, newTierId, userId]);
      //       } else {
      //         await DB.query(`
      //           INSERT INTO tier_user_current_tier (user_id, tier_id, acquired_point, balance_point)
      //           VALUES (?, ?, ?, ?)
      //         `, [userId, newTierId, newAquiredPoint, newBalancePoint]);
      //       }

      //       return true;
      //     } catch (error) {
      //       console.error("Error inserting earning point for user:", userId, error);
      //       return false;
      //     }
      //   }


      //   async claimReward(req) {

      //     const user_id = req.body.userId;
      //     const tier_id = req.body.tierId;
      //     const reward_id = req.body.rewardId;

      //     try {

      //       // Step 1: Fetch reward
      //       const findRewardSql = `SELECT * FROM tier_reward WHERE id = ? LIMIT 1`;
      //       const rewardRows = await DB.query(findRewardSql, [reward_id]);

      //       if (!rewardRows || rewardRows.length === 0) {
      //         return {
      //           success: false,
      //           message: "Reward not found"
      //         };
      //       }

      //       const reward = rewardRows[0];
      //       let redeemCode = null;
      //       let packName;

      //       // Step 2: Check user balance
      //       const checkUserBalance = `SELECT * FROM tier_user_current_tier WHERE user_id = ? LIMIT 1`;
      //       const userCurrentTier = await DB.query(checkUserBalance, [user_id]);

      //       if (!userCurrentTier || userCurrentTier.length === 0) {
      //         return {
      //           success: false,
      //           message: "User tier data not found"
      //         };
      //       }

      //       if (userCurrentTier[0].balance_point < reward.required_point) {
      //         return {
      //           success: false,
      //           message: "Insufficient Balance Point"
      //         };
      //       }

      //       // Step 3: Generate redeem code if needed
      //       if (reward.reward_type === "redeem" && reward.offer_id != null) {
      //         redeemCode = this.generateRedeem(6);

      //          packName =
      //           reward.offer_id === 1 ? "Monthly" :
      //             reward.offer_id === 2 ? "Half Yearly" :
      //               reward.offer_id === 3 ? "Yearly" :
      //                 reward.offer_id === 4 ? "Daily" : "";

      //         if(reward.greeting_message != null){
      //             reward.greeting_message = `${reward.greeting_message} ${redeemCode}`;
      //         }

      //       }

      //       // Step 4: Subtract user's current balance with safety check
      //       const updateBalanceSql = `
      //         UPDATE tier_user_current_tier
      //         SET balance_point = balance_point - ?
      //         WHERE user_id = ?
      //       `;

      //       await DB.query(updateBalanceSql, [
      //         reward.required_point,
      //         user_id
      //       ]);


      //       // Step 5: Log reward claim
      //       const insertClaimRewardSql = `
      //         INSERT INTO tier_user_reward_claim_log (
      //           user_id, is_used, tier_id, reward_id, offer, user_additional_info, usage_point, expire_at
      //         ) VALUES (?, ?, ?, ?, ?, ?, ?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? DAY))
      //       `;
      //       const offerText = reward.offer_title
      //         ? `${reward.offer_title}${redeemCode ? `: ${redeemCode}` : ''}`
      //         : null;

      //       const claimLogRes = await DB.query(insertClaimRewardSql, [
      //         user_id,
      //         reward.instant_active,
      //         tier_id,
      //         reward_id,
      //         offerText,
      //         JSON.stringify(req.body.user_additional_info),
      //         reward.required_point,
      //         reward.after_claim_expire_in_day,
      //       ]);

      //       if(redeemCode){
      //         const insertRedeemSql = `
      //           INSERT INTO redeem (code, isActive, package_name, package, generated_source, generated_source_id)
      //           VALUES (?, ?, ?, ?, ?, ?)
      //         `;

      //           await DB.query(insertRedeemSql, [redeemCode, 1, packName, reward.offer_id, "user_claim", claimLogRes.insertId]);
      //       }

      return {
        success: true,
        message: reward.greeting_message || "Reward claimed successfully",
        redeemCode: redeemCode || null
      };

    } catch (e) {

      return {
        success: false,
        message: `Transaction failed: ${e.message || e}`
      };
    }

  }


  async claimReward(req) {

    const user_id = req.body.userId;
    const tier_id = req.body.tierId;
    const reward_id = req.body.rewardId;

    try {

      // Step 1: Fetch reward
      const findRewardSql = `SELECT * FROM tier_reward WHERE id = ? LIMIT 1`;
      const rewardRows = await DB.query(findRewardSql, [reward_id]);

      if (!rewardRows || rewardRows.length === 0) {
        return {
          success: false,
          message: "Reward not found"
        };
      }

      const reward = rewardRows[0];
      let redeemCode = null;
      let packName;

      // Step 2: Check user balance
      const checkUserBalance = `SELECT * FROM tier_user_current_tier WHERE user_id = ? LIMIT 1`;
      const userCurrentTier = await DB.query(checkUserBalance, [user_id]);

      if (!userCurrentTier || userCurrentTier.length === 0) {
        return {
          success: false,
          message: "User tier data not found"
        };
      }

      if (userCurrentTier[0].balance_point < reward.required_point) {
        return {
          success: false,
          message: "Insufficient Balance Point"
        };
      }

      // Step 3: Generate redeem code if needed
      if (reward.reward_type === "redeem" && reward.offer_id != null) {
        redeemCode = this.generateRedeem(6);

        packName =
          reward.offer_id === 1 ? "Monthly" :
            reward.offer_id === 2 ? "Half Yearly" :
              reward.offer_id === 3 ? "Yearly" :
                reward.offer_id === 4 ? "Daily" : "";

        if (reward.greeting_message != null) {
          reward.greeting_message = `${reward.greeting_message} ${redeemCode}`;
        }

      }

      // Step 4: Subtract user's current balance with safety check
      const updateBalanceSql = `
        UPDATE tier_user_current_tier
        SET balance_point = balance_point - ?
        WHERE user_id = ?
      `;

      await DB.query(updateBalanceSql, [
        reward.required_point,
        user_id
      ]);


      // Step 5: Log reward claim
      const insertClaimRewardSql = `
        INSERT INTO tier_user_reward_claim_log (
          user_id, is_used, tier_id, reward_id, offer, user_additional_info, usage_point, expire_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? DAY))
      `;
      const offerText = reward.offer_title
        ? `${reward.offer_title}${redeemCode ? `: ${redeemCode}` : ''}`
        : null;

      const claimLogRes = await DB.query(insertClaimRewardSql, [
        user_id,
        reward.instant_active,
        tier_id,
        reward_id,
        offerText,
        JSON.stringify(req.body.user_additional_info),
        reward.required_point,
        reward.after_claim_expire_in_day,
      ]);

      if (redeemCode) {
        const insertRedeemSql = `
          INSERT INTO redeem (code, isActive, package_name, package, generated_source, generated_source_id)
          VALUES (?, ?, ?, ?, ?, ?)
        `;

        await DB.query(insertRedeemSql, [redeemCode, 1, packName, reward.offer_id, "user_claim", claimLogRes.insertId]);
      }

      return {
        success: true,
        message: reward.greeting_message || "Reward claimed successfully",
        redeemCode: redeemCode || null
      };

    } catch (e) {
      console.log("Transaction", e)

      return {
        success: false,
        message: `Transaction failed: ${e.message || e}`
      };
    }

  }



  async getRewardFaq(req) {
    try {
      const faqSql = `Select question, answer from tier_reward_faq Where status = 1;`;

      const res = await DB.query(faqSql);

      return {
        success: true,
        message: "Faq fetch successful",
        data: res
      }
    }
    catch (e) {

      return {
        success: false,
        message: "Some thing went wrong",
        data: res
      }

    }
  }

  async getAllTask(req) {
    try {

      const taskSql = `
    SELECT tsk.id AS taskId, leading_icon,leading_icon2, tsk.title, tsk.point 
    FROM tier_point_earning_task AS tsk 
    WHERE tsk.status = 1 `;

      const res = await DB.query(taskSql);

      return {
        success: true,
        message: "Task fetch successful",
        data: res
      }
    }
    catch (e) {

      return {
        success: false,
        message: "Some thing went wrong",
        data: res
      }

    }
  }
  async pointDetails(req) {
    try {
      const userId = req.query.userId;
      const type = req.query.type;

      const page = parseInt(req.query.page || '1');
      const limit = parseInt(req.query.limit || '14');
      const offset = (page - 1) * limit;

      const earnPointDetailsSql = `SELECT * FROM tier_user_point_earn_log WHERE user_id = ? And status = 1  ORDER BY id DESC LIMIT ? OFFSET ?`;
      const usagePointDetailsSql = `
SELECT rd.title AS reward_title, cl.usage_point, cl.offer, cl.is_used, cl.expire_at < NOW() AS is_expired, CASE 
    WHEN cl.expire_at >= NOW() THEN DATEDIFF(cl.expire_at, NOW())
    ELSE 0
  END AS remaining_days, cl.created_at 
FROM tier_user_reward_claim_log AS cl JOIN tier_reward AS rd ON cl.reward_id = rd.id
 WHERE user_id = ?  And status = 1 ORDER BY cl.id DESC LIMIT ? OFFSET ?`;

      if (!userId || (type !== 'earned' && type !== 'used')) {
        return {
          success: false,
          message: "userId or type not found",
        };
      }

      const query = type === 'earned' ? earnPointDetailsSql : usagePointDetailsSql;
      const result = await DB.query(query, [userId, limit, offset]);

      const parsedResult =
        type === 'earned'
          ? result.map(row => {
            if (row.ui_additional_info && typeof row.ui_additional_info === 'string') {
              try {
                row.ui_additional_info = JSON.parse(row.ui_additional_info);
              } catch {
                row.ui_additional_info = null;
              }
            }
            return row;
          })
          : result;

      return {
        success: true,
        data: parsedResult,
      };
    } catch (e) {
      console.error("Error in pointDetails:", e);
      return {
        success: false,
        message: "Something went wrong",
      };
    }
  }



}

module.exports = new RewardModel();


