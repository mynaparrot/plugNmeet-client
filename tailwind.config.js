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
        panel: '0 0 10px -7px rgb(0, 0, 0)',
      },
      colors: {
        primaryColor: '#004D90',
        secondaryColor: '#24AEF7',
        brandRed: '#ED2139',
        darkPrimary: '#01102B',
        darkSecondary: '#001222',
        darkSecondary2: '#0B2D65',
        darkSecondary3: '#031A3E',
        darkText: '#A7CCED',
      },
      borderRadius: {
        tlblD: '0 0 20px 20px',
        trbrD: '20px 20px 0 0',
        MSG: '0 15px 15px',
        MSGME: '15px 0 15px 15px',
      },
    },
  },
  plugins: [],
};
