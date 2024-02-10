module.exports = {
  pagination: {
    data: "collections.post",
    before: (pages) => [...new Set(pages.map((page) => page.data.post_tags).flat())],
    size: 1,
    alias: "tag",
  },
};
