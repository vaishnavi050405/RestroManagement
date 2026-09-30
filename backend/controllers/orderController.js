const { query, isFallback, mockDb } = require('../config/db');

// Generate unique order number (e.g., ORD-2026-004)
function generateOrderNumber() {
  const timestamp = Date.now().toString().slice(-4);
  const random = Math.floor(Math.random() * 900 + 100);
  return `ORD-${new Date().getFullYear()}-${timestamp}${random}`;
}

// CREATE new order
exports.createOrder = async (req, res) => {
  try {
    const { table_id, order_type = 'dine_in', customer_name = 'Guest', customer_phone = '', notes = '', items = [] } = req.body;

    if (order_type === 'dine_in' && !table_id) {
      return res.status(400).json({ success: false, message: 'Table ID is required for dine-in orders' });
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'Order must contain at least one item' });
    }

    // Calculate subtotal
    let subtotal = 0;
    const processedItems = items.map(item => {
      const qty = parseInt(item.quantity || 1, 10);
      const unitPrice = parseFloat(item.unit_price || item.price || 0);
      const totalPrice = qty * unitPrice;
      subtotal += totalPrice;
      return {
        menu_item_id: item.menu_item_id || item.id,
        name: item.name,
        quantity: qty,
        unit_price: unitPrice,
        total_price: totalPrice,
        special_instructions: item.special_instructions || '',
        item_status: 'pending'
      };
    });

    const taxRate = 5.0; // 5% GST/Tax
    const taxAmount = parseFloat(((subtotal * taxRate) / 100).toFixed(2));
    const discountAmount = 0.0;
    const grandTotal = parseFloat((subtotal + taxAmount - discountAmount).toFixed(2));
    const orderNumber = generateOrderNumber();

    if (isFallback()) {
      const newOrderId = mockDb.orders.length > 0 ? Math.max(...mockDb.orders.map(o => o.id)) + 1 : 101;
      const newOrder = {
        id: newOrderId,
        order_number: orderNumber,
        table_id: table_id ? parseInt(table_id, 10) : null,
        order_type,
        customer_name,
        customer_phone,
        status: 'kitchen_processing',
        total_amount: subtotal,
        tax_amount: taxAmount,
        discount_amount: discountAmount,
        grand_total: grandTotal,
        payment_status: 'unpaid',
        notes,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      mockDb.orders.unshift(newOrder);

      // Save order items
      let lastItemId = mockDb.order_items.length > 0 ? Math.max(...mockDb.order_items.map(oi => oi.id)) : 0;
      processedItems.forEach(item => {
        lastItemId++;
        mockDb.order_items.push({
          id: lastItemId,
          order_id: newOrderId,
          menu_item_id: item.menu_item_id,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total_price: item.total_price,
          special_instructions: item.special_instructions,
          item_status: 'pending',
          created_at: new Date().toISOString()
        });
      });

      // Update table to occupied
      if (table_id) {
        const table = mockDb.tables.find(t => t.id === parseInt(table_id, 10));
        if (table) {
          table.status = 'occupied';
          table.current_order_id = newOrderId;
        }
      }

      return res.status(201).json({
        success: true,
        message: 'Order created successfully and sent to Kitchen',
        data: {
          ...newOrder,
          items: processedItems
        }
      });
    }

    // Live MySQL Execution
    const orderSql = `
      INSERT INTO orders (order_number, table_id, order_type, customer_name, customer_phone, status, total_amount, tax_amount, discount_amount, grand_total, payment_status, notes)
      VALUES (?, ?, ?, ?, ?, 'kitchen_processing', ?, ?, ?, ?, 'unpaid', ?)
    `;
    const orderResult = await query(orderSql, [
      orderNumber,
      table_id || null,
      order_type,
      customer_name,
      customer_phone,
      subtotal,
      taxAmount,
      discountAmount,
      grandTotal,
      notes
    ]);
    const orderId = orderResult.insertId;

    // Insert order items
    for (const item of processedItems) {
      await query(
        'INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, total_price, special_instructions, item_status) VALUES (?, ?, ?, ?, ?, ?, "pending")',
        [orderId, item.menu_item_id, item.quantity, item.unit_price, item.total_price, item.special_instructions]
      );
    }

    // Set Table to occupied
    if (table_id) {
      await query('UPDATE tables SET status = "occupied", current_order_id = ? WHERE id = ?', [orderId, table_id]);
    }

    res.status(201).json({
      success: true,
      message: 'Order created successfully and dispatched to kitchen',
      data: {
        id: orderId,
        order_number: orderNumber,
        table_id,
        order_type,
        customer_name,
        status: 'kitchen_processing',
        total_amount: subtotal,
        tax_amount: taxAmount,
        grand_total: grandTotal,
        items: processedItems
      }
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ success: false, message: 'Failed to create order', error: error.message });
  }
};

