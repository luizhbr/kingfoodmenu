import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';

import { Button } from '../components/Button.js';

describe('Button', () => {
  it('renders children', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument();
  });

  it('is disabled when disabled prop is true', () => {
    render(<Button disabled>Disabled</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('calls onClick when clicked', () => {
    const handle = vi.fn();
    render(<Button onClick={handle}>Click</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(handle).toHaveBeenCalledTimes(1);
  });
});
