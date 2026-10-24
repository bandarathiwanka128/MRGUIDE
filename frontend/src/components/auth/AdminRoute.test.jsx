import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AdminRoute from './AdminRoute';

function renderRoute(user) {
  return render(<MemoryRouter initialEntries={['/admin/users']}><Routes>
    <Route path="/admin/*" element={<AdminRoute user={user}><div>Protected admin content</div></AdminRoute>} />
    <Route path="/login" element={<div>Login page</div>} />
    <Route path="/" element={<div>Public home</div>} />
  </Routes></MemoryRouter>);
}
test('anonymous visitors are redirected to login', () => {
  renderRoute(null);
  expect(screen.getByText('Login page')).toBeInTheDocument();
  expect(screen.queryByText('Protected admin content')).not.toBeInTheDocument();
});
test.each(['user', 'authentic_user', 'guide'])('a %s cannot open an admin URL directly', role => {
  renderRoute({ role });
  expect(screen.getByText('Public home')).toBeInTheDocument();
  expect(screen.queryByText('Protected admin content')).not.toBeInTheDocument();
});
test('an administrator can open admin pages', () => {
  renderRoute({ role: 'admin' });
  expect(screen.getByText('Protected admin content')).toBeInTheDocument();
});
