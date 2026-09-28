const express = require('express');
const router = express.Router();
const AgentController = require('../../controllers/agent-controller');
const authorizeAgent = require('../../middlewares/auth-agent-middleware');
const authorizeAgentBook = require('../../middlewares/auth-publisherbook-middleware');
const authorizeAdmin = require('../../middlewares/auth-admin-middleware');
// router.put('/:id', authorizeAgent, AgentController.update)
// router.get('/', authorizeAdmin, AgentController.getAll)
// router.get('/blocklist', authorizeAdmin, AgentController.getBlockedAgent)
// router.get('/getAdminPublishserId/:id', AgentController.getAdminPublishserId);
// router.put('/status/update/:id', authorizeAdmin, AgentController.updateAgentStatus)


// router.post('/update-publishers', AgentController.updateAgents);
router.post('/add-subscription',authorizeAgent, AgentController.addSubscription);
router.post('/update-agent',authorizeAgent, AgentController.updateAgent);
router.get('/getCurrentAgent',authorizeAgent, AgentController.getCurrentAgent);
router.get('/agent-package-list', AgentController.getAgentPackageList);
// router.get('/get-publishers-byID', AgentController.getAgentsById);
router.get('/publishers-audiobooks', AgentController.getAgentsAudiobook);
router.get('/get-agent-subscribed-users',authorizeAgent, AgentController.getAgentSubscribedUsers);
router.get('/get-agent-subscription-report',authorizeAgent, AgentController.getAgentSubscriptionReport);
router.post('/check-users-subscription',authorizeAgent, AgentController.checkUsersSubscription);
// router.get('/publisherslist', AgentController.getAgentslist);
// router.get('/publishers-audiobooks-summary', authorizeAgentBook, AgentController.getAgentsAudiobookSummary);
// router.get('/publishers-paid-users-summary', AgentController.getAgentsPaidUsersSummary);
// router.get('/publishers-audiobooks-summary-today', authorizeAgentBook, AgentController.getAgentsAudiobookSummaryToday);
// router.get('/publishers-audiobooks-summary-yesterday', authorizeAgentBook, AgentController.getAgentsAudiobookSummaryYesterday);

module.exports = router;
