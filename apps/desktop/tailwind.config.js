/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Premium Lens-inspired ultra-dark palette with glow
        primary: {
          DEFAULT: '#10B981', // Premium Emerald/Mint
          hover: '#34D399',
          active: '#059669',
          subtle: 'rgba(16, 185, 129, 0.08)',
          border: 'rgba(16, 185, 129, 0.4)',
          glow: 'rgba(16, 185, 129, 0.25)',
        },
        dark: {
          DEFAULT: '#010409', // Deeper black background
          50: '#0D1117', // Dark elevated
          100: '#161B22', // Surface
          200: '#1C2128', // Surface elevated
          300: '#21262D', // Border
          400: '#30363D', // Border hover
        },
        surface: {
          DEFAULT: '#0D1117', // Main surface (darker)
          elevated: '#161B22', // Cards, panels
          hover: '#1C2128', // Hover state
          border: '#21262D', // Separator lines
        },
        border: {
          DEFAULT: '#30363D', // Subtle borders
          hover: '#484F58',
          muted: '#21262D', // Very subtle
        },
        text: {
          primary: '#F0F6FC', // Brightest white (premium)
          secondary: '#9198A1', // Balanced gray
          tertiary: '#6E7681', // Subtle gray
          muted: '#484F58', // Very muted
        },
        accent: {
          purple: '#B083F0',
          cyan: '#76E3EA',
          green: '#57AB5A',
          orange: '#E09B13',
        },
        success: '#3FB950',
        warning: '#E09B13',
        error: '#F47067',
        info: '#539BF5',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'Inter', 'Segoe UI', 'Helvetica', 'Arial', 'sans-serif'],
        mono: ['SF Mono', 'JetBrains Mono', 'Menlo', 'Monaco', 'Consolas', 'monospace'],
      },
      fontSize: {
        xs: ['0.75rem', { lineHeight: '1.125rem', letterSpacing: '0.01em' }],
        sm: ['0.875rem', { lineHeight: '1.375rem', letterSpacing: '0.005em' }],
        base: ['1rem', { lineHeight: '1.625rem' }],
        lg: ['1.125rem', { lineHeight: '1.75rem' }],
        xl: ['1.25rem', { lineHeight: '1.875rem', fontWeight: '500' }],
        '2xl': ['1.5rem', { lineHeight: '2rem', fontWeight: '600' }],
        '3xl': ['2rem', { lineHeight: '2.5rem', fontWeight: '700' }],
        '4xl': ['2.5rem', { lineHeight: '3rem', fontWeight: '700' }],
      },
      spacing: {
        'titlebar': '36px',
        'sidebar': '240px',
        'statusbar': '28px',
      },
      backdropBlur: {
        xs: '2px',
        sm: '4px',
        DEFAULT: '12px',
        md: '16px',
        lg: '24px',
        xl: '40px',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(var(--tw-gradient-stops))',
        'gradient-mesh': 'radial-gradient(at 27% 37%, hsla(215, 98%, 61%, 0.15) 0px, transparent 50%), radial-gradient(at 97% 21%, hsla(125, 98%, 72%, 0.1) 0px, transparent 50%), radial-gradient(at 52% 99%, hsla(354, 98%, 61%, 0.1) 0px, transparent 50%), radial-gradient(at 10% 29%, hsla(256, 96%, 67%, 0.1) 0px, transparent 50%)',
      },
      animation: {
        'fade-in': 'fadeIn 0.4s ease-out',
        'fade-in-up': 'fadeInUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'fade-in-down': 'fadeInDown 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-up': 'slideUp 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-down': 'slideDown 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-left': 'slideLeft 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'slide-right': 'slideRight 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-in': 'scaleIn 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        'scale-up': 'scaleUp 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
        'bounce-subtle': 'bounceSubtle 0.6s cubic-bezier(0.16, 1, 0.3, 1)',
        'glow': 'glow 2s ease-in-out infinite',
        'glow-pulse': 'glowPulse 3s ease-in-out infinite',
        'shimmer': 'shimmer 2s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
        'ping-slow': 'ping 2s cubic-bezier(0, 0, 0.2, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeInUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeInDown: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideLeft: {
          '0%': { transform: 'translateX(20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        slideRight: {
          '0%': { transform: 'translateX(-20px)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        scaleUp: {
          '0%': { transform: 'scale(0.9)' },
          '100%': { transform: 'scale(1)' },
        },
        bounceSubtle: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 20px rgba(16, 185, 129, 0.3), 0 0 40px rgba(16, 185, 129, 0.15)' },
          '50%': { boxShadow: '0 0 30px rgba(16, 185, 129, 0.5), 0 0 60px rgba(16, 185, 129, 0.25)' },
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(16, 185, 129, 0.2)' },
          '50%': { boxShadow: '0 0 25px rgba(16, 185, 129, 0.4)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
      },
      boxShadow: {
        'glass': '0 4px 24px -2px rgba(0, 0, 0, 0.4), 0 2px 8px -1px rgba(0, 0, 0, 0.3)',
        'glass-lg': '0 8px 32px -4px rgba(0, 0, 0, 0.5), 0 4px 16px -2px rgba(0, 0, 0, 0.4)',
        'glow': '0 0 20px rgba(16, 185, 129, 0.3), 0 0 40px rgba(16, 185, 129, 0.15)',
        'glow-sm': '0 0 12px rgba(16, 185, 129, 0.25), 0 0 24px rgba(16, 185, 129, 0.1)',
        'inner': 'inset 0 2px 4px 0 rgba(0, 0, 0, 0.3)',
      },
    },
  },
  plugins: [],
}
