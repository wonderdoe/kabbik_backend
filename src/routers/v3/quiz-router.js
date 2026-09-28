const express = require('express');
const router = express.Router();
const QuizController = require('../../controllers/quiz-controller');
const authorize = require('../../middlewares/auth-middleware');

router.post('/matches', authorize, QuizController.createMatch);
router.put('/matches/:id', authorize, QuizController.updateMatch);
router.delete('/matches/:id', authorize, QuizController.deleteMatch);
router.get('/matches', authorize, QuizController.getMatches);
router.get('/prev-matches', authorize, QuizController.getPrevMatches);
router.get('/matches/:id', authorize, QuizController.getMatchDetails);

router.post('/questions', authorize, QuizController.createQuestion);
router.put('/questions/:id', authorize, QuizController.updateQuestion);
router.delete('/questions/:id', authorize, QuizController.deleteQuestion);
router.get('/questions/:id', authorize, QuizController.getQuestionDetails);
router.get('/matches/:match_id/questions', authorize, QuizController.getMatchQuestions);
router.get('/admin/matches/:match_id/questions', authorize, QuizController.getMatchQuestionsForAdmin);

router.post('/access', authorize, QuizController.createAccess);
router.get('/access', authorize, QuizController.getAccessByUserAndDate);

router.post('/join', authorize, QuizController.joinQuiz);
router.post('/submit', authorize, QuizController.submitQuiz);
router.get('/winners/day/:date', authorize, QuizController.getDayWinners);
router.get('/winners/matchwise', authorize, QuizController.getMatchwiseWinners);

// router.get('/match-joined', authorize, QuizController.getMatchwiseWinners);

module.exports = router;