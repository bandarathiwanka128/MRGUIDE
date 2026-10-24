const bcrypt = require('bcryptjs');
const { sequelize, User } = require('../config/database');
const { migrateAdmin } = require('./migrate-admin');

async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL || 'admin@mrguide.lk').trim().toLowerCase();
  const password = process.env.ADMIN_PASSWORD;
  if (!password || password.length < 8) {
    throw new Error('Set ADMIN_PASSWORD to a password of at least 8 characters');
  }
  await sequelize.authenticate();
  await User.sync();
  await migrateAdmin();
  const passwordHash = await bcrypt.hash(password, 12);
  const [user, created] = await User.findOrCreate({
    where: { email },
    defaults: { username: email, email, password: passwordHash, role: 'admin', status: 'active' },
  });
  if (!created) await user.update({ role: 'admin', status: 'active', password: passwordHash });
  console.log(`Administrator ${created ? 'created' : 'updated'}: ${email}`);
}

if (require.main === module) {
  seedAdmin()
    .catch(error => { console.error('Admin setup failed:', error.message); process.exitCode = 1; })
    .finally(() => sequelize.close());
}

module.exports = { seedAdmin };
