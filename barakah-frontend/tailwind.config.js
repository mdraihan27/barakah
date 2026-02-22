/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        cerialebaran: ['"Cerialebaran"', 'cursive'],
        poppins: ['"Poppins"', 'sans-serif'],
        'bangla-heading': ['"LiHasanIccheghuri"', 'serif'],
        'bangla-body': ['"LiMehdiEkushey"', 'sans-serif'],
      },
      colors: {
        /* Theme-aware (switch with light/dark) */
        'page':      'rgb(var(--color-page)      / <alpha-value>)',
        'surface':   'rgb(var(--color-surface)   / <alpha-value>)',
        'heading':   'rgb(var(--color-heading)   / <alpha-value>)',
        'body':      'rgb(var(--color-body)      / <alpha-value>)',
        'muted':     'rgb(var(--color-muted)     / <alpha-value>)',
        'gold':      'rgb(var(--color-gold)      / <alpha-value>)',
        'gold-light':'rgb(var(--color-gold-light)/ <alpha-value>)',
        /* Static */
        'primary-green-1': '#0E2E1D',
        'primary-green-2': '#197559',
        'primary-green-3': '#1E392A',
        'primary-green-4': '#D1E7D4',
        'primary-white-1': '#E0EBE4',
      },
    },
  },
  plugins: [],
}
