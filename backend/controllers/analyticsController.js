const { query, isFallback, mockDb } = require('../config/db');

// GET overall operational analytics & dashboard statistics
exports.getDashboardStats = async (req, res) => {
  try {
    if (isFallback()) {
      const totalTables = mockDb.tables.length;
      const occupiedTables = mockDb.tables.filter(t => t.status === 'occupied').length;
      const availableTables = mockDb.tables.filter(t => t.status === 'available').length;
      const reservedTables = mockDb.tables.filter(t => t.status === 'reserved').length;
      const cleaningTables = mockDb.tables.filter(t => t.status === 'cleaning').length;
      const occupancyRate = totalTables > 0 ? Math.round((occupiedTables / totalTables) * 100) : 0;

      const activeOrders = mockDb.orders.filter(o => ['active', 'kitchen_processing', 'ready_to_serve', 'served'].includes(o.status));
      const kitchenItems = mockDb.order_items.filter(oi => ['pending', 'preparing'].includes(oi.item_status));

      const totalRevenue = mockDb.bills.reduce((sum, b) => sum + parseFloat(b.grand_total), 0);
      const totalBills = mockDb.bills.length;

      // Group tables by section
      const sectionStats = {};
      mockDb.tables.forEach(t => {
        if (!sectionStats[t.section]) {
          sectionStats[t.section] = { total: 0, occupied: 0, available: 0, reserved: 0, cleaning: 0 };
        }
        sectionStats[t.section].total++;
        sectionStats[t.section][t.status]++;
      });

      // Top selling items
      const itemCounts = {};
      mockDb.order_items.forEach(oi => {
        const m = mockDb.menu_items.find(mi => mi.id === oi.menu_item_id);
        const name = m ? m.name : `Item #${oi.menu_item_id}`;
        itemCounts[name] = (itemCounts[name] || 0) + oi.quantity;
      });
      const topItems = Object.entries(itemCounts)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Payment method breakdown
      const paymentBreakdown = { cash: 0, card: 0, upi: 0, other: 0 };
      mockDb.bills.forEach(b => {
        if (paymentBreakdown[b.payment_method] !== undefined) {
          paymentBreakdown[b.payment_method] += parseFloat(b.grand_total);
        }
      });

      return res.json({
        success: true,
        data: {
          tables: {
            total: totalTables,
            occupied: occupiedTables,
            available: availableTables,
            reserved: reservedTables,
            cleaning: cleaningTables,
            occupancy_rate: occupancyRate,
            by_section: sectionStats
          },
          orders: {
            active_count: activeOrders.length,
            kitchen_pending_items: kitchenItems.length,
          },
          revenue: {
            today_total: totalRevenue,
            total_bills: totalBills,
            average_ticket_size: totalBills > 0 ? parseFloat((totalRevenue / totalBills).toFixed(2)) : 0,
            by_payment_method: paymentBreakdown
          },
          top_items: topItems
        }
      });
    }

    // MySQL Execution
    const tableRows = await query('SELECT status, section, COUNT(*) as count FROM tables GROUP BY section, status') || [];
    const totalTablesRes = await query('SELECT COUNT(*) as total FROM tables') || [{ total: 0 }];
    const activeOrdersRes = await query('SELECT COUNT(*) as active_count FROM orders WHERE status IN ("active", "kitchen_processing", "ready_to_serve", "served")') || [{ active_count: 0 }];
    const kitchenPendingRes = await query('SELECT COUNT(*) as pending_items FROM order_items WHERE item_status IN ("pending", "preparing")') || [{ pending_items: 0 }];
    const revenueRes = await query('SELECT COALESCE(SUM(grand_total), 0) as total_rev, COUNT(id) as total_bills FROM bills') || [{ total_rev: 0, total_bills: 0 }];
    const paymentRes = await query('SELECT payment_method, COALESCE(SUM(grand_total), 0) as amount FROM bills GROUP BY payment_method') || [];
    const topItemsRes = await query(`
      SELECT m.name, SUM(oi.quantity) as count
      FROM order_items oi
      JOIN menu_items m ON oi.menu_item_id = m.id
      GROUP BY m.id, m.name
      ORDER BY count DESC
      LIMIT 5
    `) || [];

    // Format section & status aggregation
    const sectionStats = {};
    let occupied = 0, available = 0, reserved = 0, cleaning = 0;
    tableRows.forEach(r => {
      if (!sectionStats[r.section]) {
        sectionStats[r.section] = { total: 0, occupied: 0, available: 0, reserved: 0, cleaning: 0 };
      }
      sectionStats[r.section].total += r.count;
      sectionStats[r.section][r.status] = (sectionStats[r.section][r.status] || 0) + r.count;

      if (r.status === 'occupied') occupied += r.count;
      if (r.status === 'available') available += r.count;
      if (r.status === 'reserved') reserved += r.count;
      if (r.status === 'cleaning') cleaning += r.count;
    });

    const totalTables = totalTablesRes[0]?.total || 0;
    const occupancyRate = totalTables > 0 ? Math.round((occupied / totalTables) * 100) : 0;
    const totalRev = parseFloat(revenueRes[0]?.total_rev || 0);
    const totalBills = parseInt(revenueRes[0]?.total_bills || 0, 10);

    const paymentBreakdown = { cash: 0, card: 0, upi: 0, other: 0 };
    paymentRes.forEach(p => {
      paymentBreakdown[p.payment_method] = parseFloat(p.amount);
    });

    res.json({
      success: true,
      data: {
        tables: {
          total: totalTables,
          occupied,
          available,
          reserved,
          cleaning,
          occupancy_rate: occupancyRate,
          by_section: sectionStats
        },
        orders: {
          active_count: activeOrdersRes[0]?.active_count || 0,
          kitchen_pending_items: kitchenPendingRes[0]?.pending_items || 0
        },
        revenue: {
          today_total: totalRev,
          total_bills: totalBills,
          average_ticket_size: totalBills > 0 ? parseFloat((totalRev / totalBills).toFixed(2)) : 0,
          by_payment_method: paymentBreakdown
        },
        top_items: topItemsRes
      }
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch analytics', error: error.message });
  }
};
