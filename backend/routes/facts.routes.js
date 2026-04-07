const express = require('express');
const router = express.Router();
const { getAllFacts, addFact, updateFact, deleteFact } = require('../controllers/facts.controller');
const verifyToken = require('../middleware/verifyToken');
const upload = require('../middleware/upload');

// Wrap multer so file type/size errors return 400 instead of crashing with 500
const multerHandler = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err) return res.status(400).json({ error: err.message });
    next();
  });
};

router.get('/', getAllFacts);
router.post('/', verifyToken, multerHandler, addFact);
router.put('/:id', verifyToken, multerHandler, updateFact);
router.delete('/:id', verifyToken, deleteFact);

module.exports = router;
