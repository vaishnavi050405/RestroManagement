const { query, isFallback, mockDb } = require('../config/db');
const { sendSmsNotification } = require('../services/smsService');

// Generate invoice number
function generateInvoiceNumber() {
  const timestamp = Date.now().toString().slice(-4);
  const random = Math.floor(Math.random() * 900 + 100);
  return `INV-${new Date().getFullYear()}-${timestamp}${random}`;
}

// Generate Thank You Text Message
function generateThankYouSms(customerName, invoiceNumber, grandTotal, paymentMethod, tableNumber) {
  const name = customerName || 'Valued Guest';
  const table = tableNumber || 'Takeaway';
  return `Dear ${name}, thank you for dining with us at RestroOps Gourmet! 🍽️\n\n` +
         `📄 Invoice: ${invoiceNumber}\n` +
         `🪑 Table: ${table}\n` +
         `💳 Amount Paid: ₹${parseFloat(grandTotal).toFixed(2)} (${String(paymentMethod).toUpperCase()})\n\n` +
         `We hope you had a wonderful culinary experience! Looking forward to welcoming you again soon. ✨`;
}

// GET billing preview calculation for an order
exports.getBillPreview = async (req, res) => {
  try {
    const orderId = req.params.orderId;
    if (!orderId || orderId === 'undefined' || orderId === 'null') {
      return res.status(400).json({ success: false, message: 'Invalid order ID provided' });
    }

    const taxRate = parseFloat(req.query.tax_rate ?? 5.0);
    const discountPercent = parseFloat(req.query.discount_percent ?? 0.0);
    const tipAmount = parseFloat(req.query.tip_amount ?? 0.0);

    if (isFallback()) {
      const order = mockDb.orders.find(o => String(o.id) === String(orderId));
      if (!order) return res.status(404).json({ success: false, message: `Order #${orderId} not found` });

      const table = order.table_id ? mockDb.tables.find(t => String(t.id) === String(order.table_id)) : null;
      const items = mockDb.order_items.filter(oi => String(oi.order_id) === String(order.id) && oi.item_status !== 'cancelled').map(oi => {
        const menuItem = mockDb.menu_items.find(m => String(m.id) === String(oi.menu_item_id));
        return {
          ...oi,
          item_name: menuItem ? menuItem.name : (oi.item_name || 'Item'),
          is_veg: menuItem ? menuItem.is_veg : (oi.is_veg ?? 1)
        };
      });

      let subtotal = items.reduce((sum, item) => sum + parseFloat(item.total_price || 0), 0);
      if (subtotal === 0 && parseFloat(order.total_amount || 0) > 0) {
        subtotal = parseFloat(order.total_amount);
      }

      const discountAmount = parseFloat(((subtotal * discountPercent) / 100).toFixed(2));
      const taxableAmount = Math.max(0, subtotal - discountAmount);
      const taxAmount = parseFloat(((taxableAmount * taxRate) / 100).toFixed(2));
      const grandTotal = parseFloat((taxableAmount + taxAmount + tipAmount).toFixed(2));

      return res.json({
        success: true,
        data: {
          order_id: order.id,
          order_number: order.order_number,
          order_type: order.order_type,
          customer_name: order.customer_name || 'Guest',
          customer_phone: order.customer_phone || '',
          table_id: order.table_id,
          table_number: table ? table.table_number : (order.order_type === 'takeaway' ? 'Takeaway' : 'N/A'),
          section: table ? table.section : 'N/A',
          items,
          subtotal,
          tax_rate: taxRate,
          tax_amount: taxAmount,
          discount_percent: discountPercent,
          discount_amount: discountAmount,
          tip_amount: tipAmount,
          grand_total: grandTotal,
          payment_status: order.payment_status
        }
      });
    }

    // Live MySQL Mode
    const orderRows = await query('SELECT o.*, t.table_number, t.section FROM orders o LEFT JOIN tables t ON o.table_id = t.id WHERE o.id = ?', [orderId]) || [];
    if (!orderRows.length) return res.status(404).json({ success: false, message: 'Order not found' });

    const order = orderRows[0];
    const items = await query(`
      SELECT oi.*, m.name AS item_name, m.is_veg
      FROM order_items oi
      LEFT JOIN menu_items m ON oi.menu_item_id = m.id
      WHERE oi.order_id = ? AND oi.item_status != 'cancelled'
    `, [orderId]) || [];

    let subtotal = items.reduce((sum, item) => sum + parseFloat(item.total_price || 0), 0);
    if (subtotal === 0 && parseFloat(order.total_amount || 0) > 0) {
      subtotal = parseFloat(order.total_amount);
    }

    const discountAmount = parseFloat(((subtotal * discountPercent) / 100).toFixed(2));
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const taxAmount = parseFloat(((taxableAmount * taxRate) / 100).toFixed(2));
    const grandTotal = parseFloat((taxableAmount + taxAmount + tipAmount).toFixed(2));

    res.json({
      success: true,
      data: {
        order_id: order.id,
        order_number: order.order_number,
        order_type: order.order_type,
        customer_name: order.customer_name || 'Guest',
        customer_phone: order.customer_phone || '',
        table_id: order.table_id,
        table_number: order.table_number || (order.order_type === 'takeaway' ? 'Takeaway' : 'N/A'),
        section: order.section || 'N/A',
        items,
        subtotal,
        tax_rate: taxRate,
        tax_amount: taxAmount,
        discount_percent: discountPercent,
        discount_amount: discountAmount,
        tip_amount: tipAmount,
        grand_total: grandTotal,
        payment_status: order.payment_status
      }
    });
  } catch (error) {
    console.error('Error in getBillPreview:', error);
    res.status(500).json({ success: false, message: 'Failed to compute bill preview', error: error.message });
  }
};

