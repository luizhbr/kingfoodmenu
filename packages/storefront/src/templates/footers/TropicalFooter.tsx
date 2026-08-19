import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext.js';

export default function TropicalFooter() {
  const { t } = useTranslation();
  const { settings } = useTheme();

  return (
    <footer className="bg-[#064E3B] text-emerald-200/70">
      <div className="h-1.5 bg-gradient-to-r from-[#FF6B6A] via-[#FFD166] to-[#0B6E4F]" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-3 mb-5">
              {settings.logo ? (
                <img src={settings.logo} alt={settings.siteName} className="w-10 h-10 rounded-full object-cover ring-2 ring-[#FFD166]" />
              ) : (
                <div className="w-10 h-10 bg-[#FFD166] rounded-full flex items-center justify-center">
                  <span className="text-[#0B6B4F] font-extrabold text-lg italic">{settings.siteName.charAt(0)}</span>
                </div>
              )}
              <span className="text-xl font-extrabold text-white" style={{ fontFamily: 'Georgia, serif' }}>{settings.siteName}</span>
            </div>
            <p className="text-sm leading-relaxed">{t('footer.description')}</p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4 uppercase tracking-wider text-sm">{t('footer.quickLinks')}</h4>
            <ul className="space-y-2.5">
              <li><Link to="/menu" className="hover:text-[#FFD166] transition-colors">{t('nav.menu')}</Link></li>
              <li><Link to="/locations" className="hover:text-[#FFD166] transition-colors">{t('nav.locations')}</Link></li>
              <li><Link to="/gallery" className="hover:text-[#FFD166] transition-colors">{t('nav.gallery')}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">{t('footer.contact')}</h4>
            <ul className="space-y-2.5 text-sm">
              <li>📍 {t('footer.address')}</li>
              <li>📞 {t('footer.phone')}</li>
              <li>✉️ {t('footer.email')}</li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-4 text-sm uppercase tracking-wider">{t('footer.hours')}</h4>
            <ul className="space-y-2.5 text-sm">
              <li>{t('footer.hoursMonFri')}</li>
              <li>{t('footer.hoursSat')}</li>
              <li>{t('footer.hoursSun')}</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-white/10 text-center text-sm text-emerald-300/50">
          © {new Date().getFullYear()} {settings.siteName} · {t('footer.rights')}
        </div>
      </div>
    </footer>
  );
}
