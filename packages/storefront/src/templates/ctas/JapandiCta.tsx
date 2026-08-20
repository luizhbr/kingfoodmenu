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
    <section className="bg-kf-surface-muted dark:bg-kf-foreground py-24">
      <div className="max-w-3xl mx-auto px-4 text-center">
        <div className="w-12 h-12 mx-auto mb-8 rounded-full border border-kf-primary/40 flex items-center justify-center text-kf-primary text-lg">
          茶
        </div>
        <h2 className="text-3xl md:text-4xl font-light mb-6 text-kf-foreground dark:text-kf-bg" style={{ fontFamily: 'Georgia, serif' }}>
          {title}
        </h2>
        <p className="text-lg font-light text-kf-muted dark:text-kf-muted mb-12 max-w-lg mx-auto leading-loose">
          {description}
        </p>
        <Link
          to={buttonLink}
          className="inline-flex items-center gap-3 text-kf-primary font-medium tracking-[0.25em] uppercase text-sm hover:opacity-70 transition-opacity"
        >
          <span className="w-10 h-px bg-kf-primary" />
          {buttonText}
        </Link>
      </div>
    </section>
  );
}
