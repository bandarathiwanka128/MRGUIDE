export function calculateFare(distanceKm, guide) {
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

export function fareBreakdown(distanceKm, guide) {
  const fare = calculateFare(distanceKm, guide);
  return {
    distance_km: parseFloat(parseFloat(distanceKm).toFixed(2)),
    base_fare: parseFloat(fare.toFixed(2)),
    platform_commission: parseFloat((fare * 0.05).toFixed(2)),
    guide_earnings: parseFloat((fare * 0.95).toFixed(2)),
    currency: guide.currency || 'LKR'
  };
}
