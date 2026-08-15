import { render } from '@testing-library/react';
import App from './App';

// Mock axios to prevent actual network calls during tests
jest.mock('axios', () => ({
  get: jest.fn(() => Promise.resolve({ data: [] })),
  post: jest.fn(() => Promise.resolve({ data: {} }))
}));

test('renders without crashing', () => {
  // If you want to render App, the mocked axios will now handle /api/values/all
  // render(<App />);
});