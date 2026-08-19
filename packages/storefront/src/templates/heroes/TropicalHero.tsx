import { Link } from 'react-router-dom';

interface HeroProps {
  hero: { title?: string; subtitle?: string; ctaPrimaryText?: string; ctaPrimaryLink?: string; ctaSecondaryText?: string; ctaSecondaryLink?: string; backgroundImage?: string } | null;
  t: (key: string) => string;
}

export default function TropicalHero({ hero, t }: HeroProps) {
  return (
    <section className="relative overflow-hidden bg-[#0B6E4F] text-white">
      {/* Sun */}
      <div className="absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#FFD166]/20 blur-2xl" />
      {/* Leaves */}
      <div className="absolute bottom-0 left-0 w-40 h-40 rounded-full bg-[#FF6B6A]/10 blur-xl" />
      <div className="absolute top-1/3 left-1/4 w-56 h-56 rounded-full bg-[#FFD166]/10 blur-2xl" />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 lg:py-32 text-center">
        <span className="inline-block px-4 py-1.5 rounded-full bg-[#FFD166]/15 border border-[#FFD166]/30 text-[#FFD166] text-xs font-bold uppercase tracking-widest mb-6">
          ✦ {t('home.tagline')}
        </span>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold mb-6 leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
          {hero?.title || t('home.heroTitle')}
        </h1>
        <p className="text-lg text-white/80 mb-10 max-w-2xl mx-auto leading-relaxed">
          {hero?.subtitle || t('home.heroDescription')}
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            to={hero?.ctaPrimaryLink || '/menu'}
            className="inline-flex items-center gap-2 bg-[#FFD166] text-[#0B6B4F] font-bold px-8 py-4 rounded-full hover:bg-[#FFC94D] transition-colors shadow-lg shadow-[#FFD166]/20"
          >
            {hero?.ctaPrimaryText || t('home.viewMenu')}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
          </Link>
          <Link
            to={hero?.ctaSecondaryLink || '/locations'}
            className="inline-flex items-center gap-2 border-2 border-white/30 text-white font-bold px-8 py-4 rounded-full hover:bg-white/10"
          >
            {hero?.ctaSecondaryText || t('home.findLocation')}
          </Link>
        </div>
      </div>
    </section>
  );
}
