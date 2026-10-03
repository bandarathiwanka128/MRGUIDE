import { render, screen } from '@testing-library/react';
import App from './App';


test('renders the app shell', () => {
  render(<App />);

  expect(screen.getAllByRole('link', { name: /home/i }).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/find a guide/i).length).toBeGreaterThan(0);
});
