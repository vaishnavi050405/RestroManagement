const { query, isFallback, mockDb } = require('../config/db');

// GET all active kitchen orders / KDS queue
exports.getKitchenQueue = async (req, res) => {
  try {
    if (isFallback()) {
      // Find orders that are active/kitchen_processing/ready_to_serve
      const activeOrders = mockDb.orders.filter(o => 
        ['active', 'kitchen_processing', 'ready_to_serve'].includes(o.status)
      );

      const kdsTickets = activeOrders.map(order => {
        const table = order.table_id ? mockDb.tables.find(t => t.id === order.table_id) : null;
        const items = mockDb.order_items
          .filter(oi => oi.order_id === order.id && oi.item_status !== 'cancelled')
          .map(oi => {
            const menuItem = mockDb.menu_items.find(m => m.id === oi.menu_item_id);
            return {
              id: oi.id,
              order_id: oi.order_id,
              menu_item_id: oi.menu_item_id,
              item_name: menuItem ? menuItem.name : 'Unknown Item',
              is_veg: menuItem ? menuItem.is_veg : 1,
              prep_time_mins: menuItem ? menuItem.prep_time_mins : 15,
              quantity: oi.quantity,
              special_instructions: oi.special_instructions,
              item_status: oi.item_status,
              created_at: oi.created_at
            };
          });

        const elapsedMinutes = Math.floor((Date.now() - new Date(order.created_at).getTime()) / 60000);

        return {
          order_id: order.id,
          order_number: order.order_number,
          order_type: order.order_type,
          customer_name: order.customer_name,
          table_id: order.table_id,
          table_number: table ? table.table_number : (order.order_type === 'takeaway' ? 'Takeaway' : 'N/A'),
          section: table ? table.section : 'N/A',
          notes: order.notes,
          created_at: order.created_at,
          elapsed_minutes: Math.max(0, elapsedMinutes),
          status: order.status,
          items
        };
      });

      // Sort by oldest first for KDS queue priority
      kdsTickets.sort((a, b) => new Date(a.created_at) - new Date(b.created_at));

      return res.json({ success: true, count: kdsTickets.length, data: kdsTickets });
    }

    const sql = `
      SELECT o.id AS order_id, o.order_number, o.order_type, o.customer_name, o.table_id,
             t.table_number, t.section, o.notes, o.created_at, o.status,
             TIMESTAMPDIFF(MINUTE, o.created_at, NOW()) AS elapsed_minutes
      FROM orders o
      LEFT JOIN tables t ON o.table_id = t.id
      WHERE o.status IN ('active', 'kitchen_processing', 'ready_to_serve')
      ORDER BY o.created_at ASC;
    `;
    const tickets = await query(sql) || [];

    for (const ticket of tickets) {
      const items = await query(`
        SELECT oi.id, oi.order_id, oi.menu_item_id, m.name AS item_name, m.is_veg, m.prep_time_mins,
               oi.quantity, oi.special_instructions, oi.item_status, oi.created_at
        FROM order_items oi
        JOIN menu_items m ON oi.menu_item_id = m.id
        WHERE oi.order_id = ? AND oi.item_status != 'cancelled'
        ORDER BY oi.id ASC
      `, [ticket.order_id]) || [];

      ticket.items = items;
      ticket.elapsed_minutes = Math.max(0, ticket.elapsed_minutes || 0);
    }

    res.json({ success: true, count: tickets.length, data: tickets });
  } catch (error) {
    console.error('Error fetching kitchen queue:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve kitchen queue', error: error.message });
  }
};

// UPDATE status of a single order item (pending -> preparing -> ready -> served)
exports.updateItemStatus = async (req, res) => {
  try {
    const itemId = parseInt(req.params.itemId, 10);
    const { status } = req.body;

    const validStatuses = ['pending', 'preparing', 'ready', 'served', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status: ${status}` });
    }

    if (isFallback()) {
      const item = mockDb.order_items.find(oi => oi.id === itemId);
      if (!item) return res.status(404).json({ success: false, message: 'Order item not found' });

      item.item_status = status;
      if (status === 'ready' || status === 'served') {
        item.prepared_at = new Date().toISOString();
      }

      // Check if all items in this order are ready or served to update order level status
      const siblingItems = mockDb.order_items.filter(oi => oi.order_id === item.order_id && oi.item_status !== 'cancelled');
      const order = mockDb.orders.find(o => o.id === item.order_id);

      if (order && siblingItems.length > 0) {
        const allServed = siblingItems.every(i => i.item_status === 'served');
        const allReadyOrServed = siblingItems.every(i => i.item_status === 'ready' || i.item_status === 'served');
        const anyPreparing = siblingItems.some(i => i.item_status === 'preparing');

        if (allServed) {
          order.status = 'served';
        } else if (allReadyOrServed) {
          order.status = 'ready_to_serve';
        } else if (anyPreparing) {
          order.status = 'kitchen_processing';
        }
      }

      return res.json({ success: true, message: 'Item status updated', data: item });
    }

    // MySQL execution
    const prepTimeUpdate = (status === 'ready' || status === 'served') ? ', prepared_at = NOW()' : '';
    await query(`UPDATE order_items SET item_status = ? ${prepTimeUpdate} WHERE id = ?`, [status, itemId]);

    // Find order_id
    const itemRows = await query('SELECT order_id FROM order_items WHERE id = ?', [itemId]) || [];
    if (itemRows.length > 0) {
      const orderId = itemRows[0].order_id;
      const siblingItems = await query('SELECT item_status FROM order_items WHERE order_id = ? AND item_status != "cancelled"', [orderId]) || [];

      if (siblingItems.length > 0) {
        const allServed = siblingItems.every(i => i.item_status === 'served');
        const allReadyOrServed = siblingItems.every(i => i.item_status === 'ready' || i.item_status === 'served');
        const anyPreparing = siblingItems.some(i => i.item_status === 'preparing');

        let newOrderStatus = 'kitchen_processing';
        if (allServed) newOrderStatus = 'served';
        else if (allReadyOrServed) newOrderStatus = 'ready_to_serve';
        else if (anyPreparing) newOrderStatus = 'kitchen_processing';

        await query('UPDATE orders SET status = ? WHERE id = ?', [newOrderStatus, orderId]);
      }
    }

    res.json({ success: true, message: 'Item status updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update item status', error: error.message });
  }
};

// BATCH update entire order's items to READY / SERVED
exports.updateEntireTicketStatus = async (req, res) => {
  try {
    const orderId = parseInt(req.params.orderId, 10);
    const { status } = req.body; // e.g. 'ready' or 'served'

    if (isFallback()) {
      const order = mockDb.orders.find(o => o.id === orderId);
      if (!order) return res.status(404).json({ success: false, message: 'Order not found' });

      mockDb.order_items.forEach(oi => {
        if (oi.order_id === orderId && oi.item_status !== 'cancelled') {
          oi.item_status = status;
          if (status === 'ready' || status === 'served') oi.prepared_at = new Date().toISOString();
        }
      });

      order.status = status === 'ready' ? 'ready_to_serve' : 'served';
      return res.json({ success: true, message: `Ticket marked as ${status}` });
    }

    await query(
      'UPDATE order_items SET item_status = ?, prepared_at = NOW() WHERE order_id = ? AND item_status != "cancelled"',
      [status, orderId]
    );
    const orderStatus = status === 'ready' ? 'ready_to_serve' : 'served';
    await query('UPDATE orders SET status = ? WHERE id = ?', [orderStatus, orderId]);

    res.json({ success: true, message: `Ticket status set to ${orderStatus}` });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update ticket status', error: error.message });
  }
};
