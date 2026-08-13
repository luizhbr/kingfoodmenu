import { Link } from 'react-router-dom';

interface Props {
  title?: string;
  subtitle?: string;
  cta?: string;
  href?: string;
}

export function PromoBanner({
  title = 'Açaí do King',
  subtitle = '500ml com 2 complementos grátis hoje',
  cta = 'Aproveitar',
  href = '/menu',
}: Props) {
  return (
    <section className="px-4 sm:px-6 py-3">
      <Link
        to={href}
        className="block rounded-kf-lg bg-kf-primary/15 border border-kf-primary/30 p-4 hover:bg-kf-primary/20 active:scale-[0.99] transition"
      >
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-kf-primary-fg/70">Promoção</p>
            <p className="text-base font-bold text-kf-foreground">{title}</p>
            <p className="text-sm text-kf-muted">{subtitle}</p>
          </div>
          <span className="shrink-0 rounded-kf-md bg-kf-primary px-3 py-1.5 text-sm font-bold text-kf-primary-fg">
            {cta}
          </span>
        </div>
      </Link>
    </section>
  );
}
