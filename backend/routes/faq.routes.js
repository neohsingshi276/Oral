const express = require('express');
const router = express.Router();

const {
    getFAQ,
    askFAQ,
    answerFAQ,
    deleteFAQ,
    getInstructions,
    updateInstruction,
    updateFAQAnswer
} = require('../controllers/faq.controller');

const verifyToken = require('../middleware/verifyToken');

router.get('/instructions', verifyToken, getInstructions);
router.put('/instructions/:id', verifyToken, updateInstruction);

router.get('/', verifyToken, getFAQ);
router.post('/', verifyToken, askFAQ);
router.put('/:id/answer', verifyToken, answerFAQ);
router.put('/:id/edit', verifyToken, updateFAQAnswer);
router.delete('/:id', verifyToken, deleteFAQ);

module.exports = router;