
const express = require('express');
const router = express.Router();

const authController = require('../controllers/authController');

// POST: Login admin dan kasir
router.post('/login', authController.login);

module.exports = router;
