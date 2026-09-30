const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');

router.get('/', menuController.getMenu);
router.get('/categories', menuController.getCategories);
router.post('/items', menuController.createMenuItem);
router.patch('/items/:id/availability', menuController.toggleItemAvailability);
router.put('/items/:id', menuController.updateMenuItem);
router.delete('/items/:id', menuController.deleteMenuItem);

module.exports = router;
