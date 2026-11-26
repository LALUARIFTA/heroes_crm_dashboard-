export default {
  content: ['./index.html', './public/scripts/*.js'],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter Variable', 'system-ui', '-apple-system', 'sans-serif'] },
      colors: {
        sidebar: 'var(--sidebar-bg)',
        primary: {
          DEFAULT: 'var(--primary)',
          hover: 'var(--primary-hover)',
          soft: 'var(--primary-soft)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          soft: 'var(--accent-soft)',
        },
        surface: '#F4F6FB',
      },
      boxShadow: {
        card: '0 1px 3px rgba(15, 23, 42, 0.04), 0 1px 2px rgba(15, 23, 42, 0.02)',
        'card-hover': '0 10px 25px -5px rgba(15, 23, 42, 0.07), 0 4px 10px -2px rgba(15, 23, 42, 0.03)',
        'brand-glow': '0 4px 14px 0 var(--primary-glow)',
      }
    }
  }
};
