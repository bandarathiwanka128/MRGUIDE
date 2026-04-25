/**
 * One-time migration: approve all existing authentic details
 * that are currently active (is_active=true).
 *
 * Run: node migrate-approve-existing.js
 */
require('dotenv').config();
const { AuthenticDetail } = require('./config/database');

async function run() {
  try {
    const [count] = await AuthenticDetail.update(
      { verified: true },
      { where: { is_active: true, verified: false } }
    );
    console.log(`✅ Approved ${count} existing authentic details.`);
    console.log('All previously visible data is now approved and showing on the map again.');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

run();
