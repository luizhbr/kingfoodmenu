import { Link } from 'react-router-dom';

interface HeroProps {
  hero: { title?: string; subtitle?: string; ctaPrimaryText?: string; ctaPrimaryLink?: string; ctaSecondaryText?: string; ctaSecondaryLink?: string; backgroundImage?: string } | null;
  t: (key: string) => string;
}

export default function StreetFoodHero({ hero, t }: HeroProps) {
  return (
    <section className="bg-[#1A1A1A] text-white relative overflow-hidden">
      {/* Diagonal stripes */}
      <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'repeating-linear-gradient(45deg, #FF2E2E 0 2px, transparent 2px 24px)' }} />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32">
        <div className="max-w-3xl">
          <span className="inline-block -skew-x-6 bg-[#FF2E2E] text-white font-black uppercase text-xs tracking-widest px-4 py-2 mb-8">
            🔥 {t('home.tagline')}
          </span>
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black uppercase leading-[0.95] mb-6">
            {hero?.title || t('home.heroTitle')}
          </h1>
          <p className="text-lg text-white/70 mb-10 max-w-xl leading-relaxed">
            {hero?.subtitle || t('home.heroDescription')}
          </p>
          <div className="flex flex-wrap gap-4">
            <Link
              to={hero?.ctaPrimaryLink || '/menu'}
              className="bg-[#FF2E2E] text-white font-black uppercase tracking-wide text-sm px-10 py-4 -skew-x-6 hover:bg-[#FF4D4D] transition-colors shadow-[6px_6px_0_#FFD600]"
            >
              <span className="inline-block skew-x-6">{hero?.ctaPrimaryText || t('home.viewMenu')}</span>
            </Link>
            <Link
              to={hero?.ctaSecondaryLink || '/locations'}
              className="border-2 border-white/40 text-white font-black uppercase tracking-wide text-sm px-10 py-4 hover:border-[#FFD600] hover:text-[#FFD600] transition-colors"
            >
              {hero?.ctaSecondaryText || t('home.findLocation')}
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