// GET all orders with optional filter (status, table_id, payment_status)
exports.getAllOrders = async (req, res) => {
  try {
    const { status, payment_status, order_type } = req.query;

    if (isFallback()) {
      let filtered = [...mockDb.orders];
      if (status) filtered = filtered.filter(o => o.status === status);
      if (payment_status) filtered = filtered.filter(o => o.payment_status === payment_status);
      if (order_type) filtered = filtered.filter(o => o.order_type === order_type);

      const enriched = filtered.map(order => {
        const table = order.table_id ? mockDb.tables.find(t => t.id === order.table_id) : null;
        const items = mockDb.order_items.filter(oi => oi.order_id === order.id).map(oi => {
          const menuItem = mockDb.menu_items.find(m => m.id === oi.menu_item_id);
          return {
            ...oi,
            item_name: menuItem ? menuItem.name : 'Unknown Item',
            is_veg: menuItem ? menuItem.is_veg : 1
          };
        });

        return {
          ...order,
          table_number: table ? table.table_number : (order.order_type === 'takeaway' ? 'Takeaway' : 'N/A'),
          section: table ? table.section : 'N/A',
          items,
          items_count: items.length
        };
      });

      return res.json({ success: true, count: enriched.length, data: enriched });
    }

    let sql = `
      SELECT o.*, t.table_number, t.section
      FROM orders o
      LEFT JOIN tables t ON o.table_id = t.id
      WHERE 1=1
    `;
    const params = [];

    if (status) {
      sql += ' AND o.status = ?';
      params.push(status);
    }
    if (payment_status) {
      sql += ' AND o.payment_status = ?';
      params.push(payment_status);
    }
    if (order_type) {
      sql += ' AND o.order_type = ?';
      params.push(order_type);
    }

    sql += ' ORDER BY o.created_at DESC';

    const orders = await query(sql, params) || [];

    // Fetch order items for each order
    for (const order of orders) {
      const items = await query(`
        SELECT oi.*, m.name AS item_name, m.is_veg
        FROM order_items oi
        JOIN menu_items m ON oi.menu_item_id = m.id
        WHERE oi.order_id = ?
      `, [order.id]) || [];
      order.items = items;
      order.items_count = items.length;
    }

    res.json({ success: true, count: orders.length, data: orders });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch orders', error: error.message });
  }
};

// GET order by ID
exports.getOrderById = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isFallback()) {
      const order = mockDb.orders.find(o => o.id === id);
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

      const table = order.table_id ? mockDb.tables.find(t => t.id === order.table_id) : null;
      const items = mockDb.order_items.filter(oi => oi.order_id === order.id).map(oi => {
        const menuItem = mockDb.menu_items.find(m => m.id === oi.menu_item_id);
        return {
          ...oi,
          item_name: menuItem ? menuItem.name : 'Unknown Item',
          is_veg: menuItem ? menuItem.is_veg : 1
        };
      });

      return res.json({
        success: true,
        data: {
          ...order,
          table_number: table ? table.table_number : 'Takeaway',
          section: table ? table.section : 'N/A',
          items
        }
      });
    }

    const orderRows = await query(`
      SELECT o.*, t.table_number, t.section
      FROM orders o
      LEFT JOIN tables t ON o.table_id = t.id
      WHERE o.id = ?
    `, [id]) || [];

    if (!orderRows.length) {
      return res.status(404).json({ success: false, message: 'Order not found' });
    }

    const order = orderRows[0];
    const items = await query(`
      SELECT oi.*, m.name AS item_name, m.is_veg, m.prep_time_mins
      FROM order_items oi
      JOIN menu_items m ON oi.menu_item_id = m.id
      WHERE oi.order_id = ?
    `, [id]) || [];
    order.items = items;

    res.json({ success: true, data: order });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to retrieve order', error: error.message });
  }
};

