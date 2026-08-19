import { Link } from 'react-router-dom';

interface CtaProps {
  cta: { title?: string; description?: string; buttonText?: string; buttonLink?: string } | null;
  t: (key: string) => string;
}

export default function ArtDecoCta({ cta, t }: CtaProps) {
  const title = cta?.title || t('home.readyToOrder');
  const description = cta?.description || t('home.readyToOrderDesc');
  const buttonText = cta?.buttonText || t('home.createAccount');
  const buttonLink = cta?.buttonLink || '/register';

  return (
    <section className="bg-[#7A1E1E] py-20 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-conic-gradient(from 45deg, #C9A227 0deg 4deg, transparent 4deg 12deg)' }} />
      <div className="relative max-w-3xl mx-auto px-4 text-center">
        <div className="flex items-center justify-center gap-3 mb-6">
          <span className="w-12 h-px bg-[#C9A227]" />
          <span className="text-[#C9A227]">◆</span>
          <span className="w-12 h-px bg-[#C9A227]" />
        </div>
        <h2 className="text-3xl md:text-4xl font-black text-[#F5EFE0] uppercase tracking-wide mb-4" style={{ fontFamily: 'Georgia, serif' }}>
          {title}
        </h2>
        <p className="text-lg text-[#F5EFE0]/70 mb-10 max-w-xl mx-auto">{description}</p>
        <Link
          to={buttonLink}
          className="inline-block bg-[#C9A227] text-[#111] font-black uppercase tracking-widest text-sm px-12 py-4 hover:bg-[#DDB94A] transition-colors"
        >
          {buttonText}
        </Link>
      </div>
    </section>
  );
}
