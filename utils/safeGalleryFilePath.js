const path = require('path');
const { normalizeGalleryImageUrl } = require('./galleryUrls');

/**
 * Абсолютный путь к файлу в каталоге uploads или null, если URL не указывает
 * безопасный файл внутри uploadsRoot (path traversal отсекается).
 */
function resolveGalleryUploadFilePath(image_url, uploadsRoot) {
  if (!image_url || typeof image_url !== 'string') {
    return null;
  }

  const normalizedUrl = normalizeGalleryImageUrl(image_url);
  if (!normalizedUrl.startsWith('/uploads/')) {
    return null;
  }

  let relative = normalizedUrl.slice('/uploads/'.length).replace(/^\/+/, '');
  if (!relative || relative.includes('..')) {
    return null;
  }

  relative = relative.split(/[/\\]/).filter((segment) => segment && segment !== '..').join(path.sep);

  const full = path.resolve(uploadsRoot, relative);
  const rootResolved = path.resolve(uploadsRoot);

  const relToRoot = path.relative(rootResolved, full);
  if (relToRoot.startsWith('..') || path.isAbsolute(relToRoot)) {
    return null;
  }

  return full;
}

module.exports = {
  resolveGalleryUploadFilePath
};
