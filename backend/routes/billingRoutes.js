const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');

router.get('/preview/:orderId', billingController.getBillPreview);
router.post('/checkout', billingController.processPayment);
router.get('/history', billingController.getAllBills);

module.exports = router;
