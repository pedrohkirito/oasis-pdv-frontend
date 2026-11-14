import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		fontFamily: {
			sans: ['Gilroy', 'system-ui', 'sans-serif'],
		},
		extend: {
			colors: {
				// shadcn/ui CSS-variable tokens — não remover
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))'
				},
				warning: {
					DEFAULT: 'hsl(var(--warning))',
					foreground: 'hsl(var(--warning-foreground))'
				},
				upload: {
					border: 'hsl(var(--upload-border))',
					bg: 'hsl(var(--upload-bg))',
					hover: 'hsl(var(--upload-hover))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))',
					muted: 'hsl(var(--sidebar-muted))',
				},
				chart: {
					'1': 'hsl(var(--chart-1))',
					'2': 'hsl(var(--chart-2))',
					'3': 'hsl(var(--chart-3))',
					'4': 'hsl(var(--chart-4))',
					'5': 'hsl(var(--chart-5))',
				},

				// ── Brand palette FinSet-PDV ──────────────────────────────
				brand: {
					50:  '#E2CEFF',
					100: '#D5B7FF',
					200: '#C7A1FC',
					300: '#BE90FD',
					400: '#B987FF',
					500: '#C59CFF',
					600: '#B47CFF',
					700: '#A86BFB',
					800: '#8E4FE4',
					900: '#7646B8',
					950: '#6A39AD',
					975: '#5B24A5',
					DEFAULT: '#8E5FCF',
					light:   '#E2CEFF',
					dark:    '#47118F',
				},

				// ── Acentos semânticos ────────────────────────────────────
				'accent-positive': '#FAF66B', // crescimento, lucro, setas ▲
				'accent-neutral':  '#B6B333', // despesas, atrasos

				// ── Superfícies ───────────────────────────────────────────
				'surface-bg':   'hsl(var(--background))',
				'surface-card': 'hsl(var(--card))',

				// ── Glass tokens ──────────────────────────────────────────
				// Uso: className="bg-glass-light border-glass-border" etc.
				glass: {
					light:        'rgba(255, 255, 255, 0.55)',
					medium:       'rgba(255, 255, 255, 0.40)',
					purple:       'rgba(142, 95, 207, 0.75)',
					dark:         'rgba(10, 0, 16, 0.75)',
					border:       'rgba(255, 255, 255, 0.75)',
					'border-sub': 'rgba(142, 95, 207, 0.15)',
				},

				// ── Texto ─────────────────────────────────────────────────
				'text-primary':   'hsl(var(--foreground))',
				'text-secondary': 'hsl(var(--muted-foreground))',

				// ── Borda estática ────────────────────────────────────────
				'border-base': 'hsl(var(--border))',
			},
			borderRadius: {
				none: '0',
				sm: 'calc(var(--radius) - 4px)',
				md: 'calc(var(--radius) - 2px)',
				lg: 'var(--radius)',
				xl: 'calc(var(--radius) + 4px)',
				'2xl': 'calc(var(--radius) + 8px)',
				'3xl': '1.5rem',   /* liquid-glass border-radius */
				full: '9999px',
			},
			keyframes: {
				'glass-shimmer': {
					'0%':   { transform: 'translateX(-100%) skewX(-15deg)' },
					'100%': { transform: 'translateX(200%) skewX(-15deg)' },
				},
				'accordion-down': {
					from: { height: '0' },
					to: { height: 'var(--radix-accordion-content-height)' }
				},
				'accordion-up': {
					from: { height: 'var(--radix-accordion-content-height)' },
					to: { height: '0' }
				},
				'fade-in': {
					'0%': { opacity: '0', transform: 'translateY(4px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'slide-up': {
					'0%': { opacity: '0', transform: 'translateY(8px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out',
				'fade-in': 'fade-in 0.4s ease-out',
				'slide-up': 'slide-up 0.5s ease-out',
				'glass-shimmer': 'glass-shimmer 1.8s ease-in-out',
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
	safelist: [
		'liquid-glass-white',
		'liquid-glass',
		'liquid-glass-static',
		'liquid-glass-strong',
		'liquid-glass-purple',
	],
} satisfies Config;
