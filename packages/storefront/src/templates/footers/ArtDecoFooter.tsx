import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext.js';

export default function ArtDecoFooter() {
  const { t } = useTranslation();
  const { settings } = useTheme();

  return (
    <footer className="bg-[#111111] text-[#F5EFE0]/60">
      <div className="h-1 bg-gradient-to-r from-[#7A1E1E] via-[#C9A227] to-[#7A1E1E]" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-3 mb-5">
              {settings.logo ? (
                <img src={settings.logo} alt={settings.siteName} className="w-10 h-10 rounded object-cover border border-[#C9A227]" />
              ) : (
                <div className="w-10 h-10 bg-[#C9A227] flex items-center justify-center" style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 75%, 50% 100%, 0% 75%, 0% 25%)' }}>
                  <span className="text-[#111] font-black text-lg">{settings.siteName.charAt(0)}</span>
                </div>
              )}
              <span className="text-lg font-black text-[#F5EFE0] tracking-[0.15em] uppercase" style={{ fontFamily: 'Georgia, serif' }}>{settings.siteName}</span>
            </div>
            <p className="text-sm leading-relaxed">{t('footer.description')}</p>
          </div>
          <div>
            <h4 className="text-[#C9A227] font-bold mb-4 text-xs uppercase tracking-[0.2em]">{t('footer.quickLinks')}</h4>
            <ul className="space-y-2.5">
              <li><Link to="/menu" className="hover:text-[#C9A227] transition-colors">{t('nav.menu')}</Link></li>
              <li><Link to="/locations" className="hover:text-[#C9A227] transition-colors">{t('nav.locations')}</Link></li>
              <li><Link to="/gallery" className="hover:text-[#C9A227] transition-colors">{t('nav.gallery')}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[#C9A227] font-bold mb-4 text-xs uppercase tracking-[0.2em]">{t('footer.contact')}</h4>
            <ul className="space-y-2.5 text-sm">
              <li>📍 {t('footer.address')}</li>
              <li>📞 {t('footer.phone')}</li>
              <li>✉️ {t('footer.email')}</li>
            </ul>
          </div>
          <div>
            <h4 className="text-[#C9A227] font-bold mb-4 text-xs uppercase tracking-[0.2em]">{t('footer.hours')}</h4>
            <ul className="space-y-2.5 text-sm">
              <li>{t('footer.hoursMonFri')}</li>
              <li>{t('footer.hoursSat')}</li>
              <li>{t('footer.hoursSun')}</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-[#C9A227]/20 text-center text-sm text-[#F5EFE0]/40">
          ◆ © {new Date().getFullYear()} {settings.siteName} ◆
        </div>
      </div>
    </footer>
  );
}
