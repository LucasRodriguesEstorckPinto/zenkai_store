/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Paleta Zenkai: Dark Mode com Neons
        zenkai: {
          bg: '#0A0A0A',       // Fundo principal quase preto
          surface: '#171717',  // Fundo dos cards (cinza muito escuro)
          border: '#262626',   // Bordas sutis
          neonBlue: '#00E5FF', // Azul elétrico para botões/destaques
          neonGreen: '#39FF14',// Verde cítrico para status/estoque
          textMain: '#F5F5F5', // Texto principal (quase branco)
          textMuted: '#A3A3A3',// Texto secundário (cinza)
        }
      },
      fontFamily: {
        // Sugestão de fonte técnica e limpa
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['Roboto Mono', 'monospace'],
      }
    },
  },
  plugins: [],
}