/**
 * controllers/credit.controller.js
 * Controller for Credit Balance, Estimation, and Razorpay Payments
 */

const Razorpay = require('razorpay');
const crypto = require('crypto');
const CreditService = require('../services/CreditService');
const SheetsService = require('../services/SheetsService');
const GoogleAuthService = require('../services/GoogleAuthService');
const { extractGoogleFileId } = require('../middleware/validate.middleware');
const logger = require('../utils/logger');

// Lazy-instantiate Razorpay SDK instance
function getRazorpayInstance() {
  const key_id = process.env.RAZORPAY_KEY_ID || 'rzp_test_TKXTHTnnmuJe0G';
  const key_secret = process.env.RAZORPAY_KEY_SECRET || '65Z1sGkVc28q36SiARsxM1u0';
  return new Razorpay({ key_id, key_secret });
}

function getUserIdFromReq(req) {
  if (!req.session?.user?.email) {
    const err = new Error('Authentication required. Please sign in with Google to access credits and make transactions.');
    err.status = 401;
    err.code = 'UNAUTHENTICATED';
    throw err;
  }
  return req.session.user.email;
}


class CreditController {
  /** GET /api/credits */
  static async getCreditStatus(req, res) {
    try {
      const userId = getUserIdFromReq(req);
      const creditInfo = await CreditService.getCreditInfo(userId);
      const packages = CreditService.getPackages();

      res.json({
        success: true,
        balance: creditInfo.balance,
        transactions: creditInfo.transactions,
        packages,
        razorpayKeyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_TKXTHTnnmuJe0G',
      });
    } catch (err) {
      logger.error(`Get credit status error: ${err.message}`);
      res.status(500).json({ error: err.message });
    }
  }

  /** POST /api/credits/estimate */
  static async estimateCredits(req, res) {
    try {
      const userId = getUserIdFromReq(req);
      const { sourceType, sheetUrl, sheetName, skipEmptyRows = true, data } = req.body;
      const currentBalance = await CreditService.getBalance(userId);

      let rowCount = 0;

      if (sourceType === 'sheet') {
        if (!sheetUrl) {
          return res.status(400).json({ error: 'sheetUrl is required for sheet estimate.' });
        }
        const sheetId = extractGoogleFileId(sheetUrl);
        const auth = GoogleAuthService.getClientFromSession(req.session);
        const sheetsService = new SheetsService(auth);
        const { records } = await sheetsService.readRows(sheetId, sheetName, skipEmptyRows);
        rowCount = records.length;
      } else if (sourceType === 'json' || sourceType === 'gemini') {
        if (!Array.isArray(data)) {
          return res.status(400).json({ error: 'data must be an array of objects.' });
        }
        rowCount = data.length;
      } else {
        return res.status(400).json({ error: 'Invalid sourceType. Expected sheet, json, or gemini.' });
      }

      const requiredCredits = rowCount; // 1 credit = 1 slide row
      const hasEnough = currentBalance >= requiredCredits;

      res.json({
        success: true,
        rowCount,
        requiredCredits,
        availableCredits: currentBalance,
        hasEnough,
        deficit: hasEnough ? 0 : requiredCredits - currentBalance,
      });
    } catch (err) {
      logger.error(`Credit estimation error: ${err.message}`);
      res.status(400).json({ error: err.message || 'Failed to estimate credits for input.' });
    }
  }

  /** POST /api/credits/create-order */
  static async createOrder(req, res) {
    try {
      const { packageId } = req.body;
      const packages = CreditService.getPackages();
      const pkg = packages[packageId];

      if (!pkg) {
        return res.status(400).json({ error: `Invalid package ID: ${packageId}` });
      }

      const razorpay = getRazorpayInstance();
      const options = {
        amount: pkg.amountInRs * 100, // Amount in paise
        currency: 'INR',
        receipt: `rcpt_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
        notes: {
          packageId: pkg.id,
          credits: pkg.credits,
          userEmail: req.session?.user?.email || 'Guest',
        },
      };

      const order = await razorpay.orders.create(options);
      logger.info(`Razorpay order created: ${order.id} for package ${pkg.id} (₹${pkg.amountInRs})`);

      res.json({
        success: true,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency,
        keyId: process.env.RAZORPAY_KEY_ID || 'rzp_test_TKXTHTnnmuJe0G',
        package: pkg,
      });
    } catch (err) {
      logger.error(`Razorpay create order error: ${err.message}`);
      res.status(500).json({ error: err.message || 'Failed to create Razorpay payment order.' });
    }
  }

  /** POST /api/credits/verify-payment */
  static async verifyPayment(req, res) {
    try {
      const { packageId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

      if (!packageId || !razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
        return res.status(400).json({ error: 'Missing required Razorpay payment verification parameters.' });
      }

      const secret = process.env.RAZORPAY_KEY_SECRET || '65Z1sGkVc28q36SiARsxM1u0';
      const body = razorpay_order_id + '|' + razorpay_payment_id;

      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(body.toString())
        .digest('hex');

      if (expectedSignature !== razorpay_signature) {
        logger.warn(`Razorpay payment signature mismatch for order ${razorpay_order_id}`);
        return res.status(400).json({ error: 'Payment signature verification failed. Invalid payment.' });
      }

      const userId = getUserIdFromReq(req);
      const newBalance = await CreditService.addCredits(userId, packageId, razorpay_payment_id, razorpay_order_id);

      res.json({
        success: true,
        message: 'Payment verified and credits added successfully!',
        newBalance,
      });
    } catch (err) {
      logger.error(`Payment verification error: ${err.message}`);
      res.status(500).json({ error: err.message || 'Failed to verify payment.' });
    }
  }

}

module.exports = CreditController;
