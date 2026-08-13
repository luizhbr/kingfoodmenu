import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Input } from '../components/Input.js';

describe('Input', () => {
  it('renders label', () => {
    render(<Input label="Nome" placeholder="Seu nome" />);
    expect(screen.getByLabelText('Nome')).toBeInTheDocument();
  });

  it('shows error message', () => {
    render(<Input label="Email" error="Email inválido" />);
    expect(screen.getByText('Email inválido')).toBeInTheDocument();
  });
});
