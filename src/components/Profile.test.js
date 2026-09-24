import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import Profile from './Profile';
import { useEdgAuth } from '../auth/EdgAuth';

jest.mock('../auth/EdgAuth', () => ({ useEdgAuth: jest.fn(), pendingReferralCode: () => '', clearPendingReferralCode: jest.fn() }));
jest.mock('../services/profile', () => ({ bootstrapProfile: async () => ({ profile: {} }) }));
jest.mock('../services/edgAi', () => ({ buyAiCredits: jest.fn() }));

test.each([false, true])('shows genuine MFA status (%s) and opens secure account management', async (enabled) => {
  const manageAccount = jest.fn();
  useEdgAuth.mockReturnValue({ configured: true, isLoaded: true, isSignedIn: true, user: { twoFactorEnabled: enabled }, getToken: async () => 'test', manageAccount });
  render(<MemoryRouter><Profile /></MemoryRouter>);
  const button = await screen.findByRole('button', { name: enabled ? 'Manage 2FA & recovery' : 'Set up 2FA' });
  expect(screen.getByText(enabled ? /Enabled — your account/ : /Not enabled — add/)).toBeInTheDocument();
  fireEvent.click(button);
  expect(manageAccount).toHaveBeenCalledTimes(1);
});

test('offers the protected wallet and profile controls for a signed-in user', async () => {
  const manageAccount = jest.fn();
  const signOut = jest.fn();
  useEdgAuth.mockReturnValue({
    configured: true,
    isLoaded: true,
    isSignedIn: true,
    accountId: 'account-1',
    user: { fullName: 'Test Engineer', twoFactorEnabled: false },
    getToken: async () => 'test',
    manageAccount,
    signOut,
  });

  render(<MemoryRouter><Profile /></MemoryRouter>);

  expect(await screen.findByRole('button', { name: 'Connect and verify wallet' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'MetaMask Browser extension or mobile app' })).toBeInTheDocument();
  expect(screen.getByText('✓ No private keys')).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Manage sign-in methods' }));
  fireEvent.click(screen.getByRole('button', { name: 'Sign out' }));
  expect(manageAccount).toHaveBeenCalledTimes(1);
  expect(signOut).toHaveBeenCalledTimes(1);
});

test('shows the secure sign-in routes when no account is active', () => {
  const signIn = jest.fn();
  const signInWithGoogle = jest.fn();
  useEdgAuth.mockReturnValue({
    configured: true,
    isLoaded: true,
    isSignedIn: false,
    signIn,
    signInWithGoogle,
  });

  render(<MemoryRouter><Profile /></MemoryRouter>);

  fireEvent.click(screen.getByRole('button', { name: 'GitHub or email sign-in' }));
  expect(signIn).toHaveBeenCalledTimes(1);
  expect(screen.getByText(/Authentication is handled by Clerk/)).toBeInTheDocument();
});
