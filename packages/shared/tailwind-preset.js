/** @type {import('tailwindcss').Config} */
module.exports = {
  theme: {
    extend: {
      colors: {
        kf: {
          bg: 'var(--kf-bg)',
          surface: 'var(--kf-surface)',
          'surface-muted': 'var(--kf-surface-muted)',
          foreground: 'var(--kf-foreground)',
          muted: 'var(--kf-muted)',
          border: 'var(--kf-border)',
          primary: 'var(--kf-primary)',
          'primary-hover': 'var(--kf-primary-hover)',
          'primary-fg': 'var(--kf-primary-fg)',
          secondary: 'var(--kf-secondary)',
          accent: 'var(--kf-accent)',
          success: 'var(--kf-success)',
          warning: 'var(--kf-warning)',
          danger: 'var(--kf-danger)',
          info: 'var(--kf-info)',
          cream: 'var(--kf-cream)',
          ink: 'var(--kf-ink)',
        },
      },
      borderRadius: {
        'kf-sm': 'var(--kf-radius-sm)',
        'kf-md': 'var(--kf-radius-md)',
        'kf-lg': 'var(--kf-radius-lg)',
        'kf-pill': 'var(--kf-radius-pill)',
      },
      boxShadow: {
        'kf-subtle': 'var(--kf-shadow-subtle)',
        'kf-card': 'var(--kf-shadow-card)',
        'kf-elevated': 'var(--kf-shadow-elevated)',
        'kf-modal': 'var(--kf-shadow-modal)',
      },
      transitionDuration: {
        'kf-fast': 'var(--kf-duration-fast)',
        'kf-normal': 'var(--kf-duration-normal)',
        'kf-slow': 'var(--kf-duration-slow)',
      },
      fontFamily: {
        sans: ['var(--kf-font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--kf-font-display)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      spacing: {
        'kf-nav': 'var(--kf-nav-h)',
      },
      zIndex: {
        'kf-content': 0,
        'kf-sticky': 10,
        'kf-header': 40,
        'kf-bottom-nav': 50,
        'kf-cart-bar': 55,
        'kf-drawer': 60,
        'kf-dropdown': 65,
        'kf-modal': 70,
        'kf-toast': 90,
      },
    },
  },
};
