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
