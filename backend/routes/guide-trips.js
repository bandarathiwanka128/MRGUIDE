const express = require('express');
const router = express.Router();
let _stripe = null;
const getStripe = () => {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not configured');
    _stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
  }
  return _stripe;
};
const { GuideTrip, Guide, GuidePayout, GuideReview, User } = require('../config/database');
const authenticateToken = require('../middleware/auth');
const { calculateFare, fareBreakdown, calculateWaitingCharge } = require('../utils/fareCalculator');
const eventBus = require('../events/eventBus');

// GET /api/guide-trips/fare-estimate
router.get('/fare-estimate', async (req, res) => {
  try {
    const { guideId, distanceKm } = req.query;
    if (!guideId || !distanceKm) return res.status(400).json({ error: 'guideId and distanceKm required' });
    const guide = await Guide.findByPk(guideId);
    if (!guide) return res.status(404).json({ error: 'Guide not found' });
    res.json(fareBreakdown(distanceKm, guide));
  } catch (err) {
    res.status(500).json({ error: 'Fare estimate failed' });
  }
});

// POST /api/guide-trips — create booking request
router.post('/', authenticateToken, async (req, res) => {
  try {
    const {
      guide_id, origin_lat, origin_lng, dest_lat, dest_lng,
      origin_address, dest_address, distance_km
    } = req.body;

    if (!guide_id) return res.status(400).json({ error: 'guide_id required' });

    const guide = await Guide.findByPk(guide_id);
    if (!guide) return res.status(404).json({ error: 'Guide not found' });
    if (!guide.is_verified) return res.status(400).json({ error: 'Guide is not verified' });

    const fare = distance_km ? fareBreakdown(distance_km, guide) : null;

    const trip = await GuideTrip.create({
      guide_id,
      tourist_id: req.user.id,
      origin_lat, origin_lng, dest_lat, dest_lng,
      origin_address, dest_address,
      distance_km: distance_km || 0,
      base_fare: fare ? fare.base_fare : 0,
      platform_commission: fare ? fare.platform_commission : 0,
      guide_earnings: fare ? fare.guide_earnings : 0,
      status: 'pending'
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`guide:${guide_id}`).emit('booking:new', {
        trip_id: trip.id,
        tourist_name: req.user.username,
        origin_address,
        dest_address,
        estimated_fare: fare ? fare.base_fare : null,
        distance_km: distance_km || null
      });
    }

    // Publish to event bus (RabbitMQ or in-process fallback)
    eventBus.publish('guide.events', 'trip.booked', {
      trip_id:     trip.id,
      guide_id,
      tourist_id:  req.user.id,
      origin_address,
      dest_address,
      base_fare:   fare ? fare.base_fare : 0
    }).catch(() => {});

    res.status(201).json(trip);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Booking failed', details: err.message });
  }
});

// GET /api/guide-trips/:id
router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const trip = await GuideTrip.findByPk(req.params.id, {
      include: [
        { model: Guide, include: [{ model: User, attributes: ['username'] }] },
        { model: User, as: 'tourist', attributes: ['username', 'id'] }
      ]
    });
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    const isGuide = trip.Guide && trip.Guide.user_id === req.user.id;
    const isTourist = trip.tourist_id === req.user.id;
    if (!isGuide && !isTourist) return res.status(403).json({ error: 'Forbidden' });
    res.json(trip);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch trip' });
  }
});

