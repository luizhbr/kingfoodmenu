import { Link } from 'react-router-dom';

interface CtaProps {
  cta: { title?: string; description?: string; buttonText?: string; buttonLink?: string } | null;
  t: (key: string) => string;
}

export default function TropicalCta({ cta, t }: CtaProps) {
  const title = cta?.title || t('home.readyToOrder');
  const description = cta?.description || t('home.readyToOrderDesc');
  const buttonText = cta?.buttonText || t('home.createAccount');
  const buttonLink = cta?.buttonLink || '/register';

  return (
    <section className="bg-[#FF6B6A] py-20 relative overflow-hidden">
      <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-[#FFD166]/20 blur-2xl" />
      <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/10 blur-2xl" />
      <div className="relative max-w-3xl mx-auto px-4 text-center">
        <h2 className="text-3xl md:text-4xl font-extrabold text-white mb-4" style={{ fontFamily: 'Georgia, serif' }}>
          {title}
        </h2>
        <p className="text-lg text-white/85 mb-10 max-w-xl mx-auto">
          {description}
        </p>
        <Link
          to={buttonLink}
          className="inline-flex items-center gap-2 bg-[#0B6E4F] text-white font-bold px-10 py-4 rounded-full hover:bg-[#095A42] transition-colors shadow-xl"
        >
          {buttonText}
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
        </Link>
      </div>
    </section>
  );
}
