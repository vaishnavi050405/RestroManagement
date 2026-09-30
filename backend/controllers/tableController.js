const { query, isFallback, mockDb } = require('../config/db');

// GET all tables with current order summary if occupied
exports.getAllTables = async (req, res) => {
  try {
    if (isFallback()) {
      const tables = mockDb.tables.map(table => {
        let currentOrder = null;
        if (table.current_order_id) {
          currentOrder = mockDb.orders.find(o => o.id === table.current_order_id) || null;
        }
        return {
          ...table,
          order_info: currentOrder ? {
            order_id: currentOrder.id,
            order_number: currentOrder.order_number,
            customer_name: currentOrder.customer_name,
            grand_total: currentOrder.grand_total,
            status: currentOrder.status,
            created_at: currentOrder.created_at
          } : null
        };
      });

      return res.json({ success: true, count: tables.length, data: tables, source: 'in-memory' });
    }

    const sql = `
      SELECT t.*, 
             o.id AS active_order_id, 
             o.order_number AS active_order_number,
             o.customer_name AS active_customer_name,
             o.grand_total AS active_grand_total,
             o.status AS active_order_status,
             o.created_at AS active_order_created_at
      FROM tables t
      LEFT JOIN orders o ON t.current_order_id = o.id
      ORDER BY t.section, t.table_number;
    `;
    const rows = await query(sql);

    const tables = rows.map(r => ({
      id: r.id,
      table_number: r.table_number,
      capacity: r.capacity,
      section: r.section,
      status: r.status,
      current_order_id: r.current_order_id,
      created_at: r.created_at,
      order_info: r.active_order_id ? {
        order_id: r.active_order_id,
        order_number: r.active_order_number,
        customer_name: r.active_customer_name,
        grand_total: r.active_grand_total,
        status: r.active_order_status,
        created_at: r.active_order_created_at
      } : null
    }));

    res.json({ success: true, count: tables.length, data: tables, source: 'mysql' });
  } catch (error) {
    console.error('Error fetching tables:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve tables', error: error.message });
  }
};

// GET table by ID
exports.getTableById = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isFallback()) {
      const table = mockDb.tables.find(t => t.id === id);
      if (!table) return res.status(404).json({ success: false, message: 'Table not found' });
      return res.json({ success: true, data: table });
    }

    const rows = await query('SELECT * FROM tables WHERE id = ?', [id]);
    if (!rows.length) return res.status(404).json({ success: false, message: 'Table not found' });
    res.json({ success: true, data: rows[0] });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// CREATE new table
exports.createTable = async (req, res) => {
  try {
    const { table_number, capacity = 4, section = 'Main Dining', status = 'available' } = req.body;

    if (!table_number) {
      return res.status(400).json({ success: false, message: 'Table number is required' });
    }

    if (isFallback()) {
      const exists = mockDb.tables.some(t => t.table_number.toLowerCase() === table_number.trim().toLowerCase());
      if (exists) {
        return res.status(400).json({ success: false, message: `Table ${table_number} already exists` });
      }

      const newTable = {
        id: mockDb.tables.length > 0 ? Math.max(...mockDb.tables.map(t => t.id)) + 1 : 1,
        table_number: table_number.trim(),
        capacity: parseInt(capacity, 10),
        section: section.trim(),
        status,
        current_order_id: null,
        created_at: new Date().toISOString()
      };
      mockDb.tables.push(newTable);
      return res.status(201).json({ success: true, message: 'Table created successfully', data: newTable });
    }

    const insertSql = 'INSERT INTO tables (table_number, capacity, section, status) VALUES (?, ?, ?, ?)';
    const result = await query(insertSql, [table_number.trim(), capacity, section.trim(), status]);

    res.status(201).json({
      success: true,
      message: 'Table created successfully',
      data: { id: result.insertId, table_number, capacity, section, status }
    });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({ success: false, message: 'Table number already exists' });
    }
    res.status(500).json({ success: false, message: 'Failed to create table', error: error.message });
  }
};

// UPDATE table status (available, occupied, reserved, cleaning)
exports.updateTableStatus = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { status, current_order_id } = req.body;

    const validStatuses = ['available', 'occupied', 'reserved', 'cleaning'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` });
    }

    if (isFallback()) {
      const table = mockDb.tables.find(t => t.id === id);
      if (!table) return res.status(404).json({ success: false, message: 'Table not found' });

      table.status = status;
      if (status === 'available') {
        table.current_order_id = null;
      } else if (current_order_id !== undefined) {
        table.current_order_id = current_order_id;
      }

      return res.json({ success: true, message: 'Table status updated', data: table });
    }

    let updateSql = 'UPDATE tables SET status = ?';
    const params = [status];

    if (status === 'available') {
      updateSql += ', current_order_id = NULL WHERE id = ?';
      params.push(id);
    } else if (current_order_id !== undefined) {
      updateSql += ', current_order_id = ? WHERE id = ?';
      params.push(current_order_id, id);
    } else {
      updateSql += ' WHERE id = ?';
      params.push(id);
    }

    await query(updateSql, params);
    res.json({ success: true, message: 'Table status updated successfully', data: { id, status } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update table status', error: error.message });
  }
};

// UPDATE table details
exports.updateTable = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { table_number, capacity, section, status } = req.body;

    if (isFallback()) {
      const table = mockDb.tables.find(t => t.id === id);
      if (!table) return res.status(404).json({ success: false, message: 'Table not found' });

      if (table_number) table.table_number = table_number;
      if (capacity) table.capacity = parseInt(capacity, 10);
      if (section) table.section = section;
      if (status) table.status = status;

      return res.json({ success: true, message: 'Table updated successfully', data: table });
    }

    const updateSql = 'UPDATE tables SET table_number = COALESCE(?, table_number), capacity = COALESCE(?, capacity), section = COALESCE(?, section), status = COALESCE(?, status) WHERE id = ?';
    await query(updateSql, [table_number, capacity, section, status, id]);

    res.json({ success: true, message: 'Table updated successfully', data: { id, table_number, capacity, section, status } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update table', error: error.message });
  }
};

// DELETE table
exports.deleteTable = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);

    if (isFallback()) {
      const index = mockDb.tables.findIndex(t => t.id === id);
      if (index === -1) return res.status(404).json({ success: false, message: 'Table not found' });
      mockDb.tables.splice(index, 1);
      return res.json({ success: true, message: 'Table deleted successfully' });
    }

    await query('DELETE FROM tables WHERE id = ?', [id]);
    res.json({ success: true, message: 'Table deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete table', error: error.message });
  }
};
