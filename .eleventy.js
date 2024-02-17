const syntaxHighlight = require("@11ty/eleventy-plugin-syntaxhighlight");
const rss = require("@11ty/eleventy-plugin-rss");

const dayjs = require("dayjs");
dayjs.extend(require("dayjs/plugin/advancedFormat"));

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(syntaxHighlight);
  eleventyConfig.addPlugin(rss);

  eleventyConfig.addPassthroughCopy("src/font");
  eleventyConfig.addPassthroughCopy("src/img");
  eleventyConfig.addPassthroughCopy("src/css/prism-one-light.css");
  eleventyConfig.addPassthroughCopy("src/css/prism-material-oceanic.css");

  eleventyConfig.addGlobalData("currentYear", new Date().getFullYear());
  eleventyConfig.addGlobalData("siteUrl", "https://barlow.dev");

  // Filter to posts within the last year
  eleventyConfig.addFilter("recent", (posts) =>
    posts.filter((post) => dayjs().diff(dayjs(post.data.date), "year") < 1),
  );

  // Given an array of posts, group by their publish date in the form e.g. "January 2024"
  eleventyConfig.addFilter("groupByYearMonth", (posts) =>
    posts.reduce((carry, current) => {
      const group = dayjs(current.data.date).format("MMMM YYYY");

      if (group in carry) {
        carry[group].push(current);
      } else {
        carry[group] = [current];
      }

      return carry;
    }, {}),
  );

  // Filter a collection of posts by those that include the specified tag
  eleventyConfig.addFilter("filterByTag", (posts, tag) => posts.filter((post) => post.data.post_tags.includes(tag)));

  // Given a set of posts, extract all unique tags
  eleventyConfig.addFilter("extractTags", (posts) => [...new Set(posts.map((post) => post.data.post_tags).flat())]);

  // Format a Y-m-d date into the format displayed on posts, e.g. "1st Jan 2024"
  eleventyConfig.addFilter("postDate", (ymd) => dayjs(ymd).format("Do MMM YYYY"));

  // Strip out code from page content for the purposes of estimating reading time
  eleventyConfig.addFilter("textOnly", (content) => content.replace(/<pre class=(.|\n)*?<\/pre>/gm, ""));

  // Compute an estimated reading time assuming 225 words/min
  eleventyConfig.addFilter("readingTime", (wordCount) => `${Math.max(1, Math.floor(wordCount / 225))} minute`);

  // Convert a given number to Roman numerals
  eleventyConfig.addFilter("asRomanNumerals", (number) => {
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

  return {
    dir: {
      input: "src",
    },
    markdownTemplateEngine: "njk",
  };
};
