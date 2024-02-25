const defaultTheme = require("tailwindcss/defaultTheme");

/** @type {import('tailwindcss').Config} */
module.exports = {
  mode: "jit",
  content: ["./src/**/*.{html,njk}"],
  darkMode: "media",
  theme: {
    extend: {
      boxShadow: {
        hard: "2px 2px var(--tw-shadow-color)",
      },
      fontFamily: {
        mono: ['"MonaspaceNeon"', ...defaultTheme.fontFamily.mono],
      },
      gridTemplateColumns: {
        layout: "minmax(0, 100vw)",
      },
      gridTemplateRows: {
        layout: "auto minmax(0, 1fr) auto",
      },
      typography: (theme) => ({
        DEFAULT: {
          css: {
            a: {
              fontWeight: theme("fontWeight.normal"),
            },
            code: {
              fontWeight: theme("fontWeight.normal"),
            },
            "code::before": {
              content: "",
            },
            "code::after": {
              content: "",
            },
            figcaption: {
              textAlign: "center",
            },
            h1: {
              fontFamily: "InstrumentSerif",
              fontWeight: theme("fontWeight.normal"),
            },
          },
        },
        indigo: {
          css: {
            "--tw-prose-code": theme("colors.indigo.500"),
            "--tw-prose-links": theme("colors.indigo.500"),
            "--tw-prose-invert-code": theme("colors.indigo.500"),
            code: {
              backgroundColor: theme("colors.indigo.50"),
            },
          },
        },
        orange: {
          css: {
            "--tw-prose-code": theme("colors.orange.500"),
            "--tw-prose-links": theme("colors.orange.500"),
            "--tw-prose-invert-code": theme("colors.orange.500"),
            code: {
              backgroundColor: theme("colors.orange.50"),
            },
          },
        },
        invert: {
          css: {
            "--tw-prose-invert-code": theme("colors.indigo.400"),
            "--tw-prose-invert-links": theme("colors.indigo.400"),
            code: {
              backgroundColor: theme("colors.gray.700"),
            },
          },
        },
      }),
    },
  },
  plugins: [require("@tailwindcss/typography"), require("tailwindcss-safe-area")],
};
