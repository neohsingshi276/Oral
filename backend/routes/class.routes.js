const express = require('express');
const router = express.Router();

const { getClasses } = require('../controllers/class.controller');
const verifyToken = require('../middleware/verifyToken');

router.get('/', verifyToken, getClasses);

module.exports = router;