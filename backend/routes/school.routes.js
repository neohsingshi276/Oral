const express = require('express');
const router = express.Router();
const { getSchools, createSchool, deleteSchool } = require('../controllers/school.controller');
const verifyToken = require('../middleware/verifyToken');

router.get('/', verifyToken, getSchools);
router.post('/', verifyToken, createSchool);
router.delete('/:id', verifyToken, deleteSchool);

module.exports = router;
