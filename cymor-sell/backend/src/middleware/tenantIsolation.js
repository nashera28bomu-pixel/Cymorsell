// Enforces that any document fetched by :businessId-scoped routes actually
// belongs to req.user's business. Use after requireAuth + requireBusiness.
function verifyTenantOwnership(paramBusinessIdField = 'businessId') {
  return (req, res, next) => {
    const targetId = req.params[paramBusinessIdField] || req.body.business || req.query.business;
    if (targetId && targetId !== req.businessId) {
      return res.status(403).json({ error: 'Cross-business access is not allowed' });
    }
    next();
  };
}

module.exports = { verifyTenantOwnership };
