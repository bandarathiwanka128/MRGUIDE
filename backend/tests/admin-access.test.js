const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

jest.mock('../config/database', () => {
  const model = () => ({
    findByPk: jest.fn(), findOne: jest.fn(), findAll: jest.fn(),
    findAndCountAll: jest.fn(), count: jest.fn(), create: jest.fn(),
  });
  const detail = model();
  detail.unscoped = () => detail;
  return {
    User: model(), AuthenticProfile: model(), AuthenticDetail: detail,
    Place: model(), Review: model(), Trip: model(), Store: model(),
    Guide: model(), GuideLocation: model(), GuideTrip: model(), GuidePayout: model(),
    sequelize: { query: jest.fn() },
  };
});
const db = require('../config/database');
let server;
let base;
const secret = 'test-only-admin-access-secret';
const account = { id: 1, username: 'test-user', email: 'user@example.test', role: 'user', status: 'active' };
const token = (role = 'user') => jwt.sign({ id: 1, role }, secret, { expiresIn: '1h' });
const request = (path, options = {}) => fetch(`${base}${path}`, options);
const authorized = (path, role = 'user', options = {}) => request(path, {
  ...options,
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token(role)}`, ...options.headers },
});

beforeAll(async () => {
  process.env.JWT_SECRET = secret;
  const app = express();
  app.use(express.json());
  app.use('/api/auth', require('../routes/auth'));
  app.use('/api/admin', require('../routes/admin'));
  app.use('/api/admin-guides', require('../routes/admin-guides'));
  app.use('/api/places', require('../routes/places'));
  app.use('/api/stores', require('../routes/stores'));
  app.use('/api/seed', require('../routes/seed'));
  await new Promise(resolve => { server = app.listen(0, '127.0.0.1', resolve); });
  base = `http://127.0.0.1:${server.address().port}`;
});
afterAll(() => new Promise(resolve => server.close(resolve)));
beforeEach(() => {
  jest.clearAllMocks();
  db.User.findByPk.mockResolvedValue({ ...account });
});

