const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');

router.get('/', orderController.getAllOrders);
router.get('/:id', orderController.getOrderById);
router.post('/', orderController.createOrder);
router.post('/:id/items', orderController.addItemsToOrder);
router.patch('/:id/status', orderController.updateOrderStatus);

module.exports = router;
