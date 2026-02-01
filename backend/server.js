const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Debug: Log environment variables (only show existence, not values)
console.log('=== Environment Check ===');
console.log('NODE_ENV:', process.env.NODE_ENV ? 'SET' : 'NOT SET');
console.log('PORT:', process.env.PORT ? 'SET' : 'NOT SET');
console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'SET' : 'NOT SET');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? 'SET' : 'NOT SET');
console.log('CORS_ORIGIN:', process.env.CORS_ORIGIN ? 'SET' : 'NOT SET');
console.log('========================');

const { sequelize } = require('./config/database');
const authRoutes = require('./routes/auth');
const placesRoutes = require('./routes/places');
const storesRoutes = require('./routes/stores');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/places', placesRoutes);
app.use('/api/stores', storesRoutes);

// Test route
app.get('/api/test', (req, res) => {
  res.json({ message: 'Backend is working!' });
});

// Start server
const PORT = process.env.PORT || 3001;

sequelize.sync({ alter: false }).then(() => {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Database connected successfully');
  });
}).catch(err => {
  console.error('Unable to connect to database:', err);
});