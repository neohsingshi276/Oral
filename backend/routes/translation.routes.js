const express = require('express');
const { translateContent } = require('../controllers/translation.controller');

const router = express.Router();

router.post('/content', translateContent);

module.exports = router;
