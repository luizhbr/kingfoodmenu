import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { fireEvent } from '@testing-library/react';

import { ProductCard } from '../components/ProductCard.js';

const product = {
  id: '1',
  name: 'Smash Burger',
  description: 'Duplo smash',
  price: 13.90,
  onAdd: vi.fn(),
};

describe('ProductCard', () => {
  it('renders name and price', () => {
    render(<ProductCard {...product} />);
    expect(screen.getByText('Smash Burger')).toBeInTheDocument();
    expect(screen.getByText('$13.90')).toBeInTheDocument();
  });

  it('calls onAdd when add button clicked', () => {
    render(<ProductCard {...product} />);
    fireEvent.click(screen.getByRole('button', { name: /adicionar/i }));
    expect(product.onAdd).toHaveBeenCalledTimes(1);
  });
});
