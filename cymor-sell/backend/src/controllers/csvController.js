const { parseAndValidateCsv, commitImport } = require('../services/csvImportService');
const { logActivity } = require('../services/activityLogService');

// In-memory holding area for previewed-but-not-yet-committed imports, keyed by a
// short-lived token. Good enough for MVP single-instance deployment.
const pendingImports = new Map();

function makeToken() {
  return `imp_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
}

async function previewCsv(req, res, next) {
  try {
    if (!req.file) return res.status(400).json({ error: 'No CSV file uploaded' });
    const { validRows, errors, totalRows } = parseAndValidateCsv(req.file.buffer);

    const token = makeToken();
    pendingImports.set(token, { businessId: req.businessId, validRows, createdAt: Date.now() });
    // expire after 15 min
    setTimeout(() => pendingImports.delete(token), 15 * 60 * 1000);

    res.json({
      importToken: token,
      totalRows,
      validCount: validRows.length,
      errorCount: errors.length,
      errors,
      preview: validRows.slice(0, 20),
    });
  } catch (err) {
    next(err);
  }
}

async function commitCsvImport(req, res, next) {
  try {
    const { importToken } = req.body;
    const pending = pendingImports.get(importToken);
    if (!pending || pending.businessId !== req.businessId) {
      return res.status(400).json({ error: 'Import session not found or expired. Please re-upload the CSV.' });
    }
    const inserted = await commitImport({ businessId: req.businessId, validRows: pending.validRows });
    pendingImports.delete(importToken);

    await logActivity({
      business: req.businessId,
      actor: req.user._id,
      action: 'PRODUCTS_IMPORTED',
      meta: { count: inserted.length },
    });

    res.json({ inserted: inserted.length });
  } catch (err) {
    next(err);
  }
}

module.exports = { previewCsv, commitCsvImport };
