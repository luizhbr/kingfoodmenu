// King Food Design Tokens V2
// Shared foundation for storefront, admin, mobile, checkout, kitchen, driver.

export const tokens = {
  color: {
    background: '#F5F3EF',      // light warm neutral
    surface: '#FFFFFF',
    'surface-muted': '#FAF8F4',
    foreground: '#221D25',       // ink
    muted: '#6B6570',
    border: '#E8E4DC',
    primary: '#FFD100',        // King Food gold
    'primary-hover': '#E6BC00',
    'primary-foreground': '#1A1A1A',
    secondary: '#7B6DA8',        // lavender
    accent: '#B8C438',           // lime
    success: '#16A34A',
    warning: '#D97706',
    danger: '#DC2626',
    info: '#2563EB',
    cream: '#E2DDCF',
    ink: '#221D25',
  },
  spacing: {
    0: '0rem',
    1: '0.25rem',
    2: '0.5rem',
    3: '0.75rem',
    4: '1rem',
    5: '1.25rem',
    6: '1.5rem',
    8: '2rem',
    10: '2.5rem',
    12: '3rem',
    16: '4rem',
    20: '5rem',
    24: '6rem',
  },
  radius: {
    small: '0.375rem',   // 6px
    medium: '0.75rem',   // 12px
    large: '1rem',       // 16px
    pill: '9999px',
  },
  shadow: {
    none: 'none',
    subtle: '0 1px 2px rgba(0,0,0,0.05)',
    card: '0 2px 8px rgba(0,0,0,0.06)',
    elevated: '0 4px 16px rgba(0,0,0,0.08)',
    modal: '0 8px 32px rgba(0,0,0,0.12)',
  },
  motion: {
    fast: '150ms',
    normal: '250ms',
    slow: '400ms',
  },
  breakpoint: {
    mobile: '0px',
    tablet: '768px',
    desktop: '1024px',
    large: '1440px',
  },
  zIndex: {
    content: 0,
    sticky: 10,
    header: 40,
    'bottom-nav': 50,
    drawer: 60,
    dropdown: 65,
    modal: 70,
    toast: 90,
  },
} as const;

export type Tokens = typeof tokens;
export type TokenColor = keyof Tokens['color'];
export type TokenSpacing = keyof Tokens['spacing'];
export type TokenRadius = keyof Tokens['radius'];
export type TokenShadow = keyof Tokens['shadow'];
export type TokenZIndex = keyof Tokens['zIndex'];
