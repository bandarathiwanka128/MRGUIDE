import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SiteNav from './SiteNav';
const renderNav = user => render(<MemoryRouter><SiteNav user={user} onLogout={jest.fn()} darkMode onToggleTheme={jest.fn()} /></MemoryRouter>);
test.each([null, { role: 'user', username: 'Traveller' }, { role: 'guide', username: 'Guide' }, { role: 'authentic_user', username: 'Expert' }])('admin navigation stays hidden for ordinary visitors: %j', user => {
  renderNav(user);
  expect(screen.queryByRole('link', { name: /admin panel/i })).not.toBeInTheDocument();
});
test('administrators get a link to the integrated admin panel', () => {
  renderNav({ role: 'admin', username: 'Administrator' });
  const links = screen.getAllByRole('link', { name: /admin panel/i });
  expect(links.length).toBeGreaterThan(0);
  links.forEach(link => expect(link).toHaveAttribute('href', '/admin'));
});
