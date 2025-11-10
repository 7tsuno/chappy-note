import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import App from './App';

describe('App', () => {
  it('renders widget shell and loading state', () => {
    render(<App />);
    expect(screen.getByRole('heading', { name: 'Chappy Note' })).toBeInTheDocument();
    expect(screen.getByText('ノートを読み込み中です…')).toBeInTheDocument();
  });
});