const protectedPaths = [
  '/dashboard/stats', '/dashboard/recent', '/users', '/authentic-details',
  '/authentic-details/profiles/list', '/places', '/reviews', '/trips', '/stores',
  '/guides', '/guides/trips/live', '/guides/financials', '/guides/payouts/all', '/guides/commissions/owed',
];
test.each(protectedPaths)('rejects anonymous access to %s', async path => {
  expect((await request(`/api/admin${path}`)).status).toBe(401);
});
test.each(protectedPaths)('rejects a normal user with a stale admin claim at %s', async path => {
  expect((await authorized(`/api/admin${path}`, 'admin')).status).toBe(403);
});
test('rejects invalid, expired and deleted account sessions', async () => {
  expect((await request('/api/admin/auth/me', { headers: { Authorization: 'Bearer invalid' } })).status).toBe(401);
  const expired = jwt.sign({ id: 1, role: 'admin' }, secret, { expiresIn: -1 });
  expect((await request('/api/admin/auth/me', { headers: { Authorization: `Bearer ${expired}` } })).status).toBe(401);
  db.User.findByPk.mockResolvedValue(null);
  expect((await authorized('/api/admin/auth/me')).status).toBe(401);
});
test('uses the database admin role even when the existing token says user', async () => {
  db.User.findByPk.mockResolvedValue({ ...account, role: 'admin' });
  const response = await authorized('/api/admin/auth/me');
  expect(response.status).toBe(200);
  expect((await response.json()).role).toBe('admin');
});
test('blocking an account revokes an already issued token', async () => {
  db.User.findByPk.mockResolvedValue({ ...account, role: 'admin', status: 'blocked' });
  expect((await authorized('/api/admin/auth/me', 'admin')).status).toBe(403);
  expect((await authorized('/api/auth/me', 'admin')).status).toBe(403);
});
test('the existing admin-guides endpoint also checks the current database role', async () => {
  expect((await authorized('/api/admin-guides', 'admin')).status).toBe(403);
});
test('public registration rejects admin and guide roles before writing to the database', async () => {
  for (const role of ['admin', 'guide']) {
    const response = await request('/api/auth/register', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: 'test', email: 'test@example.test', password: 'password123', confirmPassword: 'password123', role }) });
    expect(response.status).toBe(400);
  }
  expect(db.User.create).not.toHaveBeenCalled();
});
test('admin login uses the shared login endpoint and does not return the password hash', async () => {
  db.User.findOne.mockResolvedValue({ ...account, role: 'admin', password: await bcrypt.hash('admin-test-password', 4) });
  const response = await request('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: account.email, password: 'admin-test-password' }) });
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body.user.role).toBe('admin');
  expect(body.user.password).toBeUndefined();
  expect(jwt.verify(body.token, secret).role).toBe('admin');
});
test('normal users cannot approve content through the admin mutation', async () => {
  expect((await authorized('/api/admin/authentic-details/2/approve', 'user', { method: 'PATCH', body: '{}' })).status).toBe(403);
  expect(db.AuthenticDetail.findByPk).not.toHaveBeenCalled();
});
test.each([['approve', true, true], ['reject', false, false]])('admin can %s a submission and save moderation notes', async (action, verified, active) => {
  db.User.findByPk.mockResolvedValue({ ...account, role: 'admin' });
  const detail = { id: 2, update: jest.fn().mockResolvedValue(undefined) };
  db.AuthenticDetail.findByPk.mockResolvedValue(detail);
  const response = await authorized(`/api/admin/authentic-details/2/${action}`, 'admin', { method: 'PATCH', body: JSON.stringify({ admin_notes: 'Reviewed' }) });
  expect(response.status).toBe(200);
  expect(detail.update).toHaveBeenCalledWith({ verified, is_active: active, admin_notes: 'Reviewed' });
});
test('contributors cannot self-approve, change owners or set admin notes through their edit endpoint', async () => {
  const detail = { id: 2, user_id: 1, update: jest.fn().mockResolvedValue(undefined) };
  db.AuthenticDetail.findByPk.mockResolvedValue(detail);
  const response = await authorized('/api/places/authentic-details/2', 'user', { method: 'PUT', body: JSON.stringify({ title: 'Updated', verified: true, is_active: false, user_id: 999, admin_notes: 'Self approved' }) });
  expect(response.status).toBe(200);
  expect(detail.update).toHaveBeenCalledWith({ title: 'Updated', verified: false, is_active: true });
});
test('public place details only include active approved contributions', async () => {
  db.Place.findByPk.mockResolvedValue({ id: 5 });
  expect((await request('/api/places/5')).status).toBe(200);
  const options = db.Place.findByPk.mock.calls[0][1];
  const details = options.include.find(item => item.model === db.AuthenticDetail);
  expect(details.where).toEqual({ verified: true, is_active: true });
  expect(details.required).toBe(false);
});
test('normal users cannot create preapproved content through the legacy seed endpoint', async () => {
  expect((await authorized('/api/seed/seed-places', 'user', { method: 'POST', body: '{}' })).status).toBe(403);
  expect(db.User.create).not.toHaveBeenCalled();
  expect(db.AuthenticDetail.create).not.toHaveBeenCalled();
});
test('anonymous visitors cannot use the legacy seed endpoint', async () => {
  expect((await request('/api/seed/seed-places', { method: 'POST' })).status).toBe(401);
});
test('store owners cannot self-verify or change ownership through their edit endpoint', async () => {
  const store = { id: 2, owner_id: 1, update: jest.fn().mockResolvedValue(undefined) };
  db.Store.findByPk.mockResolvedValue(store);
  const response = await authorized('/api/stores/2', 'user', { method: 'PUT', body: JSON.stringify({ name: 'Updated store', is_verified: true, owner_id: 999, rating: 5 }) });
  expect(response.status).toBe(200);
  expect(store.update).toHaveBeenCalledWith({ name: 'Updated store', is_verified: false });
});
test.each(['0', '-1', 'abc', '1.5', '101'])('rejects invalid pagination limit %s', async value => {
  db.User.findByPk.mockResolvedValue({ ...account, role: 'admin' });
  expect((await authorized(`/api/admin/users?limit=${value}`, 'admin')).status).toBe(400);
});
