import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

jest.mock('@clerk/react', () => ({
  AuthenticateWithRedirectCallback: () => null,
  ClerkProvider: ({ children }) => children,
  useAuth: () => ({ getToken: jest.fn(), isLoaded: true, isSignedIn: false }),
  useClerk: () => ({ openSignIn: jest.fn(), openUserProfile: jest.fn(), signOut: jest.fn() }),
  useSignIn: () => ({ isLoaded: false, signIn: null }),
  useUser: () => ({ isLoaded: true, isSignedIn: false, user: null }),
}));

jest.mock('three/examples/jsm/controls/OrbitControls.js', () => ({
  OrbitControls: jest.fn().mockImplementation(() => ({
    dispose: jest.fn(),
    update: jest.fn(),
  })),
}));

test('renders the Engineering Drawing home page', () => {
  render(<MemoryRouter><App /></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Engineering Drawing', level: 1 })).toBeInTheDocument();
});
