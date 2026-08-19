import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../context/ThemeContext.js';

export default function JapandiFooter() {
  const { t } = useTranslation();
  const { settings } = useTheme();

  return (
    <footer className="bg-[#2E2B28] text-white/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-12">
          <div>
            <div className="flex items-center gap-3 mb-5">
              {settings.logo ? (
                <img src={settings.logo} alt={settings.siteName} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#A63D2F] flex items-center justify-center">
                  <span className="text-[#F7F5EE] font-light text-base" style={{ fontFamily: 'Georgia, serif' }}>{settings.siteName.charAt(0)}</span>
                </div>
              )}
              <span className="text-sm font-light tracking-[0.25em] uppercase text-white/90" style={{ fontFamily: 'Georgia, serif' }}>{settings.siteName}</span>
            </div>
            <p className="text-sm font-light leading-relaxed">{t('footer.description')}</p>
          </div>
          <div>
            <h4 className="text-white/70 font-light mb-5 text-[11px] tracking-[0.25em] uppercase">{t('footer.quickLinks')}</h4>
            <ul className="space-y-3 font-light">
              <li><Link to="/menu" className="hover:text-white transition-colors">{t('nav.menu')}</Link></li>
              <li><Link to="/locations" className="hover:text-white transition-colors">{t('nav.locations')}</Link></li>
              <li><Link to="/gallery" className="hover:text-white transition-colors">{t('nav.gallery')}</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white/70 font-light mb-5 text-xs tracking-[0.25em] uppercase">{t('footer.contact')}</h4>
            <ul className="space-y-3 text-sm font-light">
              <li>{t('footer.address')}</li>
              <li>{t('footer.phone')}</li>
              <li>{t('footer.email')}</li>
            </ul>
          </div>
          <div>
            <h4 className="text-white/70 font-light mb-5 text-xs tracking-[0.25em] uppercase">{t('footer.hours')}</h4>
            <ul className="space-y-3 text-sm font-light">
              <li>{t('footer.hoursMonFri')}</li>
              <li>{t('footer.hoursSat')}</li>
              <li>{t('footer.hoursSun')}</li>
            </ul>
          </div>
        </div>
        <div className="mt-12 pt-6 border-t border-white/10 text-center text-xs font-light tracking-[0.2em] uppercase text-white/30">
          {settings.siteName} · {new Date().getFullYear()}
        </div>
      </div>
    </footer>
  );
}
