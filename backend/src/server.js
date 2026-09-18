/**
 * Nankwanya API Server
 * Named in tribute to Hajj Mohamod Nankwanya (215-time voluntary blood donor, Uganda)
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');

const facilityRoutes = require('./routes/facilityRoutes');
const donorRoutes = require('./routes/donorRoutes');
const requestRoutes = require('./routes/requestRoutes');
const alertRoutes = require('./routes/alertRoutes');
const statsRoutes = require('./routes/statsRoutes');
const store = require('./models/store');
const { seedDatabase } = require('../../seed/seedData');

const app = express();
const PORT = process.env.PORT || 5000;

// Middlewares
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Health / Tribute Root Probe
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    platform: 'Nankwanya - Blood Donation Mobilization Platform (Uganda)',
    tribute: 'In honor of Hajj Mohamod Nankwanya (215 voluntary blood donations, Uganda Red Cross Society)',
    timestamp: new Date().toISOString(),
    geofenceEngine: 'Haversine Spherical Distance (MVP O(n))',
    smsGateway: 'Pandora SMS API (Uganda)',
    deployment: process.env.VERCEL ? 'Vercel Serverless' : 'Standalone Node.js Server'
  });
});

// API Routes
app.use('/api/facilities', facilityRoutes);
app.use('/api/donors', donorRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/stats', statsRoutes);

// Auto-seed database if empty
async function ensureSeeded() {
  try {
    const facilities = await store.getFacilities();
    if (!facilities || facilities.length === 0) {
      console.log('[Server Startup] Store is empty. Running initial Mbarara seed data...');
      await seedDatabase(store);
    }
  } catch (err) {
    console.warn('[Server Startup] Seed check notice:', err.message);
  }
}

// Initial seed execution
ensureSeeded();

// Only listen on port if running locally or in standalone mode (not on Vercel serverless)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n=============================================================`);
    console.log(`  🩸 NANKWANYA BACKEND API SERVER RUNNING`);
    console.log(`  Honor to Hajj Mohamod Nankwanya (Uganda Blood Mobilizer)`);
    console.log(`  Port: http://localhost:${PORT}`);
    console.log(`  Health Check: http://localhost:${PORT}/api/health`);
    console.log(`=============================================================\n`);
  });
}

module.exports = app;
