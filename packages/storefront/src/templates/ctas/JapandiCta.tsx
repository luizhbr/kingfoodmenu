import { Link } from 'react-router-dom';

interface CtaProps {
  cta: { title?: string; description?: string; buttonText?: string; buttonLink?: string } | null;
  t: (key: string) => string;
}

export default function JapandiCta({ cta, t }: CtaProps) {
  const title = cta?.title || t('home.readyToOrder');
  const description = cta?.description || t('home.readyToOrderDesc');
  const buttonText = cta?.buttonText || t('home.createAccount');
  const buttonLink = cta?.buttonLink || '/register';

  return (
    <section className="bg-[#D8CFC0] dark:bg-[#24211E] py-24">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <div className="w-12 h-12 mx-auto mb-8 rounded-full border border-[#A63D2E]/40 flex items-center justify-center text-[#A63D2E] text-lg">
          茶
        </div>
        <h2 className="text-3xl md:text-4xl font-light mb-6 text-[#2E2B28] dark:text-[#F7F5EE]" style={{ fontFamily: 'Georgia, serif' }}>
          {title}
        </h2>
        <p className="text-lg font-light text-[#2E2B28]/60 dark:text-[#F7F5EE]/60 mb-12 max-w-lg mx-auto leading-loose">
          {description}
        </p>
        <Link
          to={buttonLink}
          className="inline-flex items-center gap-3 text-[#A63D2E] font-medium tracking-[0.25em] uppercase text-sm hover:opacity-70 transition-opacity"
        >
          <span className="w-10 h-px bg-[#A63D2E]" />
          {buttonText}
        </Link>
      </div>
    </section>
  );
}
