/**
 * routes/auth.routes.js
 */

const express = require('express');
const AuthController = require('../controllers/auth.controller');

const router = express.Router();

router.get('/google', AuthController.login);
router.get('/google/callback', AuthController.callback);
router.post('/mobile/exchange', AuthController.exchangeMobile);
router.get('/status', AuthController.status);
router.post('/logout', AuthController.logout);

module.exports = router;
