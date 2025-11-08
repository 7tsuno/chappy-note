import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders placeholder text', () => {
    render(<App />);
    expect(screen.getByText('Chappy Note Widget')).toBeInTheDocument();
  });
});
