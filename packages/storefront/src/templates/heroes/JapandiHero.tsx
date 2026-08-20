import { Link } from 'react-router-dom';

interface HeroProps {
  hero: { title?: string; subtitle?: string; ctaPrimaryText?: string; ctaPrimaryLink?: string; ctaSecondaryText?: string; ctaSecondaryLink?: string; backgroundImage?: string } | null;
  t: (key: string) => string;
}

export default function JapandiHero({ hero, t }: HeroProps) {
  return (
    <section className="bg-kf-bg dark:bg-kf-foreground text-kf-foreground dark:text-kf-bg">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-32 lg:py-44 text-center">
        {/* Enso circle */}
        <div className="w-16 h-16 mx-auto mb-10 rounded-full border-2 border-kf-primary/40" style={{ borderRightColor: 'transparent' }} />
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light leading-tight mb-8" style={{ fontFamily: 'Georgia, serif' }}>
          {hero?.title || t('home.heroTitle')}
        </h1>
        <p className="text-lg text-kf-muted dark:text-kf-muted mb-14 max-w-xl mx-auto leading-loose font-light">
          {hero?.subtitle || t('home.heroDescription')}
        </p>
        <div className="flex flex-wrap justify-center gap-8">
          <Link
            to={hero?.ctaPrimaryLink || '/menu'}
            className="inline-flex items-center gap-3 text-kf-primary font-normal tracking-widest uppercase text-sm"
          >
            <span className="w-8 h-px bg-kf-primary" />
            {hero?.ctaPrimaryText || t('home.viewMenu')}
          </Link>
          <Link
            to={hero?.ctaSecondaryLink || '/locations'}
            className="inline-flex items-center gap-3 text-kf-muted dark:text-kf-muted tracking-widest uppercase text-sm hover:text-kf-primary"
          >
            {hero?.ctaSecondaryText || t('home.findLocation')}
            <span className="w-8 h-px bg-current" />
          </Link>
        </div>
      </div>
    </section>
  );
}
