const { sequelize } = require('../config/database');

async function migrateAdmin() {
  // Additive and repeatable; do not alter existing roles, approvals or records.
  await sequelize.query(`ALTER TABLE IF EXISTS users
    ADD COLUMN IF NOT EXISTS status VARCHAR(255) NOT NULL DEFAULT 'active'`);
  await sequelize.query(`ALTER TABLE IF EXISTS authentic_details
    ADD COLUMN IF NOT EXISTS admin_notes TEXT`);
}

if (require.main === module) {
  migrateAdmin()
    .then(() => console.log('Admin schema migration complete'))
    .catch(error => { console.error('Admin migration failed:', error.message); process.exitCode = 1; })
    .finally(() => sequelize.close());
}

module.exports = { migrateAdmin };
