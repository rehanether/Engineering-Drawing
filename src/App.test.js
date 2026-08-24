import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from './App';

jest.mock('three/examples/jsm/controls/OrbitControls.js', () => ({
  OrbitControls: jest.fn().mockImplementation(() => ({
    dispose: jest.fn(),
    update: jest.fn(),
  })),
}));

test('renders the Engineering Drawing home page', () => {
  render(<MemoryRouter><App /></MemoryRouter>);
  expect(screen.getByRole('heading', { name: 'Tell us what you want to build.', level: 1 })).toBeInTheDocument();
});
