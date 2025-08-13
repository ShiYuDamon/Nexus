const plugin = require('tailwindcss/plugin');

module.exports = plugin(function ({ addUtilities, addBase }) {

  const scrollbarUtilities = {
    '.scrollbar-thin': {
      'scrollbar-width': 'thin',
      '&::-webkit-scrollbar': {
        width: '4px',
        height: '4px'
      }
    },
    '.scrollbar-thumb-gray-200::-webkit-scrollbar-thumb': {
      'background-color': '#e5e7eb',
      'border-radius': '9999px'
    },
    '.scrollbar-track-transparent::-webkit-scrollbar-track': {
      'background-color': 'transparent'
    },
    '.scrollbar-none': {
      'scrollbar-width': 'none',
      '&::-webkit-scrollbar': {
        display: 'none'
      }
    }
  };


  const backdropUtilities = {
    '@supports not (backdrop-filter: blur(20px))': {
      '.backdrop-blur-xl': {
        'background-color': 'rgba(255, 255, 255, 0.95) !important'
      }
    }
  };

  addUtilities(scrollbarUtilities);
  addUtilities(backdropUtilities);
});