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
  created_by: DataTypes.INTEGER
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

module.exports = {
  sequelize,
  User,
  AuthenticProfile,
  Place,
  AuthenticDetail,
  Review,
  Store
};