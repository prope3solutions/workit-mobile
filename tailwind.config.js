/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        obsidian: '#0A0A0A',
        green: '#00E87A',
        chalk: '#F5F5F0',
        slate: '#6B7280',
        stone: '#E5E5E0',
        ember: '#FF4444',
        amber: '#F59E0B',
        deep: '#111827',
      },
      fontFamily: {
        'syne-bold': ['Syne_700Bold'],
        'syne-extrabold': ['Syne_800ExtraBold'],
        'dm-sans': ['DMSans_400Regular'],
        'dm-sans-medium': ['DMSans_500Medium'],
        'dm-mono': ['DMMono_400Regular'],
      },
    },
  },
  plugins: [],
}
