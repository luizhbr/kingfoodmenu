import { Suspense } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext.js';
import { footerVariants } from '../templates/footers/index.js';
import type { TemplateId } from '../templates/index.js';

function ClassicFooter() {
  const { t } = useTranslation();
  const { settings } = useTheme();
  const year = new Date().getFullYear();

  return (
    <footer className="bg-ink text-cream/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6">
        {/* Marca + localização */}
        <div className="text-center mb-4">
          <div className="flex items-center justify-center gap-2 mb-1.5">
            {settings.logo ? (
              <img src={settings.logo} alt={settings.siteName} className="w-7 h-7 rounded-lg object-cover bg-[#FFD100]" />
            ) : (
              <div className="w-7 h-7 bg-[#FFD100] rounded-lg flex items-center justify-center">
                <span className="text-ink font-bold text-sm">{settings.siteName.charAt(0)}</span>
              </div>
            )}
            <span className="text-lg font-extrabold text-cream">{settings.siteName}</span>
          </div>
          <p className="text-xs text-cream/60">Açaí brasileiro · Columbus, OH</p>
        </div>

        {/* Links em linha compactos */}
        <nav className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm mb-4" aria-label="Rodapé">
          <Link to="/menu" className="min-h-[44px] inline-flex items-center hover:text-[#FFD100] transition-colors font-medium">
            {t('nav.menu')}
          </Link>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('open-hours'))}
            className="min-h-[44px] inline-flex items-center hover:text-[#FFD100] transition-colors font-medium"
          >
            Horários
          </button>
          <a
            href="https://instagram.com/king.food_delivery"
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] inline-flex items-center hover:text-[#FFD100] transition-colors font-medium"
          >
            Instagram
          </a>
          <a
            href="https://wa.me/12673107535"
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] inline-flex items-center hover:text-[#FFD100] transition-colors font-medium"
          >
            Grupo WA
          </a>
          <a
            href="https://wa.me/12673107535"
            target="_blank"
            rel="noopener noreferrer"
            className="min-h-[44px] inline-flex items-center hover:text-[#FFD100] transition-colors font-medium"
          >
            Contato
          </a>
        </nav>

        {/* Legal compacto */}
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-cream/50 border-t border-cream/10 pt-3">
          <Link to="/privacy-policy" className="min-h-[36px] inline-flex items-center hover:text-cream transition-colors">
            Privacidade
          </Link>
          <span className="text-cream/20" aria-hidden>·</span>
          <Link to="/impressum" className="min-h-[36px] inline-flex items-center hover:text-cream transition-colors">
            Termos
          </Link>
          <span className="text-cream/20" aria-hidden>·</span>
          <button
            type="button"
            onClick={() => window.dispatchEvent(new Event('open-cookie-settings'))}
            className="min-h-[36px] inline-flex items-center hover:text-cream transition-colors"
          >
            Cookies
          </button>
          <span className="w-full sm:w-auto text-center">
            © {year} {settings.siteName}
          </span>
        </div>
      </div>
    </footer>
  );
}

export default function Footer() {
  const { settings } = useTheme();
  const templateId = (settings.storefrontTemplate || 'classic') as TemplateId;
  const VariantFooter = footerVariants[templateId];

  if (VariantFooter) {
    return (
      <Suspense fallback={<div className="h-32 bg-gray-900" />}>
        <VariantFooter />
      </Suspense>
    );
  }

  return <ClassicFooter />;
}
