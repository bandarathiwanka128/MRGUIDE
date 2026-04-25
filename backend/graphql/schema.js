/**
 * GraphQL API — Apollo Server v4 with Express integration.
 *
 * WSO2 API Manager interview talking point:
 *   "I added a GraphQL gateway alongside REST so mobile clients can fetch
 *    exactly what they need in a single round-trip — e.g., live guides with
 *    nested location + last-3-reviews in one query.  This mirrors WSO2 API
 *    Manager's GraphQL API support, where the same backend is exposed through
 *    multiple API styles (REST, GraphQL, WebSocket) under one policy plane."
 *
 * Endpoint: POST /graphql  (also GET /graphql for GraphiQL playground in dev)
 *
 * Example query:
 *   query {
 *     liveGuides {
 *       id display_name avg_rating
 *       location { lat lng }
 *       recentReviews { rating comment }
 *     }
 *   }
 */

'use strict';

const { ApolloServer }      = require('@apollo/server');
const { expressMiddleware } = require('@apollo/server/express4');
const jwt                   = require('jsonwebtoken');

const { Guide, GuideTrip, GuideReview, GuideLocation, User } = require('../config/database');

// ─── Type Definitions ──────────────────────────────────────────────────────────
const typeDefs = `#graphql

  type Location {
    lat: Float!
    lng: Float!
    updated_at: String
  }

  type GuideReview {
    id: ID!
    rating: Int!
    comment: String
    reviewer: String
    created_at: String
  }

  type Guide {
    id: ID!
    display_name: String!
    bio: String
    photo_url: String
    languages: [String]
    speciality_regions: [String]
    avg_rating: Float
    total_reviews: Int
    is_available: Boolean
    is_verified: Boolean
    tier_1km: Float
    tier_5km: Float
    tier_10km: Float
    tier_20km: Float
    tier_per_km_over20: Float
    currency: String
    location: Location
    recentReviews(limit: Int): [GuideReview]
  }

  type TripStatus {
    id: ID!
    status: String!
    base_fare: Float
    distance_km: Float
    payment_method: String
    paid: Boolean
    started_at: String
    ended_at: String
  }

  type Place {
    id: ID!
    name: String!
    category: String
    latitude: Float
    longitude: Float
    description: String
    address: String
  }

  type FareEstimate {
    distance_km: Float!
    base_fare: Float!
    platform_commission: Float!
    guide_earnings: Float!
    currency: String!
  }

  type Query {
    "All live (available + verified) guides with real-time location"
    liveGuides: [Guide!]!

    "Full guide profile by ID"
    guide(id: ID!): Guide

    "Fare estimate for a guide + distance"
    fareEstimate(guideId: ID!, distanceKm: Float!): FareEstimate

    "Authenticated tourist's trip history"
    myTrips: [TripStatus!]!

    "Authenticated guide's active trip"
    activeTrip: TripStatus

    "Place search by keyword"
    searchPlaces(query: String!, limit: Int): [Place!]!
  }

  type Mutation {
    "Create a booking request (tourist only)"
    bookGuide(
      guide_id: ID!
      origin_lat: Float!
      origin_lng: Float!
      dest_lat: Float!
      dest_lng: Float!
      origin_address: String
      dest_address: String
      distance_km: Float
    ): TripStatus

    "Submit a review after trip completion (tourist only)"
    reviewGuide(trip_id: ID!, rating: Int!, comment: String): GuideReview
  }
`;

