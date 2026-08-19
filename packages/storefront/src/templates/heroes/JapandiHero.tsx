import { Link } from 'react-router-dom';

interface HeroProps {
  hero: { title?: string; subtitle?: string; ctaPrimaryText?: string; ctaPrimaryLink?: string; ctaSecondaryText?: string; ctaSecondaryLink?: string; backgroundImage?: string } | null;
  t: (key: string) => string;
}

export default function JapandiHero({ hero, t }: HeroProps) {
  return (
    <section className="bg-[#F7F5EE] dark:bg-[#2E2B28] text-[#2E2B28] dark:text-[#F7F5EE]">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-32 lg:py-44 text-center">
        {/* Enso circle */}
        <div className="w-16 h-16 mx-auto mb-10 rounded-full border-2 border-[#A63D2E]/40" style={{ borderRightColor: 'transparent' }} />
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-light leading-tight mb-8" style={{ fontFamily: 'Georgia, serif' }}>
          {hero?.title || t('home.heroTitle')}
        </h1>
        <p className="text-lg text-[#2E2B28]/60 dark:text-[#F7F5EE]/60 mb-14 max-w-xl mx-auto leading-loose font-light">
          {hero?.subtitle || t('home.heroDescription')}
        </p>
        <div className="flex flex-wrap justify-center gap-8">
          <Link
            to={hero?.ctaPrimaryLink || '/menu'}
            className="inline-flex items-center gap-3 text-[#A63D2E] font-normal tracking-widest uppercase text-sm"
          >
            <span className="w-8 h-px bg-[#A63D2E]" />
            {hero?.ctaPrimaryText || t('home.viewMenu')}
          </Link>
          <Link
            to={hero?.ctaSecondaryLink || '/locations'}
            className="inline-flex items-center gap-3 text-[#2E2B28]/50 dark:text-[#F7F5EE]/50 tracking-widest uppercase text-sm hover:text-[#A63D2E]"
          >
            {hero?.ctaSecondaryText || t('home.findLocation')}
            <span className="w-8 h-px bg-current" />
          </Link>
        </div>
      </div>
    </section>
  );
}
