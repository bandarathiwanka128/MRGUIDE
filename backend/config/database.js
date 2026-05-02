const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config();

// Use DATABASE_URL from environment (for Neon/production) or fallback to local
const databaseUrl = process.env.DATABASE_URL || 'postgresql://postgres:1aA#22##@localhost:5432/mrguide';

const sequelize = new Sequelize(databaseUrl, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: process.env.NODE_ENV === 'production' || databaseUrl.includes('neon.tech') || databaseUrl.includes('supabase') || databaseUrl.includes('railway')
      ? {
          require: true,
          rejectUnauthorized: false
        }
      : false
  },
  logging: false,
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
});

// User Model
const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  mobile_number: DataTypes.STRING,
  country_code: DataTypes.STRING,
  country: DataTypes.STRING,
  role: {
    type: DataTypes.STRING,
    defaultValue: 'user'
  }
}, {
  tableName: 'users',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

// Authentic Profile Model
const AuthenticProfile = sequelize.define('AuthenticProfile', {
  user_id: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'id'
    }
  },
  title: DataTypes.STRING,
  education: DataTypes.TEXT,
  job_title: DataTypes.STRING,
  age: DataTypes.INTEGER,
  description: DataTypes.TEXT,
  has_business: DataTypes.BOOLEAN,
  business_name: DataTypes.STRING,
  business_type: DataTypes.STRING,
  business_description: DataTypes.TEXT
}, {
  tableName: 'authentic_profiles',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

// Place Model
const Place = sequelize.define('Place', {
  name: DataTypes.STRING,
  category: DataTypes.STRING,
  latitude: DataTypes.DECIMAL(10, 8),
  longitude: DataTypes.DECIMAL(11, 8),
  description: DataTypes.TEXT,
  address: DataTypes.TEXT,
  google_place_id: DataTypes.STRING,
  created_by: DataTypes.INTEGER,
  price_level: {
    type: DataTypes.INTEGER,
    validate: { min: 1, max: 5 }
  },
  estimated_cost: DataTypes.DECIMAL(10, 2)
}, {
  tableName: 'places',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Authentic Details Model (for Users contributing info about places)
const AuthenticDetail = sequelize.define('AuthenticDetail', {
  place_id: {
    type: DataTypes.INTEGER,
    references: {
      model: Place,
      key: 'id'
    }
  },
  google_place_id: DataTypes.STRING,
  user_id: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'id'
    }
  },
  detail_type: {
    type: DataTypes.ENUM('user', 'business'),
    allowNull: false,
    defaultValue: 'user'
  },
  title: DataTypes.STRING,
  business_name: DataTypes.STRING,
  organization: DataTypes.STRING,
  job_title: DataTypes.STRING,
  expertise: DataTypes.TEXT,
  description: DataTypes.TEXT,
  phone: DataTypes.STRING,
  email: DataTypes.STRING,
  website: DataTypes.STRING,
  maps_link: DataTypes.STRING,
  packages: DataTypes.JSON,
  photos: DataTypes.ARRAY(DataTypes.STRING),
  verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  }
}, {
  tableName: 'authentic_details',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Review Model
const Review = sequelize.define('Review', {
  place_id: {
    type: DataTypes.INTEGER,
    references: {
      model: Place,
      key: 'id'
    }
  },
  user_id: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'id'
    }
  },
  rating: {
    type: DataTypes.INTEGER,
    validate: {
      min: 1,
      max: 5
    }
  },
  comment: DataTypes.TEXT,
  photos: DataTypes.ARRAY(DataTypes.STRING)
}, {
  tableName: 'reviews',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Relationships
User.hasOne(AuthenticProfile, { foreignKey: 'user_id' });
AuthenticProfile.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(Review, { foreignKey: 'user_id' });
Review.belongsTo(User, { foreignKey: 'user_id' });

User.hasMany(AuthenticDetail, { foreignKey: 'user_id' });
AuthenticDetail.belongsTo(User, { foreignKey: 'user_id' });

Place.hasMany(Review, { foreignKey: 'place_id' });
Review.belongsTo(Place, { foreignKey: 'place_id' });

Place.hasMany(AuthenticDetail, { foreignKey: 'place_id' });
AuthenticDetail.belongsTo(Place, { foreignKey: 'place_id' });

// Trip Model
const Trip = sequelize.define('Trip', {
  user_id: {
    type: DataTypes.INTEGER,
    references: { model: User, key: 'id' }
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false
  },
  description: DataTypes.TEXT,
  destinations: {
    type: DataTypes.JSON,
    defaultValue: []
  },
  travel_mode: {
    type: DataTypes.STRING,
    defaultValue: 'car'
  },
  total_distance: DataTypes.DECIMAL(10, 2),
  total_duration: DataTypes.DECIMAL(10, 2),
  weather_data: DataTypes.JSON,
  ai_suggestions: DataTypes.TEXT,
  status: {
    type: DataTypes.STRING,
    defaultValue: 'draft'
  },
  start_date: DataTypes.DATEONLY,
  end_date: DataTypes.DATEONLY
}, {
  tableName: 'trips',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

User.hasMany(Trip, { foreignKey: 'user_id' });
Trip.belongsTo(User, { foreignKey: 'user_id' });

// Store/Business Model for Locator
const Store = sequelize.define('Store', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  business_type: DataTypes.STRING,
  address: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  latitude: {
    type: DataTypes.DECIMAL(10, 8),
    allowNull: false
  },
  longitude: {
    type: DataTypes.DECIMAL(11, 8),
    allowNull: false
  },
  phone: DataTypes.STRING,
  email: DataTypes.STRING,
  website: DataTypes.STRING,
  opening_hours: DataTypes.JSON,
  amenities: DataTypes.ARRAY(DataTypes.STRING),
  images: DataTypes.ARRAY(DataTypes.STRING),
  description: DataTypes.TEXT,
  rating: {
    type: DataTypes.DECIMAL(2, 1),
    defaultValue: 0
  },
  is_verified: {
    type: DataTypes.BOOLEAN,
    defaultValue: false
  },
  owner_id: {
    type: DataTypes.INTEGER,
    references: {
      model: User,
      key: 'id'
    }
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: 'active'
  }
}, {
  tableName: 'stores',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

// Store Relationships
User.hasMany(Store, { foreignKey: 'owner_id' });
Store.belongsTo(User, { foreignKey: 'owner_id' });

// ─── Guide Models ──────────────────────────────────────────────────────────

const Guide = sequelize.define('Guide', {
  user_id: {
    type: DataTypes.INTEGER,
    references: { model: User, key: 'id' },
    unique: true
  },
  display_name: { type: DataTypes.STRING(100), allowNull: false },
  photo_url: DataTypes.TEXT,
  bio: DataTypes.STRING(500),
  about_tours: DataTypes.TEXT,
  languages: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
  speciality_regions: { type: DataTypes.ARRAY(DataTypes.STRING), defaultValue: [] },
  tier_1km: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  tier_5km: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  tier_10km: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  tier_20km: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  tier_per_km_over20: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  wait_rate_10m: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  wait_rate_20m: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  wait_rate_30m: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  wait_rate_40m: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  wait_rate_1h: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  wait_rate_2h: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  wait_rate_3h: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  wait_rate_5h: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  wait_rate_per_hour: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  wait_rate_per_30m: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  wait_rate_per_15m: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  currency: { type: DataTypes.STRING(10), defaultValue: 'LKR' },
  phone: DataTypes.STRING(20),
  whatsapp: DataTypes.STRING(20),
  payment_ref: DataTypes.TEXT,
  bank_name: DataTypes.STRING(100),
  bank_account_number: DataTypes.STRING(50),
  bank_branch: DataTypes.STRING(100),
  nic_number: DataTypes.STRING(20),
  card_last4: DataTypes.STRING(4),
  card_expiry: DataTypes.STRING(7),
  stripe_customer_id: DataTypes.STRING(100),
  is_available: { type: DataTypes.BOOLEAN, defaultValue: false },
  is_verified: { type: DataTypes.BOOLEAN, defaultValue: false },
  avg_rating: { type: DataTypes.DECIMAL(3, 2), defaultValue: 0 },
  total_reviews: { type: DataTypes.INTEGER, defaultValue: 0 },
  total_earnings_base: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  total_tips_received: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  total_commission_paid: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  pending_cash_commission: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 }
}, {
  tableName: 'guides',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

const GuidePhoto = sequelize.define('GuidePhoto', {
  guide_id: { type: DataTypes.INTEGER, references: { model: Guide, key: 'id' } },
  url: { type: DataTypes.TEXT, allowNull: false },
  caption: DataTypes.STRING(255),
  sort_order: { type: DataTypes.INTEGER, defaultValue: 0 }
}, {
  tableName: 'guide_photos',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

const GuideLocation = sequelize.define('GuideLocation', {
  guide_id: {
    type: DataTypes.INTEGER,
    references: { model: Guide, key: 'id' },
    unique: true,
    primaryKey: true
  },
  lat: { type: DataTypes.DECIMAL(10, 7), allowNull: false },
  lng: { type: DataTypes.DECIMAL(10, 7), allowNull: false },
  accuracy: DataTypes.DECIMAL(8, 2)
}, {
  tableName: 'guide_locations',
  timestamps: true,
  createdAt: false,
  updatedAt: 'updated_at'
});

const GuidePayout = sequelize.define('GuidePayout', {
  guide_id: { type: DataTypes.INTEGER, references: { model: Guide, key: 'id' } },
  period_start: DataTypes.DATEONLY,
  period_end: DataTypes.DATEONLY,
  qr_base_total: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  tips_total: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  qr_commission: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  cash_commission_recovered: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  cash_commission_rolled_over: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  net_payout: { type: DataTypes.DECIMAL(12, 2), defaultValue: 0 },
  bank_transfer_ref: DataTypes.STRING(100),
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'paid', 'failed'),
    defaultValue: 'pending'
  },
  paid_at: DataTypes.DATE
}, {
  tableName: 'guide_payouts',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

const GuideTrip = sequelize.define('GuideTrip', {
  guide_id: { type: DataTypes.INTEGER, references: { model: Guide, key: 'id' } },
  tourist_id: { type: DataTypes.INTEGER, references: { model: User, key: 'id' } },
  payout_id: { type: DataTypes.INTEGER, references: { model: GuidePayout, key: 'id' }, allowNull: true },
  origin_lat: DataTypes.DECIMAL(10, 7),
  origin_lng: DataTypes.DECIMAL(10, 7),
  dest_lat: DataTypes.DECIMAL(10, 7),
  dest_lng: DataTypes.DECIMAL(10, 7),
  origin_address: DataTypes.TEXT,
  dest_address: DataTypes.TEXT,
  distance_km: { type: DataTypes.DECIMAL(8, 3), defaultValue: 0 },
  base_fare: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  waiting_charge_total: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  waiting_sessions: { type: DataTypes.JSONB, defaultValue: [] },
  is_waiting: { type: DataTypes.BOOLEAN, defaultValue: false },
  waiting_started_at: { type: DataTypes.DATE, allowNull: true },
  tip_amount: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  total_paid: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  platform_commission: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  guide_earnings: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  payment_method: {
    type: DataTypes.ENUM('qr', 'cash'),
    allowNull: true
  },
  paid: { type: DataTypes.BOOLEAN, defaultValue: false },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'active', 'completed', 'cancelled', 'rejected'),
    defaultValue: 'pending'
  },
  stripe_payment_intent_id: DataTypes.STRING(200),
  started_at: DataTypes.DATE,
  ended_at: DataTypes.DATE,
  route_polyline: DataTypes.TEXT
}, {
  tableName: 'guide_trips',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at'
});

const GuideReview = sequelize.define('GuideReview', {
  guide_id: { type: DataTypes.INTEGER, references: { model: Guide, key: 'id' } },
  tourist_id: { type: DataTypes.INTEGER, references: { model: User, key: 'id' } },
  trip_id: { type: DataTypes.INTEGER, references: { model: GuideTrip, key: 'id' }, allowNull: true },
  rating: { type: DataTypes.INTEGER, validate: { min: 1, max: 5 } },
  comment: DataTypes.TEXT
}, {
  tableName: 'guide_reviews',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

const Conversation = sequelize.define('Conversation', {
  guide_id: { type: DataTypes.INTEGER, references: { model: Guide, key: 'id' } },
  tourist_id: { type: DataTypes.INTEGER, references: { model: User, key: 'id' } },
  trip_id: { type: DataTypes.INTEGER, references: { model: GuideTrip, key: 'id' }, allowNull: true }
}, {
  tableName: 'conversations',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

const Message = sequelize.define('Message', {
  conversation_id: { type: DataTypes.INTEGER, references: { model: Conversation, key: 'id' } },
  sender_id: { type: DataTypes.INTEGER, references: { model: User, key: 'id' } },
  content: { type: DataTypes.TEXT, allowNull: false },
  read: { type: DataTypes.BOOLEAN, defaultValue: false }
}, {
  tableName: 'messages',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: false
});

// Guide Associations
User.hasOne(Guide, { foreignKey: 'user_id' });
Guide.belongsTo(User, { foreignKey: 'user_id' });
Guide.hasMany(GuidePhoto, { foreignKey: 'guide_id', as: 'photos' });
GuidePhoto.belongsTo(Guide, { foreignKey: 'guide_id' });
Guide.hasOne(GuideLocation, { foreignKey: 'guide_id', as: 'location' });
GuideLocation.belongsTo(Guide, { foreignKey: 'guide_id' });
Guide.hasMany(GuidePayout, { foreignKey: 'guide_id', as: 'payouts' });
GuidePayout.belongsTo(Guide, { foreignKey: 'guide_id' });
Guide.hasMany(GuideTrip, { foreignKey: 'guide_id', as: 'guide_trips' });
GuideTrip.belongsTo(Guide, { foreignKey: 'guide_id' });
User.hasMany(GuideTrip, { foreignKey: 'tourist_id', as: 'tourist_trips' });
GuideTrip.belongsTo(User, { foreignKey: 'tourist_id', as: 'tourist' });
GuidePayout.hasMany(GuideTrip, { foreignKey: 'payout_id' });
GuideTrip.belongsTo(GuidePayout, { foreignKey: 'payout_id', as: 'payout' });
Guide.hasMany(GuideReview, { foreignKey: 'guide_id', as: 'guide_reviews' });
GuideReview.belongsTo(Guide, { foreignKey: 'guide_id' });
GuideReview.belongsTo(User, { foreignKey: 'tourist_id', as: 'reviewer' });
Guide.hasMany(Conversation, { foreignKey: 'guide_id' });
Conversation.belongsTo(Guide, { foreignKey: 'guide_id' });
Conversation.hasMany(Message, { foreignKey: 'conversation_id', as: 'messages' });
Message.belongsTo(Conversation, { foreignKey: 'conversation_id' });

module.exports = {
  sequelize,
  User,
  AuthenticProfile,
  Place,
  AuthenticDetail,
  Review,
  Trip,
  Store,
  Guide,
  GuidePhoto,
  GuideLocation,
  GuidePayout,
  GuideTrip,
  GuideReview,
  Conversation,
  Message
};