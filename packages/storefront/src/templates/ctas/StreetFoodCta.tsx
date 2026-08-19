import { Link } from 'react-router-dom';

interface CtaProps {
  cta: { title?: string; description?: string; buttonText?: string; buttonLink?: string } | null;
  t: (key: string) => string;
}

export default function StreetFoodCta({ cta, t }: CtaProps) {
  const title = cta?.title || t('home.readyToOrder');
  const description = cta?.description || t('home.readyToOrderDesc');
  const buttonText = cta?.buttonText || t('home.createAccount');
  const buttonLink = cta?.buttonLink || '/register';

  return (
    <section className="bg-[#FF2E2E] py-20 relative overflow-hidden">
      <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(-45deg, #1A1A1A 0 3px, transparent 3px 18px)' }} />
      <div className="relative max-w-3xl mx-auto px-4 text-center">
        <h2 className="text-4xl md:text-5xl font-black uppercase text-white mb-4 leading-tight">
          {title}
        </h2>
        <p className="text-lg text-white/85 mb-10 max-w-xl mx-auto">{description}</p>
        <Link
          to={buttonLink}
          className="inline-block bg-[#FFD600] text-[#1A1A1A] font-black uppercase tracking-widest text-sm px-12 py-4 -skew-x-6 hover:bg-[#FFE33D] transition-colors shadow-[6px_6px_0_#1A1A1A]"
        >
          <span className="inline-block skew-x-6">{buttonText}</span>
        </Link>
      </div>
    </section>
  );
}
