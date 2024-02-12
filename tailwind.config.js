const colors = require("tailwindcss/colors");

/** @type {import('tailwindcss').Config} */
module.exports = {
  mode: "jit",
  content: ["./src/**/*.{html,njk}"],
  darkMode: "media",
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      black: colors.black,
      white: colors.white,
      gray: colors.stone,
      orange: colors.orange,
    },
    extend: {
      typography: (theme) => ({
        DEFAULT: {
          css: {
            "code::before": {
              content: "",
            },
            "code::after": {
              content: "",
            },
            code: {
              fontWeight: theme("fontWeight.normal"),
            },
            figcaption: {
              textAlign: "center",
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
            code: {
              backgroundColor: theme("colors.gray.700"),
            },
          },
        },
      }),
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
