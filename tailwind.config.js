module.exports = {
  darkMode: 'class',
  content: [
    './src/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
    './src/**/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      boxShadow: {
        footer: '0 -4px 52px rgba(0, 0, 0, 0.15)',
        header: '0 4px 52px rgba(0, 0, 0, 0.15)',
      },
      colors: {
        primaryColor: '#004D90',
        secondaryColor: '#24AEF7',
        brandRed: '#ED2139',
        brandDark: '#01102B',
        brandDark2: '#001222',
        darkText: '#A7CCED',
      },
    },
  },
  plugins: [],
};
