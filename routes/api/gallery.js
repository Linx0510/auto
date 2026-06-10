const express = require('express');
const { galleryListPublic } = require('../handlers/galleryListPublic');

const router = express.Router();

router.get('/gallery', galleryListPublic);

module.exports = router;
