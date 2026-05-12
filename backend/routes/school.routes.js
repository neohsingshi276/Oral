const express = require('express');
const router = express.Router();

const { getSchools } = require('../controllers/school.controller');
const verifyToken = require('../middleware/verifyToken');

router.get('/', verifyToken, getSchools);

module.exports = router;