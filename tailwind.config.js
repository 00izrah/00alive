export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        void: '#080808',
        'void-darker': '#050505',
        surface: '#111111',
        'surface-elevated': '#161616',
        'surface-glass': 'rgba(18, 18, 18, 0.65)',
        border: '#1c1c1c',
        'border-light': '#2a2a2a',
        alive: '#c8ff00',
        warn: '#ff9500',
        dead: '#ff3b30',
        muted: '#555555',
        'muted-light': '#888888',
        text: '#e8e8e8',
      },
      boxShadow: {
        'neon-alive': '0 0 25px -5px rgba(200, 255, 0, 0.35)',
        'neon-alive-sm': '0 0 12px -2px rgba(200, 255, 0, 0.4)',
        'neon-warn': '0 0 25px -5px rgba(255, 149, 0, 0.35)',
        'neon-dead': '0 0 25px -5px rgba(255, 59, 48, 0.35)',
        'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.37), inset 0 1px 0 0 rgba(255, 255, 255, 0.08)',
        'glass-hover': '0 12px 40px 0 rgba(0, 0, 0, 0.45), inset 0 1px 0 0 rgba(255, 255, 255, 0.15)',
        'vinyl': '0 10px 25px -5px rgba(0, 0, 0, 0.8), 0 0 15px 0 rgba(255, 255, 255, 0.03)',
      },
      fontFamily: {
        mono: ['JetBrains Mono', 'monospace'],
        display: ['Bebas Neue', 'sans-serif'],
      }
    },
  },
  plugins: [],
}