const { Order } = require('../models/Order');
const Product = require('../models/Product');

function startOf(period) {
  const now = new Date();
  if (period === 'today') return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === 'week') {
    const d = new Date(now);
    d.setDate(d.getDate() - d.getDay());
    d.setHours(0, 0, 0, 0);
    return d;
  }
  if (period === 'month') return new Date(now.getFullYear(), now.getMonth(), 1);
  return new Date(0);
}

async function getBusinessAnalytics(req, res, next) {
  try {
    const businessId = req.businessId;

    const [ordersToday, ordersWeek, ordersMonth, totalOrders, pendingPayments, completedOrders, revenueAgg, statusAgg, topProducts] =
      await Promise.all([
        Order.countDocuments({ business: businessId, createdAt: { $gte: startOf('today') } }),
        Order.countDocuments({ business: businessId, createdAt: { $gte: startOf('week') } }),
        Order.countDocuments({ business: businessId, createdAt: { $gte: startOf('month') } }),
        Order.countDocuments({ business: businessId }),
        Order.countDocuments({ business: businessId, status: 'PAYMENT_VERIFICATION' }),
        Order.countDocuments({ business: businessId, status: 'COMPLETED' }),
        Order.aggregate([
          { $match: { business: require('mongoose').Types.ObjectId.createFromHexString(businessId), status: { $in: ['PAID', 'PROCESSING', 'OUT_FOR_DELIVERY', 'COMPLETED'] } } },
          { $group: { _id: null, total: { $sum: '$total' } } },
        ]),
        Order.aggregate([
          { $match: { business: require('mongoose').Types.ObjectId.createFromHexString(businessId) } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ]),
        Order.aggregate([
          { $match: { business: require('mongoose').Types.ObjectId.createFromHexString(businessId) } },
          { $unwind: '$items' },
          { $group: { _id: '$items.name', qty: { $sum: '$items.quantity' } } },
          { $sort: { qty: -1 } },
          { $limit: 5 },
        ]),
      ]);

    const productCount = await Product.countDocuments({ business: businessId });

    res.json({
      ordersToday,
      ordersWeek,
      ordersMonth,
      totalOrders,
      pendingPayments,
      completedOrders,
      revenue: revenueAgg[0]?.total || 0,
      productCount,
      statusDistribution: statusAgg,
      bestSellers: topProducts,
    });
  } catch (err) {
    next(err);
  }
}

module.exports = { getBusinessAnalytics };
