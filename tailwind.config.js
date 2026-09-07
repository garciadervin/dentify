/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Design-system palette (mirrors constants/theme.ts Colors.light).
        'clinical-blue': '#0077B6',
        'clinical-cyan': '#00B4D8',
        'clinical-dark': '#005C8A', // pressed/border state of clinical-blue
        'sky-light': '#F7F9FB',
        'deep-slate': '#191C1E',
        'success-teal': '#006B5F',
        'teal-deep': '#004037', // pressed/border state of success-teal
        'success-tint': '#E8F5F3', // correct-answer surface
        'neutral': '#70787D',
        'muted': '#9AA1A7',
        'surface': '#FFFFFF',
        'border-light': '#F2F4F6',
        'pill-border': '#E7EBEF',
        'source-fill': '#F2F6FA',
        'error': '#C0392B',
        'error-bright': '#E74C3C',
        'error-tint': '#FDE8E7', // incorrect-answer surface
        'error-tint-border': '#F5C6C1',
      },
      fontFamily: {
        sans: ['Inter'],
        'inter-semibold': ['Inter-SemiBold'],
        'inter-bold': ['Inter-Bold'],
        heading: ['Manrope'],
        'heading-bold': ['Manrope-Bold'],
      },
      borderRadius: {
        '3xl': '32px',
        '2xl': '24px',
        'xl': '16px',
      },
    },
  },
  plugins: [],
};
