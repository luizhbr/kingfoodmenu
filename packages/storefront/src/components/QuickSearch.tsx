import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

interface Props {
  initialValue?: string;
  onChange?: (value: string) => void;
}

export function QuickSearch({ initialValue = '', onChange }: Props) {
  const [q, setQ] = useState(initialValue);
  const navigate = useNavigate();
  const [params] = useSearchParams();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const category = params.get('category');
    const query = new URLSearchParams();
    if (q.trim()) query.set('search', q.trim());
    if (category) query.set('category', category);
    navigate(`/menu?${query}`);
  }

  return (
    <form onSubmit={submit} className="py-2">
      <div className="relative">
        <input
          type="search"
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            onChange?.(e.target.value);
          }}
          placeholder="Buscar no cardápio..."
          className="w-full min-h-[48px] rounded-kf-lg border border-kf-border bg-kf-surface pl-11 pr-4 text-sm text-kf-foreground placeholder:text-kf-muted focus:outline-none focus:ring-2 focus:ring-kf-primary/50"
          aria-label="Buscar no cardápio"
        />
        <svg
          className="absolute left-3.5 top-1/2 -translate-y-1/2 h-5 w-5 text-kf-muted"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" />
        </svg>
      </div>
    </form>
  );
}
