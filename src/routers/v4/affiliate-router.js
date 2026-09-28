const express = require('express');
const axios = require('axios');
const { parseStringPromise } = require('xml2js'); // ✅ correct way
const affiliateController = require('../../controllers/affiliate-controller');

const router = express.Router();

// Affiliate routes
router.post('/otp-request', affiliateController.otpRequest);
router.post('/otp-verify-request', affiliateController.otpVerificationRequest);
router.post('/login', affiliateController.login);
router.get('/generate_refer_link', affiliateController.generateReferLink);
router.post('/redirect_to_aff_target', affiliateController.redirectToTarget);
router.get('/get-products', affiliateController.getProducts);
router.get('/get-subscription-plan', affiliateController.getSubscriptionPackage);
router.get('/withdrawal-history', affiliateController.withdrawalHistory);
router.get('/get-search-products', affiliateController.searchProducts);

router.get('/get-leaderboard', affiliateController.getLeaderboard);
router.post('/request-withdraw', affiliateController.requestToWithDraw);
router.get('/dash-board-data', affiliateController.dashBoardData);

// RSS feed parser
router.get('/rss', async (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).json({ error: 'RSS feed URL required' });
  }

  try {
    // Fetch RSS feed XML
    const { data } = await axios.get(url);

    // Parse XML to JS
    const parsed = await parseStringPromise(data, { explicitArray: false });

    // Extract <item> list (some feeds may return single object)
    const items = parsed?.rss?.channel?.item || [];
    const audioList = Array.isArray(items) ? items : [items];

    // Extract relevant info
    const audioFiles = audioList.map(item => ({
      title: item.title || '',
      pubDate: item.pubDate || '',
      description: item.description || '',
      audioUrl:
        item?.enclosure?.['$']?.url ||
        item?.['media:content']?.['$']?.url ||
        null,
    }));

    res.json({
      count: audioFiles.filter(f => f.audioUrl).length,
      audioFiles: audioFiles.filter(f => f.audioUrl),
    });
  } catch (err) {
    console.error('RSS Parse Error:', err.message);
    res.status(500).json({ error: 'Failed to parse RSS feed' });
  }
});

module.exports = router;
