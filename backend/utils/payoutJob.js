const { Guide, GuideTrip, GuidePayout, sequelize } = require('../config/database');
const { Op } = require('sequelize');

// Bug #5: Prevent concurrent payout job runs
let isRunning = false;

const lkr = (n) => Math.round(parseFloat(n || 0) * 100) / 100;

async function runPayoutJob() {
  if (isRunning) {
    console.warn('[Payout] Job already running — skipping duplicate execution');
    return { processed: 0, payouts: [], skipped: true };
  }
  isRunning = true;
  const now = new Date();
  // Period: last 7 days
  const periodEnd = new Date(now);
  periodEnd.setHours(23, 59, 59, 999);
  const periodStart = new Date(periodEnd - 7 * 24 * 60 * 60 * 1000);
  periodStart.setHours(0, 0, 0, 0);

  // Get all guides with unpaid QR trips in period
  const guides = await Guide.findAll({ where: { is_verified: true } });
  const results = [];

  try {
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

      // Bug #10: Use lkr() helper for all float math to avoid accumulation errors
      const qrBase    = lkr(qrTrips.reduce((a, t) => a + lkr(t.base_fare), 0));
      const tipsQr    = lkr(qrTrips.reduce((a, t) => a + lkr(t.tip_amount), 0));

      const cashTrips = await GuideTrip.findAll({
        where: {
          guide_id: guide.id,
          payment_method: 'cash',
          paid: true,
          payout_id: null,
          created_at: { [Op.between]: [periodStart, periodEnd] }
        }
      });
      const tipsCash = lkr(cashTrips.reduce((a, t) => a + lkr(t.tip_amount), 0));

      const qrCommission      = lkr(qrBase * 0.05);
      const cashCommOwed      = lkr(guide.pending_cash_commission);
      const cashCommRecovered = lkr(Math.min(cashCommOwed, Math.max(0, qrBase - qrCommission)));
      const cashCommRolled    = lkr(cashCommOwed - cashCommRecovered);
      const allTips           = lkr(tipsQr + tipsCash);
      const netPayout         = lkr(qrBase - qrCommission - cashCommRecovered + allTips);

      if (qrBase === 0 && cashCommOwed === 0) continue;

      const payout = await GuidePayout.create({
        guide_id: guide.id,
        period_start: periodStart.toISOString().split('T')[0],
        period_end:   periodEnd.toISOString().split('T')[0],
        qr_base_total:              qrBase,
        tips_total:                 allTips,
        qr_commission:              qrCommission,
        cash_commission_recovered:  cashCommRecovered,
        cash_commission_rolled_over: cashCommRolled,
        net_payout:                 netPayout,
        status: 'pending'
      });

      const allTripIds = [...qrTrips.map(t => t.id), ...cashTrips.map(t => t.id)];
      if (allTripIds.length > 0) {
        await GuideTrip.update({ payout_id: payout.id }, { where: { id: { [Op.in]: allTripIds } } });
      }

      await guide.update({ pending_cash_commission: cashCommRolled });

      results.push({ guide_id: guide.id, display_name: guide.display_name, net_payout: netPayout, payout_id: payout.id });
    }
  } finally {
    // Bug #5: Always release lock even if an error occurs mid-job
    isRunning = false;
  }

  return { processed: results.length, payouts: results };
}

module.exports = { runPayoutJob };
