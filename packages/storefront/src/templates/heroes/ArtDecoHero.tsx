import { Link } from 'react-router-dom';

interface HeroProps {
  hero: { title?: string; subtitle?: string; ctaPrimaryText?: string; ctaPrimaryLink?: string; ctaSecondaryText?: string; ctaSecondaryLink?: string; backgroundImage?: string } | null;
  t: (key: string) => string;
}

export default function ArtDecoHero({ hero, t }: HeroProps) {
  return (
    <section className="relative bg-[#111111] text-[#F5EFE0] overflow-hidden">
      {/* Sunburst background */}
      <div className="absolute inset-0 opacity-10" style={{
        backgroundImage: 'repeating-conic-gradient(from 0deg, #C9A227 0deg 5deg, transparent 5deg 15deg)',
      }} />
      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-28 lg:py-36 text-center">
        <div className="flex items-center justify-center gap-4 mb-8">
          <span className="w-16 h-px bg-[#C9A227]" />
          <span className="text-[#C9A227] text-xl">◆</span>
          <span className="w-16 h-px bg-[#C9A227]" />
        </div>
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black uppercase tracking-[0.08em] mb-6 leading-tight" style={{ fontFamily: 'Georgia, serif' }}>
          {hero?.title || t('home.heroTitle')}
        </h1>
        <p className="text-lg text-[#F5EFE0]/70 mb-12 max-w-2xl mx-auto leading-relaxed">
          {hero?.subtitle || t('home.heroDescription')}
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            to={hero?.ctaPrimaryLink || '/menu'}
            className="bg-[#C9A227] text-[#111] font-black uppercase tracking-widest text-sm px-10 py-4 hover:bg-[#DDB94A] transition-colors"
          >
            {hero?.ctaPrimaryText || t('home.viewMenu')}
          </Link>
          <Link
            to={hero?.ctaSecondaryLink || '/locations'}
            className="border-2 border-[#C9A227] text-[#C9A227] font-black uppercase tracking-widest text-sm px-10 py-4 hover:bg-[#C9A227]/10 transition-colors"
          >
            {hero?.ctaSecondaryText || t('home.findLocation')}
          </Link>
        </div>
      </div>
    </section>
  );
}
