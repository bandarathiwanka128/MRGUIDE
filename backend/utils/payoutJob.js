const { Guide, GuideTrip, GuidePayout, sequelize } = require('../config/database');
const { Op } = require('sequelize');

async function runPayoutJob() {
  const now = new Date();
  // Period: last 7 days
  const periodEnd = new Date(now);
  periodEnd.setHours(23, 59, 59, 999);
  const periodStart = new Date(periodEnd - 7 * 24 * 60 * 60 * 1000);
  periodStart.setHours(0, 0, 0, 0);

  // Get all guides with unpaid QR trips in period
  const guides = await Guide.findAll({ where: { is_verified: true } });
  const results = [];

  for (const guide of guides) {
    const qrTrips = await GuideTrip.findAll({
      where: {
        guide_id: guide.id,
        payment_method: 'qr',
        paid: true,
        payout_id: null,
        created_at: { [Op.between]: [periodStart, periodEnd] }
      }
    });

    const qrBase = qrTrips.reduce((a, t) => a + parseFloat(t.base_fare || 0), 0);
    const tipsQr = qrTrips.reduce((a, t) => a + parseFloat(t.tip_amount || 0), 0);

    // Also include cash tips logged
    const cashTrips = await GuideTrip.findAll({
      where: {
        guide_id: guide.id,
        payment_method: 'cash',
        paid: true,
        payout_id: null,
        created_at: { [Op.between]: [periodStart, periodEnd] }
      }
    });
    const tipsCash = cashTrips.reduce((a, t) => a + parseFloat(t.tip_amount || 0), 0);

    const qrCommission = parseFloat((qrBase * 0.05).toFixed(2));
    const cashCommOwed = parseFloat(guide.pending_cash_commission || 0);
    const cashCommRecovered = Math.min(cashCommOwed, Math.max(0, qrBase - qrCommission));
    const cashCommRolled = parseFloat((cashCommOwed - cashCommRecovered).toFixed(2));
    const allTips = parseFloat((tipsQr + tipsCash).toFixed(2));
    const netPayout = parseFloat((qrBase - qrCommission - cashCommRecovered + allTips).toFixed(2));

    if (qrBase === 0 && cashCommOwed === 0) continue;

    const payout = await GuidePayout.create({
      guide_id: guide.id,
      period_start: periodStart.toISOString().split('T')[0],
      period_end: periodEnd.toISOString().split('T')[0],
      qr_base_total: parseFloat(qrBase.toFixed(2)),
      tips_total: allTips,
      qr_commission: qrCommission,
      cash_commission_recovered: cashCommRecovered,
      cash_commission_rolled_over: cashCommRolled,
      net_payout: netPayout,
      status: 'pending'
    });

    // Link trips to payout
    const allTripIds = [...qrTrips.map(t => t.id), ...cashTrips.map(t => t.id)];
    if (allTripIds.length > 0) {
      await GuideTrip.update({ payout_id: payout.id }, { where: { id: { [Op.in]: allTripIds } } });
    }

    // Reset cash commission (or partial)
    await guide.update({ pending_cash_commission: cashCommRolled });

    results.push({ guide_id: guide.id, display_name: guide.display_name, net_payout: netPayout, payout_id: payout.id });
  }

  return { processed: results.length, payouts: results };
}

module.exports = { runPayoutJob };