// ─── Resolvers ─────────────────────────────────────────────────────────────────
const resolvers = {
  Query: {
    liveGuides: async () => {
      return Guide.findAll({
        where:   { is_available: true, is_verified: true },
        include: [
          { model: GuideLocation, as: 'location' },
          { model: GuideReview,   as: 'guide_reviews', limit: 3, order: [['created_at', 'DESC']] }
        ]
      });
    },

    guide: async (_parent, { id }) => {
      return Guide.findByPk(id, {
        include: [
          { model: GuideLocation, as: 'location' },
          { model: GuideReview,   as: 'guide_reviews', limit: 10, order: [['created_at', 'DESC']] }
        ]
      });
    },

    fareEstimate: async (_parent, { guideId, distanceKm }) => {
      const { fareBreakdown } = require('../utils/fareCalculator');
      const guide = await Guide.findByPk(guideId);
      if (!guide) throw new Error('Guide not found');
      return fareBreakdown(distanceKm, guide);
    },

    myTrips: async (_parent, _args, { user }) => {
      if (!user) throw new Error('Authentication required');
      return GuideTrip.findAll({
        where:   { tourist_id: user.id },
        order:   [['created_at', 'DESC']],
        limit:   20
      });
    },

    activeTrip: async (_parent, _args, { user }) => {
      if (!user) throw new Error('Authentication required');
      const guide = await Guide.findOne({ where: { user_id: user.id } });
      if (!guide) return null;
      return GuideTrip.findOne({
        where: { guide_id: guide.id, status: 'active' }
      });
    },

    searchPlaces: async (_parent, { query, limit = 10 }) => {
      const { Place } = require('../config/database');
      const { Op }    = require('sequelize');
      return Place.findAll({
        where: {
          [Op.or]: [
            { name:        { [Op.iLike]: `%${query}%` } },
            { description: { [Op.iLike]: `%${query}%` } },
            { category:    { [Op.iLike]: `%${query}%` } }
          ]
        },
        limit
      });
    }
  },

  Mutation: {
    bookGuide: async (_parent, args, { user }) => {
      if (!user) throw new Error('Authentication required');
      const { fareBreakdown } = require('../utils/fareCalculator');
      const guide = await Guide.findByPk(args.guide_id);
      if (!guide)             throw new Error('Guide not found');
      if (!guide.is_verified) throw new Error('Guide is not verified');

      const fare = args.distance_km ? fareBreakdown(args.distance_km, guide) : null;
      return GuideTrip.create({
        guide_id:            args.guide_id,
        tourist_id:          user.id,
        origin_lat:          args.origin_lat,
        origin_lng:          args.origin_lng,
        dest_lat:            args.dest_lat,
        dest_lng:            args.dest_lng,
        origin_address:      args.origin_address || '',
        dest_address:        args.dest_address   || '',
        distance_km:         args.distance_km    || 0,
        base_fare:           fare?.base_fare           ?? 0,
        platform_commission: fare?.platform_commission ?? 0,
        guide_earnings:      fare?.guide_earnings      ?? 0,
        status: 'pending'
      });
    },

    reviewGuide: async (_parent, { trip_id, rating, comment }, { user }) => {
      if (!user) throw new Error('Authentication required');
      const trip = await GuideTrip.findByPk(trip_id);
      if (!trip)               throw new Error('Trip not found');
      if (trip.tourist_id !== user.id) throw new Error('Forbidden');
      if (!trip.paid)          throw new Error('Trip not yet paid');
      if (rating < 1 || rating > 5)   throw new Error('Rating must be 1-5');

      const existing = await GuideReview.findOne({ where: { trip_id, tourist_id: user.id } });
      if (existing) throw new Error('Already reviewed');

      const review = await GuideReview.create({
        guide_id: trip.guide_id, tourist_id: user.id, trip_id, rating, comment
      });

      // Update guide aggregate rating
      const guide   = await Guide.findByPk(trip.guide_id);
      const newTotal = (guide.total_reviews || 0) + 1;
      const newAvg   = ((parseFloat(guide.avg_rating || 0) * (newTotal - 1)) + rating) / newTotal;
      await guide.update({ avg_rating: parseFloat(newAvg.toFixed(2)), total_reviews: newTotal });

      return review;
    }
  },

  // Field resolvers for nested types
  Guide: {
    location:      (guide) => guide.location || null,
    recentReviews: (guide, { limit = 5 }) =>
      guide.guide_reviews?.slice(0, limit) ?? []
  },

  GuideReview: {
    reviewer: async (review) => {
      const user = await User.findByPk(review.tourist_id, { attributes: ['username'] });
      return user?.username ?? 'Anonymous';
    }
  }
};

// ─── Server factory ────────────────────────────────────────────────────────────
async function createGraphQLMiddleware() {
  const server = new ApolloServer({
    typeDefs,
    resolvers,
    introspection: process.env.NODE_ENV !== 'production',
    formatError: (formattedError, _error) => {
      // Don't leak stack traces in production
      if (process.env.NODE_ENV === 'production') {
        return { message: formattedError.message, code: formattedError.extensions?.code };
      }
      return formattedError;
    }
  });

  await server.start();
  console.log('[GraphQL] Apollo Server v4 started ✓  → POST /graphql');

  // Context: validate JWT from Authorization header
  const middleware = expressMiddleware(server, {
    context: async ({ req }) => {
      const auth = req.headers.authorization || '';
      let user = null;
      if (auth.startsWith('Bearer ')) {
        try {
          user = jwt.verify(auth.slice(7), process.env.JWT_SECRET);
        } catch {}
      }
      return { user };
    }
  });

  return middleware;
}

module.exports = { createGraphQLMiddleware };