// PROCESS CHECKOUT / SETTLE PAYMENT & SEND THANK YOU SMS
exports.processPayment = async (req, res) => {
  try {
    const {
      order_id,
      customer_name = 'Guest',
      customer_phone = '',
      payment_method = 'cash',
      discount_percent = 0,
      tax_rate = 5.0,
      tip_amount = 0,
      cashier_notes = '',
      auto_free_table = true,
      next_table_status = 'cleaning'
    } = req.body;

    if (!order_id) {
      return res.status(400).json({ success: false, message: 'Order ID is required' });
    }

    const cleanPaymentMethod = String(payment_method).toLowerCase();
    const invoiceNumber = generateInvoiceNumber();

    if (isFallback()) {
      const order = mockDb.orders.find(o => String(o.id) === String(order_id));
      if (!order) {
        return res.status(404).json({ success: false, message: `Order #${order_id} not found in database` });
      }

      // Update customer info
      order.customer_name = (customer_name || order.customer_name || 'Guest').trim();
      order.customer_phone = (customer_phone || order.customer_phone || '').trim();

      const table = order.table_id ? mockDb.tables.find(t => String(t.id) === String(order.table_id)) : null;
      const tableNumber = table ? table.table_number : (order.order_type === 'takeaway' ? 'Takeaway' : 'N/A');

      // Calculate bill figures
      const items = mockDb.order_items.filter(oi => String(oi.order_id) === String(order.id) && oi.item_status !== 'cancelled');
      let subtotal = items.reduce((sum, item) => sum + parseFloat(item.total_price || 0), 0);
      if (subtotal === 0 && parseFloat(order.total_amount || 0) > 0) {
        subtotal = parseFloat(order.total_amount);
      }

      const discPct = parseFloat(discount_percent || 0);
      const taxPct = parseFloat(tax_rate || 5);
      const tipVal = parseFloat(tip_amount || 0);

      const discountAmount = parseFloat(((subtotal * discPct) / 100).toFixed(2));
      const taxableAmount = Math.max(0, subtotal - discountAmount);
      const taxAmount = parseFloat(((taxableAmount * taxPct) / 100).toFixed(2));
      const grandTotal = parseFloat((taxableAmount + taxAmount + tipVal).toFixed(2));

      // Update Order
      order.status = 'completed';
      order.payment_status = 'paid';
      order.total_amount = subtotal;
      order.discount_amount = discountAmount;
      order.tax_amount = taxAmount;
      order.grand_total = grandTotal;

      // Create Bill Record
      const newBillId = mockDb.bills.length > 0 ? Math.max(...mockDb.bills.map(b => b.id || 0)) + 1 : 1;
      const smsMessage = generateThankYouSms(order.customer_name, invoiceNumber, grandTotal, cleanPaymentMethod, tableNumber);

      const newBill = {
        id: newBillId,
        invoice_number: invoiceNumber,
        order_id: order.id,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        subtotal,
        tax_rate: taxPct,
        tax_amount: taxAmount,
        discount_percent: discPct,
        discount_amount: discountAmount,
        tip_amount: tipVal,
        grand_total: grandTotal,
        payment_method: cleanPaymentMethod,
        payment_status: 'completed',
        sms_status: 'sent',
        sms_text: smsMessage,
        paid_at: new Date().toISOString(),
        cashier_notes: cashier_notes || '',
        created_at: new Date().toISOString()
      };
      mockDb.bills.unshift(newBill);

      // Free or clean Table
      if (order.table_id && auto_free_table) {
        if (table) {
          table.status = next_table_status; // 'cleaning' or 'available'
          table.current_order_id = null;
        }
      }

      // Trigger Telecom SMS dispatch asynchronously
      sendSmsNotification({
        to: order.customer_phone,
        message: smsMessage,
        customerName: order.customer_name
      }).catch(err => console.error('[SMS Dispatch Error]:', err));

      console.log(`[Checkout Success] Invoice: ${invoiceNumber}, Amount: ₹${grandTotal}, Customer: ${order.customer_name}, Phone: ${order.customer_phone}`);

      return res.status(201).json({
        success: true,
        message: 'Payment settled and bill generated successfully',
        data: {
          bill: newBill,
          order,
          invoice_number: invoiceNumber,
          grand_total: grandTotal,
          customer_name: order.customer_name,
          customer_phone: order.customer_phone,
          sms_notification: {
            recipient_name: order.customer_name,
            recipient_phone: order.customer_phone || '',
            message_text: smsMessage,
            status: 'sent',
            sent_at: new Date().toISOString()
          }
        }
      });
    }

    // Live MySQL Execution
    const orderRows = await query('SELECT * FROM orders WHERE id = ?', [order_id]) || [];
    if (!orderRows.length) return res.status(404).json({ success: false, message: 'Order not found' });
    const order = orderRows[0];

    const finalCustomerName = (customer_name || order.customer_name || 'Guest').trim();
    const finalCustomerPhone = (customer_phone || order.customer_phone || '').trim();

    const items = await query('SELECT * FROM order_items WHERE order_id = ? AND item_status != "cancelled"', [order_id]) || [];
    let subtotal = items.reduce((sum, item) => sum + parseFloat(item.total_price || 0), 0);
    if (subtotal === 0 && parseFloat(order.total_amount || 0) > 0) {
      subtotal = parseFloat(order.total_amount);
    }

    const discPct = parseFloat(discount_percent || 0);
    const taxPct = parseFloat(tax_rate || 5);
    const tipVal = parseFloat(tip_amount || 0);

    const discountAmount = parseFloat(((subtotal * discPct) / 100).toFixed(2));
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const taxAmount = parseFloat(((taxableAmount * taxPct) / 100).toFixed(2));
    const grandTotal = parseFloat((taxableAmount + taxAmount + tipVal).toFixed(2));

    let tableNumber = 'Takeaway';
    if (order.table_id) {
      const tableRows = await query('SELECT table_number FROM tables WHERE id = ?', [order.table_id]) || [];
      if (tableRows.length > 0) tableNumber = tableRows[0].table_number;
    }

    const smsMessage = generateThankYouSms(finalCustomerName, invoiceNumber, grandTotal, cleanPaymentMethod, tableNumber);

    // 1. Insert into bills with dynamic column fallback
    let billId = null;
    try {
      const insertFullSql = `
        INSERT INTO bills (invoice_number, order_id, customer_name, customer_phone, subtotal, tax_rate, tax_amount, discount_percent, discount_amount, tip_amount, grand_total, payment_method, payment_status, sms_status, sms_text, cashier_notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', 'sent', ?, ?)
      `;
      const billResult = await query(insertFullSql, [
        invoiceNumber,
        order_id,
        finalCustomerName,
        finalCustomerPhone,
        subtotal,
        taxPct,
        taxAmount,
        discPct,
        discountAmount,
        tipVal,
        grandTotal,
        cleanPaymentMethod,
        smsMessage,
        cashier_notes || ''
      ]);
      billId = billResult.insertId;
    } catch (e) {
      const insertBasicSql = `
        INSERT INTO bills (invoice_number, order_id, subtotal, tax_rate, tax_amount, discount_percent, discount_amount, tip_amount, grand_total, payment_method, payment_status, cashier_notes)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', ?)
      `;
      const basicResult = await query(insertBasicSql, [
        invoiceNumber,
        order_id,
        subtotal,
        taxPct,
        taxAmount,
        discPct,
        discountAmount,
        tipVal,
        grandTotal,
        cleanPaymentMethod,
        cashier_notes || ''
      ]);
      billId = basicResult.insertId;
    }

    // 2. Update order status to completed and paid
    await query(
      'UPDATE orders SET status = "completed", payment_status = "paid", customer_name = ?, customer_phone = ?, total_amount = ?, tax_amount = ?, discount_amount = ?, grand_total = ? WHERE id = ?',
      [finalCustomerName, finalCustomerPhone, subtotal, taxAmount, discountAmount, grandTotal, order_id]
    );

    // 3. Update table status
    if (order.table_id && auto_free_table) {
      await query(
        'UPDATE tables SET status = ?, current_order_id = NULL WHERE id = ?',
        [next_table_status, order.table_id]
      );
    }

    // 4. Trigger SMS Notification
    sendSmsNotification({
      to: finalCustomerPhone,
      message: smsMessage,
      customerName: finalCustomerName
    }).catch(err => console.error('[SMS Dispatch Error]:', err));

    res.status(201).json({
      success: true,
      message: 'Payment settled and Thank You SMS dispatched successfully',
      data: {
        bill_id: billId,
        invoice_number: invoiceNumber,
        grand_total: grandTotal,
        payment_method: cleanPaymentMethod,
        customer_name: finalCustomerName,
        customer_phone: finalCustomerPhone,
        sms_notification: {
          recipient_name: finalCustomerName,
          recipient_phone: finalCustomerPhone,
          message_text: smsMessage,
          status: 'sent',
          sent_at: new Date().toISOString()
        }
      }
    });
  } catch (error) {
    console.error('Error settling payment:', error);
    res.status(500).json({ success: false, message: error.message || 'Payment processing failed' });
  }
};