// PUT /api/guide-trips/:id/confirm — guide accepts booking
router.put('/:id/confirm', authenticateToken, async (req, res) => {
  try {
    const trip = await GuideTrip.findByPk(req.params.id, { include: [Guide] });
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    if (trip.Guide.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    if (trip.status !== 'pending') return res.status(400).json({ error: 'Trip cannot be confirmed' });

    await trip.update({ status: 'confirmed' });

    const io = req.app.get('io');
    if (io) {
      io.to(`tourist:${trip.tourist_id}`).emit('booking:accepted', {
        trip_id: trip.id,
        guide_name: trip.Guide.display_name
      });
    }

    eventBus.publish('guide.events', 'trip.confirmed', {
      trip_id:    trip.id,
      guide_id:   trip.guide_id,
      tourist_id: trip.tourist_id,
      guide_name: trip.Guide.display_name
    }).catch(() => {});

    res.json(trip);
  } catch (err) {
    res.status(500).json({ error: 'Confirm failed' });
  }
});

// PUT /api/guide-trips/:id/start — guide starts trip
router.put('/:id/start', authenticateToken, async (req, res) => {
  try {
    const trip = await GuideTrip.findByPk(req.params.id, { include: [Guide] });
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    if (trip.Guide.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    if (!['pending', 'confirmed'].includes(trip.status)) return res.status(400).json({ error: 'Cannot start trip' });

    await trip.update({ status: 'active', started_at: new Date() });

    const io = req.app.get('io');
    if (io) {
      io.to(`tourist:${trip.tourist_id}`).emit('trip:started', { trip_id: trip.id });
      io.to('admin:live').emit('trip:started', { trip_id: trip.id, guide_id: trip.guide_id });
    }

    eventBus.publish('guide.events', 'trip.started', {
      trip_id:    trip.id,
      guide_id:   trip.guide_id,
      tourist_id: trip.tourist_id,
      started_at: new Date().toISOString()
    }).catch(() => {});

    res.json(trip);
  } catch (err) {
    res.status(500).json({ error: 'Start failed' });
  }
});

// PUT /api/guide-trips/:id/waiting/start — guide starts waiting charge
router.put('/:id/waiting/start', authenticateToken, async (req, res) => {
  try {
    const trip = await GuideTrip.findByPk(req.params.id, { include: [Guide] });
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    if (trip.Guide.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    if (trip.status !== 'active') return res.status(400).json({ error: 'Trip is not active' });

    await trip.update({
      is_waiting: true,
      waiting_started_at: new Date()
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`trip:${trip.id}`).emit('trip:waiting_started', {
        trip_id: trip.id,
        started_at: trip.waiting_started_at
      });
    }

    res.json(trip);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to start waiting charge' });
  }
});

// PUT /api/guide-trips/:id/waiting/stop — guide stops waiting charge
router.put('/:id/waiting/stop', authenticateToken, async (req, res) => {
  try {
    const trip = await GuideTrip.findByPk(req.params.id, { include: [Guide] });
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    if (trip.Guide.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    if (!trip.is_waiting || !trip.waiting_started_at) {
      return res.status(400).json({ error: 'Trip is not in waiting state' });
    }

    const now = new Date();
    const minutesRaw = (now - new Date(trip.waiting_started_at)) / 60000;
    const minutes = Math.round(minutesRaw * 100) / 100;
    const charge = calculateWaitingCharge(minutes, trip.Guide);

    const existingSessions = Array.isArray(trip.waiting_sessions) ? trip.waiting_sessions : [];
    const nextSessions = existingSessions.concat({
      start: trip.waiting_started_at,
      end: now,
      minutes: charge.minutes,
      charge_lkr: charge.charge_lkr
    });
    const nextTotal = Math.round((parseFloat(trip.waiting_charge_total || 0) + charge.charge_lkr) * 100) / 100;

    await trip.update({
      waiting_sessions: nextSessions,
      waiting_charge_total: nextTotal,
      is_waiting: false,
      waiting_started_at: null
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`trip:${trip.id}`).emit('trip:waiting_stopped', {
        trip_id: trip.id,
        minutes: charge.minutes,
        charge_lkr: charge.charge_lkr,
        total: nextTotal
      });
    }

    res.json(trip);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to stop waiting charge' });
  }
});

// PUT /api/guide-trips/:id/end — guide ends trip, compute fare, create payment intent
router.put('/:id/end', authenticateToken, async (req, res) => {
  try {
    const trip = await GuideTrip.findByPk(req.params.id, { include: [Guide] });
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    if (trip.Guide.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    if (trip.status !== 'active') return res.status(400).json({ error: 'Trip is not active' });

    const { distance_km, route_polyline } = req.body;
    const finalDistance = distance_km || parseFloat(trip.distance_km) || 1;
    const fare = fareBreakdown(finalDistance, trip.Guide);
    let waitingChargeTotal = parseFloat(trip.waiting_charge_total || 0);

    if (trip.is_waiting && trip.waiting_started_at) {
      const now = new Date();
      const minutesRaw = (now - new Date(trip.waiting_started_at)) / 60000;
      const minutes = Math.round(minutesRaw * 100) / 100;
      const charge = calculateWaitingCharge(minutes, trip.Guide);
      const existingSessions = Array.isArray(trip.waiting_sessions) ? trip.waiting_sessions : [];
      const nextSessions = existingSessions.concat({
        start: trip.waiting_started_at,
        end: now,
        minutes: charge.minutes,
        charge_lkr: charge.charge_lkr
      });
      waitingChargeTotal = Math.round((waitingChargeTotal + charge.charge_lkr) * 100) / 100;
      await trip.update({
        waiting_sessions: nextSessions,
        waiting_charge_total: waitingChargeTotal,
        is_waiting: false,
        waiting_started_at: null
      });
    }

    // Create Stripe PaymentIntent (amount in cents LKR)
    let paymentIntentId = null;
    let clientSecret = null;
    try {
      const pi = await getStripe().paymentIntents.create({
        amount: Math.round((fare.base_fare + waitingChargeTotal) * 100),
        currency: 'lkr',
        metadata: { trip_id: String(trip.id), guide_id: String(trip.guide_id) }
      });
      paymentIntentId = pi.id;
      clientSecret = pi.client_secret;
    } catch (stripeErr) {
      console.error('Stripe PaymentIntent creation failed:', stripeErr.message);
      // Trip still ends — guide should inform tourist to pay cash
    }

    await trip.update({
      status: 'completed',
      ended_at: new Date(),
      distance_km: finalDistance,
      base_fare: fare.base_fare,
      waiting_charge_total: waitingChargeTotal,
      platform_commission: fare.platform_commission,
      guide_earnings: fare.guide_earnings,
      route_polyline: route_polyline || null,
      stripe_payment_intent_id: paymentIntentId
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`tourist:${trip.tourist_id}`).emit('trip:ended', {
        trip_id: trip.id,
        final_fare: fare.base_fare,
        final_distance: finalDistance,
        waiting_charge_total: waitingChargeTotal,
        payment_url: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/pay/${trip.id}`
      });
      io.to('admin:live').emit('trip:ended', { trip_id: trip.id });
    }

    eventBus.publish('guide.events', 'trip.completed', {
      trip_id:       trip.id,
      guide_id:      trip.guide_id,
      tourist_id:    trip.tourist_id,
      base_fare:     fare.base_fare,
      distance_km:   finalDistance,
      ended_at:      new Date().toISOString()
    }).catch(() => {});

    res.json({ trip, fare, waiting_charge_total: waitingChargeTotal, client_secret: clientSecret });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'End trip failed', details: err.message });
  }
});

// PUT /api/guide-trips/:id/pay/qr — tourist confirms QR payment
router.put('/:id/pay/qr', authenticateToken, async (req, res) => {
  try {
    const trip = await GuideTrip.findByPk(req.params.id, { include: [Guide] });
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    if (trip.tourist_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    // Bug #3: Idempotency — reject duplicate payment attempts
    if (trip.paid) return res.json({ ok: true, already_paid: true, trip });

    // Bug #4: If Stripe failed at trip end, QR payment is not possible
    if (!trip.stripe_payment_intent_id) {
      return res.status(402).json({ error: 'Card payment unavailable for this trip. Ask your guide to record cash payment.' });
    }

    // Bug #2: Verify payment actually succeeded with Stripe before marking paid
    try {
      const pi = await getStripe().paymentIntents.retrieve(trip.stripe_payment_intent_id);
      if (pi.status !== 'succeeded') {
        return res.status(402).json({ error: 'Payment not yet completed. Please complete card payment first.' });
      }
    } catch (stripeErr) {
      console.error('Stripe PI verification failed:', stripeErr.message);
      return res.status(502).json({ error: 'Could not verify payment status. Please try again.' });
    }

    const { tip_amount } = req.body;
    const tip = parseFloat(tip_amount) || 0;

    // Bug #9: Validate tip amount
    if (tip < 0 || tip > parseFloat(trip.base_fare) * 2) {
      return res.status(400).json({ error: 'Invalid tip amount' });
    }

    const total = parseFloat(trip.base_fare) + tip;

    await trip.update({
      payment_method: 'qr',
      paid: true,
      tip_amount: tip,
      total_paid: total
    });

    // Update guide totals
    await trip.Guide.increment({
      total_earnings_base: parseFloat(trip.guide_earnings),
      total_tips_received: tip,
      total_commission_paid: parseFloat(trip.platform_commission)
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`guide:${trip.guide_id}`).emit('trip:payment_confirmed', {
        trip_id: trip.id,
        amount_paid: total,
        tip,
        method: 'qr'
      });
    }

    eventBus.publish('payment.events', 'payment.qr_confirmed', {
      trip_id:    trip.id,
      guide_id:   trip.guide_id,
      tourist_id: trip.tourist_id,
      total_paid: total,
      tip_amount: tip
    }).catch(() => {});

    res.json({ ok: true, trip, total_paid: total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Payment confirmation failed' });
  }
});

// PUT /api/guide-trips/:id/pay/cash — guide confirms cash payment
router.put('/:id/pay/cash', authenticateToken, async (req, res) => {
  try {
    const trip = await GuideTrip.findByPk(req.params.id, { include: [Guide] });
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    if (trip.Guide.user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const { tip_amount } = req.body;
    const tip = parseFloat(tip_amount) || 0;
    const total = parseFloat(trip.base_fare) + tip;

    await trip.update({
      payment_method: 'cash',
      paid: true,
      tip_amount: tip,
      total_paid: total
    });

    // Add cash commission to guide's pending balance (not collected yet — deducted at payout)
    await trip.Guide.increment({
      pending_cash_commission: parseFloat(trip.platform_commission),
      total_earnings_base: parseFloat(trip.guide_earnings),
      total_tips_received: tip
    });

    const io = req.app.get('io');
    if (io) {
      io.to(`tourist:${trip.tourist_id}`).emit('trip:payment_confirmed', {
        trip_id: trip.id,
        amount_paid: total,
        method: 'cash'
      });
    }

    eventBus.publish('payment.events', 'payment.cash_confirmed', {
      trip_id:    trip.id,
      guide_id:   trip.guide_id,
      tourist_id: trip.tourist_id,
      total_paid: total,
      tip_amount: tip
    }).catch(() => {});

    res.json({ ok: true, trip });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Cash confirm failed' });
  }
});

// POST /api/guide-trips/:id/review — tourist submits review
router.post('/:id/review', authenticateToken, async (req, res) => {
  try {
    const trip = await GuideTrip.findByPk(req.params.id);
    if (!trip) return res.status(404).json({ error: 'Trip not found' });
    if (trip.tourist_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });
    if (!trip.paid) return res.status(400).json({ error: 'Trip not yet paid' });

    const { rating, comment } = req.body;
    if (!rating || rating < 1 || rating > 5) return res.status(400).json({ error: 'Rating 1-5 required' });

    const existing = await GuideReview.findOne({ where: { trip_id: trip.id, tourist_id: req.user.id } });
    if (existing) return res.status(400).json({ error: 'Already reviewed' });

    const review = await GuideReview.create({
      guide_id: trip.guide_id,
      tourist_id: req.user.id,
      trip_id: trip.id,
      rating,
      comment
    });

    // Update guide avg_rating
    const guide = await Guide.findByPk(trip.guide_id);
    const newTotal = (guide.total_reviews || 0) + 1;
    const newAvg = ((parseFloat(guide.avg_rating || 0) * (newTotal - 1)) + rating) / newTotal;
    await guide.update({ avg_rating: parseFloat(newAvg.toFixed(2)), total_reviews: newTotal });

    res.status(201).json(review);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Review submission failed' });
  }
});

module.exports = router;
