const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");

const formatDateString = (value, format) => {
  const components = value.split("-");

  return new Date(components[0], components[1] - 1, components[2]).toLocaleString("default", format);
};

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(syntaxHighlight);

  eleventyConfig.addPassthroughCopy("img");
  eleventyConfig.addPassthroughCopy("prism-one-light.css");

  eleventyConfig.addGlobalData("currentyear", new Date().getFullYear());
  eleventyConfig.addGlobalData("siteurl", "https://barlow.dev");

  // Given an array of posts, group by their publish date in the form e.g. "January 2024"
  eleventyConfig.addFilter("groupbyyearmonth", (posts) =>
    posts.reduce((carry, current) => {
      const group = formatDateString(current.data.date, {
        month: "long",
        year: "numeric",
      });

      if (group in carry) {
        carry[group].push(current);
      } else {
        carry[group] = [current];
      }

      return carry;
    }, {}),
  );

  // Filter a collection of posts by those that include the specified tag
  eleventyConfig.addFilter("filterbytag", (posts, tag) => posts.filter((post) => post.data.post_tags.includes(tag)));

  // Format a Y-m-d date into the format displayed on posts, e.g. "1 Jan 2024"
  eleventyConfig.addFilter("postdate", (ymd) =>
    formatDateString(ymd, {
      day: "numeric",
      month: "short",
      year: "numeric",
    }),
  );

  // Strip out code from page content for the purposes of estimating reading time
  eleventyConfig.addFilter("contentonly", (content) => content.replace(/<pre class=(.|\n)*?<\/pre>/gm, ""));

  // Compute an estimated reading time assuming 225 words/min
  eleventyConfig.addFilter("readingtime", (wordCount) => `${Math.max(1, Math.floor(wordCount / 225))} minute`);

  // Convert a given number to Roman numerals
  eleventyConfig.addFilter("asromannumerals", (number) => {
    const numerals = {
      M: 1000,
      CM: 900,
      D: 500,
      CD: 400,
      C: 100,
      XC: 90,
      L: 50,
      XL: 40,
      X: 10,
      IX: 9,
      V: 5,
      IV: 4,
      I: 1,
    };

    let output = "";

    while (number > 0) {
      for (const [numeral, value] of Object.entries(numerals)) {
        if (number >= value) {
          number -= value;
          output += numeral;
          break;
        }
      }
    }

    return output;
  });
};
