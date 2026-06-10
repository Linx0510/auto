function normalizeGalleryImageUrl(image_url) {
  if (image_url == null || typeof image_url !== 'string') {
    return image_url;
  }
  const u = image_url.trim();
  if (!u) return u;
  if (u.startsWith('http://') || u.startsWith('https://') || u.startsWith('/')) {
    return u;
  }
  return `/uploads/${u.replace(/^\/+/, '')}`;
}

function mapGalleryRows(rows) {
  return rows.map((row) => ({
    ...row,
    image_url: normalizeGalleryImageUrl(row.image_url)
  }));
}

module.exports = {
  normalizeGalleryImageUrl,
  mapGalleryRows
};
