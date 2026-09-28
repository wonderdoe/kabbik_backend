const QuizModel = require('../data/models/quiz-model');

// const QuizModel = require('../models/quiz.model');


class QuizController {

    // -----------------------------------------------------------------
    // match_for_quiz
    // -----------------------------------------------------------------

    createMatch = async (req, res) => {
        const {
            country1,
            country2,
            flag1,
            flag2,
            group_info,
            quiz_starts_at,
            quiz_duration,
            match_starts,
            match_ends,
            isActive,
            timezone,
            matchNo,
            banner,
        } = req.body;

        if (!country1 || !country2 || !quiz_starts_at || !match_starts || !match_ends) {
            return res.status(400).json({
                message: 'country1, country2, quiz_starts_at, match_starts and match_ends are required'
            });
        }

        try {
            const id = await QuizModel.createMatch({
                country1,
                country2,
                flag1,
                flag2,
                group_info,
                quiz_starts_at,
                quiz_duration,
                match_starts,
                match_ends,
                isActive,
                timezone,
                banner,
                matchNo
            });

            if (!id) {
                return res.status(400).json({ message: 'Could not create match' });
            }
            return res.status(201).json({ id });
        }
        catch (e) {
            // Timezone / datetime parse errors bubble up here
            return res.status(400).json({ message: e.message || 'Could not create match' });
        }
    };

    updateMatch = async (req, res) => {
        try {
            const rowCount = await QuizModel.updateMatch(req.params.id, req.body);
            if (!rowCount) {
                return res.status(404).json({ message: 'Match not found or no changes applied' });
            }
            return res.status(200).json({ success: true });
        }
        catch (e) {
            return res.status(400).json({ message: e.message || 'Could not update match' });
        }
    };

    deleteMatch = async (req, res) => {
        const rowCount = await QuizModel.deleteMatch(req.params.id);
        if (!rowCount) {
            return res.status(404).json({ message: 'Match not found' });
        }
        return res.status(200).json({ success: true });
    };

    separateMatchesByDay(matches) {
        const now = new Date();
      
        // Get today's date string in BD time (UTC+6)
        const toDateStringBD = (date) =>
          date.toLocaleDateString("en-CA", { timeZone: "Asia/Dhaka" }); // "YYYY-MM-DD"
      
        const todayBD = toDateStringBD(now);
        const tomorrowBD = toDateStringBD(new Date(now.getTime() + 86400000));
      
        const todayMatches = [];
        const tomorrowMatches = [];
      
        for (const match of matches) {
          const matchDateBD = toDateStringBD(new Date(match.match_starts));
          if (matchDateBD === todayBD) todayMatches.push(match);
          else if (matchDateBD === tomorrowBD) tomorrowMatches.push(match);
        }
      
        return { todayMatches, tomorrowMatches };
      }

    getMatches = async (req, res) => {
        const userId = req.query.userId;
        const data = await QuizModel.getMatches(userId);
        // let findalData = this.separateMatchesByDay(data);
        // return res.status(200).json({ data:findalData?.todayMatches,nextMatchData:data?.tomorrowMatches });
        return res.status(200).json({ data,gpFailedMessage:"Please try with other payment gateway", gpFailedTitle:"Payment Failed" });
    };

    getPrevMatches = async (req, res) => {
        const data = await QuizModel.getPrevMatches();

        return res.status(200).json({ data });
    };

    getMatchDetails = async (req, res) => {
        const data = await QuizModel.getMatchById(req.params.id);
        if (!data) {
            return res.status(404).json({ message: 'Match not found' });
        }
        return res.status(200).json(data);
    };

    // -----------------------------------------------------------------
    // quiz_questions
    // -----------------------------------------------------------------

    createQuestion = async (req, res) => {
        const {
            match_id,
            question,
            option_1,
            option_2,
            option_3,
            option_4,
            answer,
            category
        } = req.body;

        if (!match_id || !question || !option_1 || !option_2 || !option_3 || !option_4 || answer === undefined) {
            return res.status(400).json({
                message: 'match_id, question, option_1, option_2, option_3, option_4 and answer are required'
            });
        }

        const id = await QuizModel.createQuestion({
            match_id,
            question,
            option_1,
            option_2,
            option_3,
            option_4,
            answer,
            category
        });

        if (!id) {
            return res.status(400).json({ message: 'Could not create question' });
        }
        return res.status(201).json({ id });
    };

