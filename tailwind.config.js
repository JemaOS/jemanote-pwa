/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        sm: '640px',
        md: '768px',
        lg: '1024px',
        xl: '1280px',
        '2xl': '1536px',
      },
    },
    screens: {
      'xs': '375px',            // Smartphone 4-5 pouces
      'sm': '640px',            // Smartphone 6-7 pouces  
      'md': '768px',            // Tablet portrait
      'lg': '1024px',           // Tablet landscape
      'laptop-sm': '1024px',    // Laptop 13 pouces
      'laptop': '1280px',       // Laptop 14-15 pouces
      'laptop-lg': '1440px',    // Laptop 16 pouces
      'desktop': '1680px',      // Desktop 19-20 pouces
      'xl': '1920px',           // Desktop large
      '2xl': '2560px',          // 4K
    },
    extend: {
      colors: {
        // Primary Brand Colors
        primary: {
          50: '#EDEFFD',
          100: '#D5D9FA',
          500: '#5a63e9',
          600: '#4850d9',
          900: '#3640c9',
          DEFAULT: '#5a63e9',
        },
        // Neutral Structure Colors
        neutral: {
          50: '#FAFAFA',
          100: '#F5F5F5',
          200: '#E5E5E5',
          300: '#D4D4D4',
          400: '#A3A3A3',
          500: '#737373',
          600: '#525252',
          700: '#404040',
          800: '#262626',
          900: '#171717',
        },
        // Semantic Colors
        success: '#10B981',
        warning: '#F59E0B',
        error: '#EF4444',
        // Surface Colors
        surface: {
          bg: '#FFFFFF',
          elevated: '#FFFFFF',
        },
      },
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        mono: ['Fira Code', 'JetBrains Mono', 'Courier New', 'monospace'],
      },
      fontSize: {
        hero: ['clamp(2rem, 5vw, 4rem)', { lineHeight: '1.1', letterSpacing: '-0.02em' }],
        title: ['clamp(1.75rem, 4vw, 3rem)', { lineHeight: '1.2', letterSpacing: '-0.01em' }],
        subtitle: ['clamp(1.25rem, 3vw, 2rem)', { lineHeight: '1.3' }],
        'body-large': ['clamp(1rem, 1.5vw, 1.125rem)', { lineHeight: '1.6' }],
        body: ['clamp(0.9375rem, 1vw, 1rem)', { lineHeight: '1.5' }],
        'body-small': ['clamp(0.8125rem, 0.9vw, 0.875rem)', { lineHeight: '1.5' }],
        caption: ['clamp(0.6875rem, 0.85vw, 0.75rem)', { lineHeight: '1.4', letterSpacing: '0.01em' }],
      },
      boxShadow: {
        card: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
        'card-hover': '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
        modal: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)',
        nav: '0 1px 3px rgba(0, 0, 0, 0.1)',
      },
      animation: {
        'fade-in': 'fadeIn 300ms ease-out',
        'slide-up': 'slideUp 300ms ease-out',
        'slide-in-right': 'slideInRight 250ms ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideInRight: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
      },
      transitionDuration: {
        fast: '200ms',
        base: '250ms',
        slow: '300ms',
      },
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
