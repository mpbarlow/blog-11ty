const colors = require("tailwindcss/colors");

/** @type {import('tailwindcss').Config} */
module.exports = {
  mode: "jit",
  content: ["./_includes/*.{html,njk}", "*.{html,njk}"],
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
            "code::before": { content: "" },
            "code::after": { content: "" },
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
            code: {
              color: theme("colors.orange.600"),
              backgroundColor: theme("colors.orange.50"),
            },
          },
        },
        dark: {
          css: [
            {
              color: theme("colors.gray.300"),
              '[class~="lead"]': {
                color: theme("colors.gray.300"),
              },
              a: {
                color: theme("colors.orange.500"),
              },
              strong: {
                color: theme("colors.white"),
              },
              "ol > li::before": {
                color: theme("colors.gray.400"),
              },
              "ul > li::before": {
                backgroundColor: theme("colors.gray.600"),
              },
              hr: {
                borderColor: theme("colors.gray.200"),
              },
              blockquote: {
                color: theme("colors.gray.200"),
                borderLeftColor: theme("colors.gray.600"),
              },
              h1: {
                color: theme("colors.white"),
              },
              h2: {
                color: theme("colors.white"),
              },
              h3: {
                color: theme("colors.white"),
              },
              h4: {
                color: theme("colors.white"),
              },
              "figure figcaption": {
                color: theme("colors.gray.400"),
              },
              code: {
                color: theme("colors.orange.600"),
                backgroundColor: theme("colors.gray.700"),
              },
              "a code": {
                color: theme("colors.white"),
              },
              pre: {
                color: theme("colors.gray.200"),
                backgroundColor: theme("colors.gray.800"),
              },
              thead: {
                color: theme("colors.white"),
                borderBottomColor: theme("colors.gray.400"),
              },
              "tbody tr": {
                borderBottomColor: theme("colors.gray.600"),
              },
            },
          ],
        },
      }),
    },
  },
  variants: {
    extend: {
      typography: ["dark"],
    },
  },
  plugins: [require("@tailwindcss/typography")],
};
