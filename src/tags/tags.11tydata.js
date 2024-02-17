module.exports = {
  pagination: {
    data: "collections.post",
    // Extract all the unique tags out of all the pages
    before: (pages) => [...new Set(pages.map((page) => page.data.post_tags).flat())],
    size: 1,
    alias: "tag",
  },
};
