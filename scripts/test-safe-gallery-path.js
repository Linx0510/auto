'use strict';

const assert = require('assert');
const path = require('path');
const { resolveGalleryUploadFilePath } = require('../utils/safeGalleryFilePath');

const uploadsRoot = path.join(__dirname, '..', 'public', 'uploads');

assert.strictEqual(
  resolveGalleryUploadFilePath('/uploads/normal.jpg', uploadsRoot),
  path.resolve(uploadsRoot, 'normal.jpg')
);

assert.strictEqual(resolveGalleryUploadFilePath('/uploads/../outside.jpg', uploadsRoot), null);

assert.strictEqual(
  resolveGalleryUploadFilePath('/uploads/foo/../../../etc/passwd', uploadsRoot),
  null
);

assert.strictEqual(resolveGalleryUploadFilePath('bare.jpg', uploadsRoot), path.resolve(uploadsRoot, 'bare.jpg'));

assert.strictEqual(resolveGalleryUploadFilePath('/images/x.png', uploadsRoot), null);

assert.strictEqual(resolveGalleryUploadFilePath('', uploadsRoot), null);

console.log('safeGalleryFilePath assertions: OK');