// GET all bills / receipts history
exports.getAllBills = async (req, res) => {
  try {
    if (isFallback()) {
      const enrichedBills = mockDb.bills.map(bill => {
        const order = mockDb.orders.find(o => String(o.id) === String(bill.order_id));
        const table = order && order.table_id ? mockDb.tables.find(t => String(t.id) === String(order.table_id)) : null;
        return {
          ...bill,
          order_number: order ? order.order_number : 'N/A',
          customer_name: bill.customer_name || (order ? order.customer_name : 'Guest'),
          customer_phone: bill.customer_phone || (order ? order.customer_phone : ''),
          table_number: table ? table.table_number : (order && order.order_type === 'takeaway' ? 'Takeaway' : 'N/A')
        };
      });
      return res.json({ success: true, count: enrichedBills.length, data: enrichedBills });
    }

    const sql = `
      SELECT b.*, o.order_number, o.customer_name AS order_cust_name, o.customer_phone AS order_cust_phone, o.order_type, t.table_number
      FROM bills b
      LEFT JOIN orders o ON b.order_id = o.id
      LEFT JOIN tables t ON o.table_id = t.id
      ORDER BY b.created_at DESC;
    `;
    const bills = await query(sql) || [];
    const formattedBills = bills.map(b => ({
      ...b,
      customer_name: b.customer_name || b.order_cust_name || 'Guest',
      customer_phone: b.customer_phone || b.order_cust_phone || '',
      table_number: b.table_number || (b.order_type === 'takeaway' ? 'Takeaway' : 'N/A')
    }));

    res.json({ success: true, count: formattedBills.length, data: formattedBills });
  } catch (error) {
    console.error('Error fetching bills history:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch bills history', error: error.message });
  }
};
