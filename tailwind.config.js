/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        'clinical-blue': '#0077B6',
        'sky-light': '#F7F9FB',
        'deep-slate': '#191C1E',
        'surface': '#FFFFFF',
        'success-teal': '#006B5F',
        'neutral': '#70787D',
        'border-light': '#F2F4F6',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        heading: ['Manrope', 'system-ui', 'sans-serif'],
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
