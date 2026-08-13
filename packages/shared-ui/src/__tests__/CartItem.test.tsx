import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';

import { CartItem } from '../components/CartItem.js';

const item = {
  id: '1',
  name: 'Açaí',
  quantity: 1,
  unitPrice: 9.90,
  options: ['Nutella'],
  onQuantityChange: vi.fn(),
  onRemove: vi.fn(),
};

describe('CartItem', () => {
  it('renders item info', () => {
    render(<CartItem {...item} />);
    expect(screen.getByText('Açaí')).toBeInTheDocument();
    expect(screen.getByText('Nutella')).toBeInTheDocument();
  });

  it('increments quantity', () => {
    render(<CartItem {...item} />);
    fireEvent.click(screen.getByRole('button', { name: /aumentar/i }));
    expect(item.onQuantityChange).toHaveBeenCalledWith(2);
  });

  it('removes item', () => {
    render(<CartItem {...item} />);
    fireEvent.click(screen.getByRole('button', { name: /remover/i }));
    expect(item.onRemove).toHaveBeenCalled();
  });
});
