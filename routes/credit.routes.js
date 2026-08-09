/**
 * routes/credit.routes.js
 * Credit routes for checking status, estimating slide credits, and Razorpay payment integration
 */

const express = require('express');
const router = express.Router();
const CreditController = require('../controllers/credit.controller');
const { requireAuth } = require('../middleware/auth.middleware');

router.get('/credits', requireAuth, CreditController.getCreditStatus);
router.post('/credits/estimate', requireAuth, CreditController.estimateCredits);
router.post('/credits/create-order', requireAuth, CreditController.createOrder);
router.post('/credits/verify-payment', requireAuth, CreditController.verifyPayment);

module.exports = router;
