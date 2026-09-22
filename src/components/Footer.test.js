import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Footer from './Footer';

test('footer exposes accessible links and securely opens the official Facebook page', () => {
  render(<MemoryRouter><Footer /></MemoryRouter>);
  const facebook = screen.getByRole('link', { name: 'Engineering Drawing on Facebook' });
  expect(facebook).toHaveAttribute('href', 'https://www.facebook.com/profile.php?id=61579977430470');
  expect(facebook).toHaveAttribute('rel', 'noopener noreferrer');
  expect(screen.getAllByRole('link')).toHaveLength(9);
  expect(facebook.querySelector('svg')).toHaveAttribute('aria-hidden', 'true');
  expect(screen.getByRole('link', { name: 'Engineering Drawing on LinkedIn' })).toHaveAttribute('href', 'https://www.linkedin.com/company/engineeringdrawing/');
  expect(screen.getByRole('link', { name: 'WhatsApp Engineering Drawing' })).toHaveAttribute('href', 'https://wa.me/919472187321');
  expect(screen.getByRole('link', { name: 'Telegram Engineering Drawing' })).toHaveAttribute('href', 'https://t.me/+919472187321');
  expect(screen.getByRole('link', { name: 'Engineering Drawing on X' })).toHaveAttribute('href', 'https://x.com/EnggDrawIO');
});
