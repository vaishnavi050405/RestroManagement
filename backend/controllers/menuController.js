const { query, isFallback, mockDb } = require('../config/db');

// GET all categories with their menu items
exports.getMenu = async (req, res) => {
  try {
    if (isFallback()) {
      const categories = mockDb.menu_categories.filter(c => c.is_active).sort((a, b) => a.sort_order - b.sort_order);
      const menu = categories.map(cat => ({
        ...cat,
        items: mockDb.menu_items.filter(item => item.category_id === cat.id)
      }));
      return res.json({ success: true, data: menu });
    }

    const categories = await query('SELECT * FROM menu_categories WHERE is_active = 1 ORDER BY sort_order ASC');
    const items = await query('SELECT * FROM menu_items ORDER BY name ASC');

    const menu = categories.map(cat => ({
      ...cat,
      items: items.filter(i => i.category_id === cat.id)
    }));

    res.json({ success: true, data: menu });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch menu', error: error.message });
  }
};

// GET all categories
exports.getCategories = async (req, res) => {
  try {
    if (isFallback()) {
      return res.json({ success: true, data: mockDb.menu_categories });
    }
    const categories = await query('SELECT * FROM menu_categories ORDER BY sort_order ASC');
    res.json({ success: true, data: categories });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch categories', error: error.message });
  }
};

// CREATE menu item
exports.createMenuItem = async (req, res) => {
  try {
    const { category_id, name, description, price, is_veg = 1, is_available = 1, prep_time_mins = 15, image_url } = req.body;

    if (!category_id || !name || price === undefined) {
      return res.status(400).json({ success: false, message: 'Category, name, and price are required' });
    }

    if (isFallback()) {
      const newItem = {
        id: mockDb.menu_items.length > 0 ? Math.max(...mockDb.menu_items.map(m => m.id)) + 1 : 1,
        category_id: parseInt(category_id, 10),
        name: name.trim(),
        description: description || '',
        price: parseFloat(price),
        is_veg: Number(is_veg),
        is_available: Number(is_available),
        prep_time_mins: parseInt(prep_time_mins, 10),
        image_url: image_url || 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=60',
        created_at: new Date().toISOString()
      };
      mockDb.menu_items.push(newItem);
      return res.status(201).json({ success: true, message: 'Item added successfully', data: newItem });
    }

    const insertSql = `
      INSERT INTO menu_items (category_id, name, description, price, is_veg, is_available, prep_time_mins, image_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const result = await query(insertSql, [category_id, name, description, price, is_veg, is_available, prep_time_mins, image_url]);
    res.status(201).json({ success: true, message: 'Item created successfully', data: { id: result.insertId, ...req.body } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to create menu item', error: error.message });
  }
};

// TOGGLE menu item availability
exports.toggleItemAvailability = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { is_available } = req.body;

    if (isFallback()) {
      const item = mockDb.menu_items.find(i => i.id === id);
      if (!item) return res.status(404).json({ success: false, message: 'Menu item not found' });
      item.is_available = is_available !== undefined ? (is_available ? 1 : 0) : (item.is_available ? 0 : 1);
      return res.json({ success: true, message: 'Availability updated', data: item });
    }

    await query('UPDATE menu_items SET is_available = ? WHERE id = ?', [is_available ? 1 : 0, id]);
    res.json({ success: true, message: 'Availability updated successfully', data: { id, is_available } });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update availability', error: error.message });
  }
};

// UPDATE menu item
exports.updateMenuItem = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const { category_id, name, description, price, is_veg, is_available, prep_time_mins, image_url } = req.body;

    if (isFallback()) {
      const item = mockDb.menu_items.find(i => i.id === id);
      if (!item) return res.status(404).json({ success: false, message: 'Menu item not found' });
      if (category_id) item.category_id = parseInt(category_id, 10);
      if (name) item.name = name;
      if (description !== undefined) item.description = description;
      if (price !== undefined) item.price = parseFloat(price);
      if (is_veg !== undefined) item.is_veg = Number(is_veg);
      if (is_available !== undefined) item.is_available = Number(is_available);
      if (prep_time_mins !== undefined) item.prep_time_mins = parseInt(prep_time_mins, 10);
      if (image_url) item.image_url = image_url;
      return res.json({ success: true, message: 'Menu item updated', data: item });
    }

    const updateSql = `
      UPDATE menu_items SET 
        category_id = COALESCE(?, category_id),
        name = COALESCE(?, name),
        description = COALESCE(?, description),
        price = COALESCE(?, price),
        is_veg = COALESCE(?, is_veg),
        is_available = COALESCE(?, is_available),
        prep_time_mins = COALESCE(?, prep_time_mins),
        image_url = COALESCE(?, image_url)
      WHERE id = ?
    `;
    await query(updateSql, [category_id, name, description, price, is_veg, is_available, prep_time_mins, image_url, id]);
    res.json({ success: true, message: 'Item updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to update menu item', error: error.message });
  }
};

// DELETE menu item
exports.deleteMenuItem = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isFallback()) {
      const idx = mockDb.menu_items.findIndex(i => i.id === id);
      if (idx === -1) return res.status(404).json({ success: false, message: 'Item not found' });
      mockDb.menu_items.splice(idx, 1);
      return res.json({ success: true, message: 'Menu item deleted' });
    }

    await query('DELETE FROM menu_items WHERE id = ?', [id]);
    res.json({ success: true, message: 'Menu item deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to delete item', error: error.message });
  }
};
