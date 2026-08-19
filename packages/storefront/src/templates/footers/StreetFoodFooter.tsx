import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext.js';

export default function StreetFoodFooter() {
  const { t } = useTranslation();
  const { settings } = useTheme();

  return (
    <footer className="bg-[#1A1A1A] text-white/60">
      <div className="h-1.5 bg-[#FF2E2E]" />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10">
          <div>
            <div className="flex items-center gap-3 mb-5">
              {settings.logo ? (
                <img src={settings.logo} alt={settings.siteName} className="w-10 h-10 object-cover border-2 border-[#FF2E2E]" />
              ) : (
                <div className="w-10 h-10 bg-[#FF2E2E] flex items-center justify-center -skew-x-6">
                  <span className="text-white font-black text-xl">{settings.siteName.charAt(0)}</span>
                </div>
              )}
              <span className="text-xl font-black text-white uppercase italic">{settings.siteName}</span>
            </div>
            <p className="text-sm leading-relaxed">{t('footer.description')}</p>
          </div>
          <div>
            <h4 className="text-[#FFD600] font-black mb-4 text-xs uppercase tracking-widest">{t('footer.quickLinks')}</h4>
            <ul className="space-y-2.5">
              <li><Link to="/menu" className="hover:text-[#FFD600] transition-colors">{t('nav.menu')}</Link></li>
              <li><Link to="/locations" className="hover:text-[#FFD600] transition-colors">{t('nav.locations')}</Link></li>
              <li><Link to="/gallery" className="hover:text-[#FFD600] transition-colors">{t('nav.gallery')}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[#FFD600] font-black mb-4 text-xs uppercase tracking-widest">{t('footer.contact')}</h4>
            <ul className="space-y-2.5 text-sm">
              <li>📍 {t('footer.address')}</li>
              <li>📞 {t('footer.phone')}</li>
              <li>✉️ {t('footer.email')}</li>
            </ul>
          </div>
          <div>
            <h4 className="text-[#FFD600] font-black mb-4 text-xs uppercase tracking-widest">{t('footer.hours')}</h4>
            <ul className="space-y-2.5 text-sm">
              <li>{t('footer.hoursMonFri')}</li>
              <li>{t('footer.hoursSat')}</li>
              <li>{t('footer.hoursSun')}</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 pt-6 border-t border-white/10 text-center text-sm text-white/40">
          © {new Date().getFullYear()} {settings.siteName} · {t('footer.rights')}
        </div>
      </div>
    </footer>
  );
}