    updateQuestion = async (req, res) => {
        const rowCount = await QuizModel.updateQuestion(req.params.id, req.body);
        if (!rowCount) {
            return res.status(404).json({ message: 'Question not found or no changes applied' });
        }
        return res.status(200).json({ success: true });
    };

    deleteQuestion = async (req, res) => {
        const rowCount = await QuizModel.deleteQuestion(req.params.id);
        if (!rowCount) {
            return res.status(404).json({ message: 'Question not found' });
        }
        return res.status(200).json({ success: true });
    };

    getQuestionDetails = async (req, res) => {
        const includeCorrectAnswer = req.query.include_correct_answer === 'true';
        const data = await QuizModel.getQuestionById(req.params.id, includeCorrectAnswer);
        if (!data) {
            return res.status(404).json({ message: 'Question not found' });
        }
        return res.status(200).json(data);
    };

    getMatchQuestions = async (req, res) => {
        const data = await QuizModel.getQuestionsByMatchId(req.params.match_id, false);
        return res.status(200).json({ data });
    };

    getMatchQuestionsForAdmin = async (req, res) => {
        const data = await QuizModel.getQuestionsByMatchId(req.params.match_id, true);
        return res.status(200).json({ data });
    };

    // -----------------------------------------------------------------
    // quiz_access
    // -----------------------------------------------------------------

    createAccess = async (req, res) => {
        const { user_id, access_date } = req.body;
        if (!user_id || !access_date) {
            return res.status(400).json({ message: 'user_id and access_date are required' });
        }

        const id = await QuizModel.grantAccess({ user_id, access_date });
        if (!id) {
            return res.status(400).json({ message: 'Could not save access' });
        }
        return res.status(201).json({ id });
    };

    getAccessByUserAndDate = async (req, res) => {
        const { user_id, access_date } = req.query;
        if (!user_id || !access_date) {
            return res.status(400).json({ message: 'user_id and access_date are required' });
        }
        const data = await QuizModel.getAccessByUserAndDate(user_id, access_date);
        if (!data) {
            return res.status(404).json({ message: 'Access not found' });
        }
        return res.status(200).json(data);
    };

    // -----------------------------------------------------------------
    // Quiz join / submit
    // -----------------------------------------------------------------

    joinQuiz = async (req, res) => {
        const { user_id, match_id, timezone } = req.body;
        let user = req?.user?.user_id;
                if (!user || !match_id) {
            return res.status(400).json({ message: 'user_id and match_id are required' });
        }

        const result = await QuizModel.joinQuiz({ user_id:Number(user), match_id, timezone });
        if (!result.success) {
            return res.status(result.statusCode).json({ message: result.message });
        }
        return res.status(200).json(result.data);
    };

    submitQuiz = async (req, res) => {
        const { user_id, match_id, answers, timezone, time_used_sec_to_submit } = req.body;
        let user = req?.user?.user_id;

        if (!user || !match_id || !Array.isArray(answers)) {
            return res.status(400).json({ message: 'user_id, match_id and answers are required' });
        }

        const result = await QuizModel.submitQuiz({
            user_id:user,
            match_id,
            answers,
            timezone,
            time_used_sec_to_submit
        });

        if (!result.success) {
            return res.status(result.statusCode).json({ message: result.message });
        }
        return res.status(200).json(result.data);
    };

    // -----------------------------------------------------------------
    // Results / leaderboards
    // -----------------------------------------------------------------

    getResultByUserAndMatch = async (req, res) => {
        const { user_id, match_id } = req.query;
        if (!user_id || !match_id) {
            return res.status(400).json({ message: 'user_id and match_id are required' });
        }
        const data = await QuizModel.getResultByUserAndMatch(user_id, match_id);
        if (!data) {
            return res.status(404).json({ message: 'Result not found' });
        }
        return res.status(200).json(data);
    };

    getMatchwiseWinners = async (req, res) => {
        const matchId = req.query.match_id ? parseInt(req.query.match_id, 10) : null;
        const limit = parseInt(req.query.limit, 10) || 100;
        const winners = await QuizModel.getMatchwiseWinners({ matchId, limit });
        return res.status(200).json({ winners });
    };
 
    getDayWinners = async (req, res) => {
        if (!req.params.date) {
            return res.status(400).json({ message: 'date is required' });
        }
        const limit = parseInt(req.query.limit, 10) || 10;
        const winners = await QuizModel.getDayWinners(req.params.date, limit);
        return res.status(200).json({
            date: req.params.date,
            winners
        });
    };
}

// module.exports = new QuizController;

module.exports = new QuizController;