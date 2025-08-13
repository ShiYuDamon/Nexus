
const plugin = require('tailwindcss/plugin');

module.exports = plugin(function ({ addBase, addComponents, addUtilities, theme }) {

  addBase({
    ':root': {
      '--scroll-y': '0px',
      '--block-spacing-y': '0.3rem',
      '--heading-spacing-y': '1.5rem',
      '--paragraph-line-height': '1.6',
      '--heading-line-height': '1.3',
      '--block-padding-x': '0.75rem',
      '--block-padding-y': '0.15rem',
      '--block-hover-bg': 'rgba(0, 0, 0, 0.03)',
      '--block-active-bg': 'rgba(59, 130, 246, 0.08)',
    }
  });

  addComponents({
    '.rich-editor-container': {
      position: 'relative',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    },

    '.floating-toolbar': {
      transformOrigin: 'center top',
      animation: 'toolbarFadeIn 0.15s ease-out',
      boxShadow: '0 3px 12px rgba(0, 0, 0, 0.15)',
      maxWidth: 'calc(100% - 20px)',
      overflow: 'visible',
      borderRadius: '0.5rem',
    },

    '.floating-toolbar button': {
      transition: 'background-color 0.15s, color 0.15s',
      borderRadius: '0.25rem',
    },

    '.floating-toolbar button:active': {
      transform: 'translateY(1px)',
    },

    '.floating-toolbar button:hover': {
      backgroundColor: 'rgba(0, 0, 0, 0.05)',
    },

    '.floating-toolbar .absolute': {
      animation: 'dropdownFadeIn 0.2s ease-out',
      zIndex: 50,
    },

    '.floating-toolbar .absolute button:hover': {
      backgroundColor: 'rgba(59, 130, 246, 0.08)',
    },

    '.media-dialog-backdrop': {
      zIndex: 1000,
      backdropFilter: 'blur(3px)',
    },

    '.media-dialog-content': {
      animation: 'dialogFadeIn 0.2s ease-out',
      maxHeight: '90vh',
      display: 'flex',
      flexDirection: 'column',
      borderRadius: '0.625rem',
      boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
    },

    '.rich-editor-content a': {
      transition: 'color 0.2s',
    },

    '.rich-editor-content a:hover::after': {
      animation: 'fadeIn 0.3s ease-out forwards',
    },

    '.rich-editor-content img[data-error-shown="true"]': {
      position: 'relative',
      minHeight: '100px',
    },

    '.media-dialog-content input:focus, .media-dialog-content textarea:focus': {
      boxShadow: '0 0 0 2px rgba(59, 130, 246, 0.3)',
    },

    '.media-dialog-content button.bg-blue-600:hover': {
      backgroundColor: '#2563eb',
      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
    },

    '.animate-cursor-blink': {
      animation: 'cursor-blink 1s steps(2) infinite',
    },

    '.animate-fade-in': {
      animation: 'fadeIn 0.1s ease-out',
    },

    '.rich-text-block-editor': {
      '& .blocks-container': {
        marginBottom: '1.25rem', 
      }
    },

    '.rich-text-block-editor-block': {
      marginBottom: 'var(--block-spacing-y)',
      transition: 'all 0.15s ease-out',
      borderRadius: '0.25rem',

      '&:hover': {
        backgroundColor: 'var(--block-hover-bg)',
      },

      '&.active': {
        backgroundColor: 'var(--block-active-bg)',
      },

      '& > div > div': {
        lineHeight: 'var(--paragraph-line-height)',
        padding: 'var(--block-padding-y) var(--block-padding-x)',
      },

      '&[data-block-type="heading-1"]': {
        marginTop: 'var(--heading-spacing-y)',
        marginBottom: 'calc(var(--block-spacing-y) * 0.85)', 

        '& > div > div': {
          lineHeight: 'var(--heading-line-height)',
          fontWeight: '600',
        }
      },

      '&[data-block-type="heading-2"]': {
        marginTop: 'calc(var(--heading-spacing-y) * 0.9)', 
        marginBottom: 'calc(var(--block-spacing-y) * 0.7)', 

        '& > div > div': {
          lineHeight: 'var(--heading-line-height)',
          fontWeight: '600',
        }
      },

      '&[data-block-type="heading-3"]': {
        marginTop: 'calc(var(--heading-spacing-y) * 0.75)', 
        marginBottom: 'calc(var(--block-spacing-y) * 0.6)', 

        '& > div > div': {
          lineHeight: 'var(--heading-line-height)',
          fontWeight: '600',
        }
      },

      '&[data-block-type="bulleted-list"], &[data-block-type="numbered-list"]': {
        marginBottom: 'calc(var(--block-spacing-y) * 0.25)', 

        '& + [data-block-type="bulleted-list"], & + [data-block-type="numbered-list"]': {
          marginTop: 'calc(var(--block-spacing-y) * -0.5)', 
        }
      },

      '&[data-block-type="quote"]': {
        marginTop: 'calc(var(--block-spacing-y) * 1.25)', 
        marginBottom: 'calc(var(--block-spacing-y) * 1.25)',

        '& blockquote': {
          borderLeftColor: 'rgba(0, 0, 0, 0.1)',
        }
      },

      '&[data-block-type="code"]': {
        marginTop: 'calc(var(--block-spacing-y) * 1.25)', 
        marginBottom: 'calc(var(--block-spacing-y) * 1.25)',

        '& pre': {
          borderRadius: '0.375rem',
          backgroundColor: 'rgba(0, 0, 0, 0.03)',
        }
      },

      '&[data-block-type="divider"]': {
        marginTop: 'calc(var(--block-spacing-y) * 1.6)', 
        marginBottom: 'calc(var(--block-spacing-y) * 1.6)',

        '& hr': {
          borderColor: 'rgba(0, 0, 0, 0.1)',
        }
      },

      '&[data-block-type="to-do"]': {
        marginBottom: 'calc(var(--block-spacing-y) * 0.25)', 

        '& + [data-block-type="to-do"]': {
          marginTop: 'calc(var(--block-spacing-y) * -0.5)', 
        },

        '& input[type="checkbox"]': {
          borderRadius: '0.25rem',
          transition: 'all 0.2s ease',
          cursor: 'pointer',
        },

        '& .todo-editor-wrapper': {
          transition: 'all 0.2s ease-out',
        },

        '& .todo-checked': {
          opacity: '0.8',
        }
      },

      '.rich-text-block-editor-block, .block-editor-block': {

        '& > div[class*="absolute"]': {
          position: 'absolute',
        }
      }
    },

    '.rich-text-editor-content': {
      lineHeight: 'var(--paragraph-line-height)',
      padding: '0.15rem 0', 

      '& p': {
        marginBottom: '0.5rem', 
      },

      '& p:last-child': {
        marginBottom: '0',
      }
    }
  });

  addUtilities({
    '@keyframes toolbarFadeIn': {
      'from': {
        opacity: '0',
        transform: 'translateY(-8px)',
      },
      'to': {
        opacity: '1',
        transform: 'translateY(0)',
      },
    },

    '@keyframes dropdownFadeIn': {
      'from': {
        opacity: '0',
        transform: 'translateY(-5px)',
      },
      'to': {
        opacity: '1',
        transform: 'translateY(0)',
      },
    },

    '@keyframes dialogFadeIn': {
      'from': {
        opacity: '0',
        transform: 'translateY(20px) scale(0.98)',
      },
      'to': {
        opacity: '1',
        transform: 'translateY(0) scale(1)',
      },
    },

    '@keyframes fadeIn': {
      'from': {
        opacity: '0',
        transform: 'translateY(5px)',
      },
      'to': {
        opacity: '1',
        transform: 'translateY(0)',
      },
    },

    '@keyframes cursor-blink': {
      '0%': { opacity: '1' },
      '50%': { opacity: '0' },
      '100%': { opacity: '1' },
    },

    '@keyframes fadeIn': {
      'from': { opacity: '0', transform: 'translateY(-5px) translateX(-50%)' },
      'to': { opacity: '1', transform: 'translateY(0) translateX(-50%)' },
    },
  });

  addUtilities({
    '.animate-fadeIn': {
      animation: 'fadeIn 0.2s ease-out forwards',
    },
    '.animate-toolbarFadeIn': {
      animation: 'toolbarFadeIn 0.2s ease-out forwards',
    },
    '.animate-dropdownFadeIn': {
      animation: 'dropdownFadeIn 0.15s ease-out forwards',
    },
  });

  addComponents({
    '@media (max-width: 640px)': {
      '.floating-toolbar': {
        flexWrap: 'wrap',
        justifyContent: 'center',
        padding: '0.375rem',
      },
      '.media-dialog-content': {
        width: '95%',
        maxWidth: '95%',
        margin: '0 0.625rem',
      },

      '.rich-text-block-editor-block': {
        marginBottom: 'calc(var(--block-spacing-y) * 0.7)', 
      }
    },
  });

  addUtilities({
    '.z-60': { zIndex: '60' },
    '.z-70': { zIndex: '70' },
    '.z-80': { zIndex: '80' },
    '.z-90': { zIndex: '90' },
    '.z-100': { zIndex: '100' },
  });

  addUtilities({
    '.shadow-toolbar': { boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)' },
  });
});
