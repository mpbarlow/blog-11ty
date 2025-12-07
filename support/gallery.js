import fs from "node:fs";
import FastGlob from "fast-glob";

// Convert a path in src/ to an absolute href
// e.g. src/foo/bar.txt -> /foo/bar.txt
function transformPath(path) {
  return path.replace("src/", "/");
}

const thumbnailTest = /([0-9]+)-thumb\.(jpe?g|gif|png)/;

function testThumbnail(path) {
  const result = path.match(thumbnailTest);

  if (result === null) {
    return null;
  }

  return [result[1], { thumbnail: transformPath(path) }];
}

const altTextTest = /([0-9]+)-alt\.txt/;

function testAltText(path) {
  const result = path.match(altTextTest);

  if (result === null) {
    return null;
  }

  return [result[1], { altText: fs.readFileSync(path, "utf8").replaceAll('"', "&quot;").replaceAll("'", "&apos;") }];
}

const srcTest = /([0-9]+)\.(jpe?g|gif|png)/;

function testSrc(path) {
  const result = path.match(srcTest);

  if (result === null) {
    return null;
  }

  return [result[1], { src: transformPath(path) }];
}

function parseFiles(glob) {
  const images = {};

  for (const path of FastGlob.sync(glob)) {
    for (const test of [testThumbnail, testAltText, testSrc]) {
      const result = test(path);
      if (result !== null) {
        images[result[0]] = { ...(images[result[0]] ?? {}), ...result[1] };
        break;
      }
    }
  }

  return Object.entries(images)
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([, obj]) => obj);
}

// Convert a glob pattern of files named following a specific pattern into a HTML gallery.
// [0-9]+-thumb.{jpe?g,gif,png} -> thumbnail
// [0-9]+-alt.txt               -> alt text
// [0-9]+.{jpe?g,gif,png}       -> full size image
// Images are ordered numerically.
export function gallerify(glob) {
  const files = parseFiles(glob);
  const defaultAltText =
    "I have forgotten to write alt text for this image! Please let me know so I can fix this mistake ASAP!";

  const thumbnails = files
    .map(
      ({ thumbnail, src, altText }) =>
        `<a href="${src}" title="View full size image" target="_blank">` +
        `<img src="${thumbnail}" alt="${altText ?? defaultAltText}">` +
        `</a>`,
    )
    .join("");

  return (
    `<figure class="gallery">` +
    `<div class="thumbnails">${thumbnails}</div>` +
    `<figcaption>Click thumbnails to view full image</figcaption>` +
    `</figure>`
  );
}
