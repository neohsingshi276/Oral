const express = require('express');
const router = express.Router();
const { getAllFacts, addFact, updateFact, deleteFact } = require('../controllers/facts.controller');
const verifyToken = require('../middleware/verifyToken');
const upload = require('../middleware/upload');

router.get('/', getAllFacts);
router.post('/', verifyToken, upload.single('image'), addFact);
router.put('/:id', verifyToken, upload.single('image'), updateFact);
router.delete('/:id', verifyToken, deleteFact);

module.exports = router;
