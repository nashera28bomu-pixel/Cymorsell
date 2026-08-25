const express = require('express');
const router = express.Router();
const csv = require('../controllers/csvController');
const { requireAuth, requireBusiness } = require('../middleware/auth');
const { uploadCsv } = require('../middleware/upload');
const { csvLimiter } = require('../middleware/rateLimiters');

router.use(requireAuth, requireBusiness, csvLimiter);

router.post('/preview', uploadCsv.single('file'), csv.previewCsv);
router.post('/commit', csv.commitCsvImport);

module.exports = router;