// ADD items to existing order
exports.addItemsToOrder = async (req, res) => {
  try {
    const orderId = parseInt(req.params.id, 10);
    const { items = [] } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ success: false, message: 'No items provided' });
    }

    if (isFallback()) {
      const order = mockDb.orders.find(o => o.id === orderId);
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

      let addedSubtotal = 0;
      let lastItemId = mockDb.order_items.length > 0 ? Math.max(...mockDb.order_items.map(oi => oi.id)) : 0;

      items.forEach(item => {
        lastItemId++;
        const qty = parseInt(item.quantity || 1, 10);
        const unitPrice = parseFloat(item.unit_price || item.price || 0);
        const total = qty * unitPrice;
        addedSubtotal += total;

        mockDb.order_items.push({
          id: lastItemId,
          order_id: orderId,
          menu_item_id: item.menu_item_id || item.id,
          quantity: qty,
          unit_price: unitPrice,
          total_price: total,
          special_instructions: item.special_instructions || '',
          item_status: 'pending',
          created_at: new Date().toISOString()
        });
      });

      // Recalculate totals
      order.total_amount += addedSubtotal;
      order.tax_amount = parseFloat(((order.total_amount * 5) / 100).toFixed(2));
      order.grand_total = parseFloat((order.total_amount + order.tax_amount - order.discount_amount).toFixed(2));
      order.status = 'kitchen_processing';

      return res.json({ success: true, message: 'Items added to order and sent to kitchen', data: order });
    }

    // MySQL execution
    const orderRows = await query('SELECT * FROM orders WHERE id = ?', [orderId]) || [];
    if (!orderRows.length) return res.status(404).json({ success: false, message: 'Order not found' });

    let addedSubtotal = 0;
    for (const item of items) {
      const qty = parseInt(item.quantity || 1, 10);
      const unitPrice = parseFloat(item.unit_price || item.price || 0);
      const totalPrice = qty * unitPrice;
      addedSubtotal += totalPrice;

      await query(
        'INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, total_price, special_instructions, item_status) VALUES (?, ?, ?, ?, ?, ?, "pending")',
        [orderId, item.menu_item_id || item.id, qty, unitPrice, totalPrice, item.special_instructions || '']
      );
    }

    const currentOrder = orderRows[0];
    const newTotal = parseFloat(currentOrder.total_amount) + addedSubtotal;
    const newTax = parseFloat(((newTotal * 5) / 100).toFixed(2));
    const newGrandTotal = parseFloat((newTotal + newTax - parseFloat(currentOrder.discount_amount)).toFixed(2));

    await query(
      'UPDATE orders SET total_amount = ?, tax_amount = ?, grand_total = ?, status = "kitchen_processing" WHERE id = ?',
      [newTotal, newTax, newGrandTotal, orderId]
    );

    res.json({ success: true, message: 'Items added and kitchen tickets generated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to add items to order', error: error.message });
  }
};

// UPDATE order status
exports.updateOrderStatus = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status } = req.body;

    if (isFallback()) {
      const order = mockDb.orders.find(o => o.id === id);
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });
      order.status = status;
      return res.json({ success: true, message: 'Order status updated', data: order });
    }

    await query('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
    res.json({ success: true, message: 'Order status updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update order status', error: error.message });
  }
};
