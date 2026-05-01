/**
 * Calculate guide fare based on distance and guide's pricing tiers.
 * Tier logic:
 *   distance <= 1km  → tier_1km (flat)
 *   distance <= 5km  → tier_5km (flat)
 *   distance <= 10km → tier_10km (flat)
 *   distance <= 20km → tier_20km (flat)
 *   distance > 20km  → tier_20km + (extra km × tier_per_km_over20)
 */
function calculateFare(distanceKm, guide) {
  const d = parseFloat(distanceKm) || 0;
  const t1 = parseFloat(guide.tier_1km) || 0;
  const t5 = parseFloat(guide.tier_5km) || 0;
  const t10 = parseFloat(guide.tier_10km) || 0;
  const t20 = parseFloat(guide.tier_20km) || 0;
  const tExtra = parseFloat(guide.tier_per_km_over20) || 0;

  if (d <= 1) return t1;
  if (d <= 5) return t5;
  if (d <= 10) return t10;
  if (d <= 20) return t20;
  return t20 + (d - 20) * tExtra;
}

/**
 * Returns a breakdown object for display purposes.
 */
function fareBreakdown(distanceKm, guide) {
  const fare = calculateFare(distanceKm, guide);
  const commission = parseFloat((fare * 0.05).toFixed(2));
  const guideEarnings = parseFloat((fare * 0.95).toFixed(2));
  return {
    distance_km: parseFloat(parseFloat(distanceKm).toFixed(3)),
    base_fare: parseFloat(fare.toFixed(2)),
    platform_commission: commission,
    guide_earnings: guideEarnings,
    currency: guide.currency || 'LKR'
  };
}

function calculateWaitingCharge(minutes, guide) {
  const mins = Math.max(0, parseFloat(minutes) || 0);
  const roundedMinutes = Math.round(mins * 100) / 100;
  const rate = key => parseFloat(guide[key]) || 0;

  let total = 0;
  if (roundedMinutes <= 10) total = rate('wait_rate_10m');
  else if (roundedMinutes <= 20) total = rate('wait_rate_20m');
  else if (roundedMinutes <= 30) total = rate('wait_rate_30m');
  else if (roundedMinutes <= 40) total = rate('wait_rate_40m');
  else if (roundedMinutes <= 60) total = rate('wait_rate_1h');
  else if (roundedMinutes <= 120) total = rate('wait_rate_2h');
  else if (roundedMinutes <= 180) total = rate('wait_rate_3h');
  else if (roundedMinutes <= 300) total = rate('wait_rate_5h');
  else {
    total = rate('wait_rate_5h');
    let remaining = roundedMinutes - 300;
    const hours = Math.floor(remaining / 60);
    total += hours * rate('wait_rate_per_hour');
    remaining = remaining % 60;
    const halfHours = Math.floor(remaining / 30);
    total += halfHours * rate('wait_rate_per_30m');
    remaining = remaining % 30;
    const quarterHours = Math.floor(remaining / 15);
    total += quarterHours * rate('wait_rate_per_15m');
  }

  return { minutes: roundedMinutes, charge_lkr: Math.round(total * 100) / 100 };
}

module.exports = { calculateFare, fareBreakdown, calculateWaitingCharge };
