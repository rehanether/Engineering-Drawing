import { act, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import SsoCallback from './SsoCallback';

jest.mock('@clerk/react', () => ({
  AuthenticateWithRedirectCallback: () => null,
}));

test('offers a safe recovery path when the OAuth callback stalls', () => {
  jest.useFakeTimers();
  const error = jest.spyOn(console, 'error').mockImplementation(() => {});
  render(<MemoryRouter><SsoCallback /></MemoryRouter>);

  expect(screen.getByText('Completing secure sign-in…')).toBeInTheDocument();
  act(() => jest.advanceTimersByTime(15000));
  expect(screen.getByRole('alert')).toHaveTextContent('Sign-in did not finish');
  expect(screen.getByRole('link', { name: /return to profile/i })).toHaveAttribute('href', '/profile');

  error.mockRestore();
  jest.useRealTimers();
});
