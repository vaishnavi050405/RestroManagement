const express = require('express');
const router = express.Router();
const kitchenController = require('../controllers/kitchenController');

router.get('/queue', kitchenController.getKitchenQueue);
router.patch('/items/:itemId/status', kitchenController.updateItemStatus);
router.patch('/orders/:orderId/batch-status', kitchenController.updateEntireTicketStatus);

module.exports = router;
