const express = require('express');
const router = express.Router();
const authorizeAdmin = require('../../middlewares/auth-admin-middleware');
const HomeController = require('../../controllers/home-controller');
const SessionController = require('../../controllers/session-controller');
const myblModel = require('../../data/models/mybl-model');
const NagadController = require('../../controllers/robi-controller');
const PodcastController = require('../../controllers/podcast-controller');
const PostController = require('../../controllers/post-controller');

const CRON_JOBS = [
  {
    key: 'home-truncate-otp',
    schedule: '0 4 1 * *',
    description: 'Truncate OTP table (monthly, 1st at 04:00)',
    run: () => HomeController.truncateOtp(),
  },
  {
    key: 'home-cache-app',
    schedule: '0 * * * *',
    description: 'Rebuild Kabbik app home cache (hourly at :00)',
    run: () => HomeController.CornJobgetHomeDataApp(),
  },
  {
    key: 'home-cache-mybl',
    schedule: '10 * * * *',
    description: 'Rebuild MyBL home cache (hourly at :10)',
    run: () => HomeController.CornJobgetHomeDataMybl(),
  },
  {
    key: 'home-cache-free',
    schedule: '20 * * * *',
    description: 'Rebuild free-tier home cache (hourly at :20)',
    run: () => HomeController.CornJobgetHomeDataAppHomeFree(),
  },
  {
    key: 'session-user-report',
    schedule: '38 0 * * *',
    description: 'Generate Kabbik user report (daily at 00:38)',
    run: () => SessionController.kabbikUserReportCron(),
  },
  {
    key: 'session-dashboard',
    schedule: '40 1 * * *',
    description: 'Refresh dashboard data (daily at 01:40)',
    run: () => SessionController.dashboardDataCornjob(),
  },
  {
    key: 'session-mybl-mail',
    schedule: '40 4 * * *',
    description: 'Send MyBL dashboard notification email (daily at 04:40)',
    run: () => SessionController.sendMyBlDashboardNotifyMail(),
  },
  {
    key: 'mybl-daily-report',
    schedule: '5 0 * * *',
    description: 'Generate MyBL daily report (daily at 00:05)',
    run: () => myblModel.generateDailyReportCorn(),
  },
  {
    key: 'robi-renew',
    schedule: '30 16,23 * * *',
    description: 'Renew Robi subscriptions (daily at 16:30 and 23:30)',
    run: () => NagadController.renewRobiSubscriptionCronJob(),
  },
  {
    key: 'podcast-count-flush',
    schedule: process.env.PODCAST_COUNT_FLUSH_CRON || '5,35 * * * *',
    description: 'Flush podcast play-count buffer to DB',
    run: () => PodcastController.runScheduledCountFlush(),
  },
  {
    key: 'podcast-trending',
    schedule: process.env.PODCAST_TRENDING_RECOMPUTE_CRON || '*/15 * * * *',
    description: 'Recompute podcast trending scores',
    run: () => PodcastController.runScheduledTrendingRecompute(),
  },
  {
    key: 'post-trending',
    schedule: process.env.POST_TRENDING_RECOMPUTE_CRON || '*/15 * * * *',
    description: 'Recompute post trending scores',
    run: () => PostController.runScheduledTrendingRecompute(),
  },
];

const CRON_KEYS = CRON_JOBS.map((job) => job.key);

/**
 * @swagger
 * tags:
 *   name: Cron
 *   description: |
 *     Manual triggers for scheduled cron jobs. Admin only (role=2).
 *     Authorize with **adminBearerAuth** (token from `POST /auth/login-admin`
 *     or `POST /auth/dev/bootstrap-admin`).
 */

/**
 * @swagger
 * /cron:
 *   get:
 *     summary: List all cron jobs
 *     description: Returns every registered cron job with its schedule and description.
 *     tags: [Cron]
 *     security:
 *       - adminBearerAuth: []
 *     servers:
 *       - url: http://localhost:8080/api/v4
 *         description: v4 — Cron triggers
 *     responses:
 *       200:
 *         description: Cron job list
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       key:
 *                         type: string
 *                         example: home-cache-app
 *                       schedule:
 *                         type: string
 *                         example: '0 * * * *'
 *                       description:
 *                         type: string
 *                         example: Rebuild Kabbik app home cache (hourly at :00)
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.get('/', authorizeAdmin, (req, res) => {
  res.json({
    success: true,
    data: CRON_JOBS.map(({ key, schedule, description }) => ({
      key,
      schedule,
      description,
    })),
  });
});

/**
 * @swagger
 * /cron/{key}:
 *   post:
 *     summary: Manually trigger a cron job
 *     description: Runs the specified cron job immediately and returns its result.
 *     tags: [Cron]
 *     security:
 *       - adminBearerAuth: []
 *     servers:
 *       - url: http://localhost:8080/api/v4
 *         description: v4 — Cron triggers
 *     parameters:
 *       - in: path
 *         name: key
 *         required: true
 *         schema:
 *           type: string
 *           enum:
 *             - home-truncate-otp
 *             - home-cache-app
 *             - home-cache-mybl
 *             - home-cache-free
 *             - session-user-report
 *             - session-dashboard
 *             - session-mybl-mail
 *             - mybl-daily-report
 *             - robi-renew
 *             - podcast-count-flush
 *             - podcast-trending
 *             - post-trending
 *         description: Cron job key (see GET /cron for full list)
 *     responses:
 *       200:
 *         description: Cron job executed
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 key:
 *                   type: string
 *                   example: home-cache-app
 *                 result:
 *                   description: Return value from the cron handler (shape varies per job)
 *                   nullable: true
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Unknown cron key
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Cron job failed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
router.post('/:key', authorizeAdmin, async (req, res) => {
  const job = CRON_JOBS.find((j) => j.key === req.params.key);
  if (!job) {
    return res.status(404).json({
      success: false,
      message: `Unknown cron key: ${req.params.key}. Valid keys: ${CRON_KEYS.join(', ')}`,
    });
  }

  try {
    const result = await job.run();
    return res.json({ success: true, key: job.key, result });
  } catch (err) {
    console.error(`[cron-trigger:${job.key}]`, err);
    return res.status(500).json({
      success: false,
      key: job.key,
      message: err.message || 'Cron job failed',
    });
  }
});

module.exports = router;
