const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const dbState = {
  pool: null,
  isFallbackMode: true, // Default to true for instant zero-latency safety
  isInitialized: false
};

// In-memory fallback store initialized with rich demo seed data
const mockDb = {
  tables: [
    { id: 1, table_number: 'T-01', capacity: 2, section: 'Main Dining', status: 'available', current_order_id: null },
    { id: 2, table_number: 'T-02', capacity: 4, section: 'Main Dining', status: 'occupied', current_order_id: 101 },
    { id: 3, table_number: 'T-03', capacity: 4, section: 'Main Dining', status: 'available', current_order_id: null },
    { id: 4, table_number: 'T-04', capacity: 6, section: 'Main Dining', status: 'reserved', current_order_id: null },
    { id: 5, table_number: 'T-05', capacity: 8, section: 'Family Section', status: 'available', current_order_id: null },
    { id: 6, table_number: 'T-06', capacity: 4, section: 'Family Section', status: 'occupied', current_order_id: 102 },
    { id: 7, table_number: 'P-01', capacity: 2, section: 'Patio Garden', status: 'available', current_order_id: null },
    { id: 8, table_number: 'P-02', capacity: 4, section: 'Patio Garden', status: 'cleaning', current_order_id: null },
    { id: 9, table_number: 'P-03', capacity: 4, section: 'Patio Garden', status: 'available', current_order_id: null },
    { id: 10, table_number: 'R-01', capacity: 4, section: 'Rooftop Lounge', status: 'occupied', current_order_id: 103 },
    { id: 11, table_number: 'R-02', capacity: 6, section: 'Rooftop Lounge', status: 'available', current_order_id: null },
    { id: 12, table_number: 'R-03', capacity: 2, section: 'Rooftop Lounge', status: 'available', current_order_id: null },
    { id: 13, table_number: 'B-01', capacity: 2, section: 'Bar Counter', status: 'available', current_order_id: null },
    { id: 14, table_number: 'B-02', capacity: 2, section: 'Bar Counter', status: 'available', current_order_id: null },
  ],
  menu_categories: [
    { id: 1, name: 'Starters & Appetizers', description: 'Crispy, flavorful bites to begin your meal', icon: 'Utensils', sort_order: 1, is_active: 1 },
    { id: 2, name: 'Main Courses', description: 'Rich curries, sizzling platters, and chef specials', icon: 'Flame', sort_order: 2, is_active: 1 },
    { id: 3, name: 'Breads & Rice', description: 'Fresh tandoori breads, basmati rice & biryanis', icon: 'Wheat', sort_order: 3, is_active: 1 },
    { id: 4, name: 'Beverages & Mocktails', description: 'Refreshing cold drinks, smoothies, and hot brews', icon: 'GlassWater', sort_order: 4, is_active: 1 },
    { id: 5, name: 'Desserts', description: 'Sweet treats and decadent traditional desserts', icon: 'Cake', sort_order: 5, is_active: 1 },
  ],
  menu_items: [
    { id: 1, category_id: 1, name: 'Paneer Tikka Angaare', description: 'Charcoal-grilled cottage cheese cubes marinated in spiced yogurt and herbs', price: 320.00, is_veg: 1, is_available: 1, prep_time_mins: 15, image_url: 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&auto=format&fit=crop&q=60' },
    { id: 2, category_id: 1, name: 'Crispy Corn & Pepper Fries', description: 'Golden tossed corn kernels with bell peppers, lime, and chat masala', price: 240.00, is_veg: 1, is_available: 1, prep_time_mins: 10, image_url: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=60' },
    { id: 3, category_id: 1, name: 'Murgh Malai Tikka', description: 'Tender chicken morsels steeped in cream, cheese, cardamom and cooked in clay oven', price: 380.00, is_veg: 0, is_available: 1, prep_time_mins: 18, image_url: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&auto=format&fit=crop&q=60' },
    { id: 4, category_id: 1, name: 'Tandoori Garlic Prawns', description: 'Jumbo prawns infused with smoked garlic butter and ajwain spices', price: 490.00, is_veg: 0, is_available: 1, prep_time_mins: 15, image_url: 'https://images.unsplash.com/photo-1559742811-822873691df8?w=500&auto=format&fit=crop&q=60' },
    { id: 5, category_id: 2, name: 'Butter Chicken Supreme', description: 'Slow-cooked shredded chicken in rich velvety tomato and fenugreek gravy', price: 420.00, is_veg: 0, is_available: 1, prep_time_mins: 20, image_url: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=60' },
    { id: 6, category_id: 2, name: 'Paneer Butter Masala', description: 'Soft paneer cubes simmered in spiced tomato cashew butter sauce', price: 360.00, is_veg: 1, is_available: 1, prep_time_mins: 15, image_url: 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&auto=format&fit=crop&q=60' },
    { id: 7, category_id: 2, name: 'Dal Makhani Bukhara', description: 'Black lentils slow-cooked overnight with churned butter and cream', price: 310.00, is_veg: 1, is_available: 1, prep_time_mins: 12, image_url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=60' },
    { id: 8, category_id: 2, name: 'Kadhai Veg Delight', description: 'Melange of garden fresh vegetables tossed with freshly ground spices in kadhai', price: 290.00, is_veg: 1, is_available: 1, prep_time_mins: 15, image_url: 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=500&auto=format&fit=crop&q=60' },
    { id: 9, category_id: 2, name: 'Mutton Rogan Josh', description: 'Kashmiri delicacy of tender braised lamb cooked in aromatic spicy gravy', price: 520.00, is_veg: 0, is_available: 1, prep_time_mins: 22, image_url: 'https://images.unsplash.com/photo-1545247181-516773cae754?w=500&auto=format&fit=crop&q=60' },
    { id: 10, category_id: 3, name: 'Dum Hyderabadi Chicken Biryani', description: 'Layered fragrant basmati rice and marinated chicken cooked under dum seal', price: 410.00, is_veg: 0, is_available: 1, prep_time_mins: 20, image_url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60' },
    { id: 11, category_id: 3, name: 'Subz Dum Biryani', description: 'Fragrant basmati rice cooked with fresh seasonal vegetables and saffron', price: 340.00, is_veg: 1, is_available: 1, prep_time_mins: 18, image_url: 'https://images.unsplash.com/photo-1642821373181-696a54913e93?w=500&auto=format&fit=crop&q=60' },
    { id: 12, category_id: 3, name: 'Butter Garlic Naan', description: 'Clay-oven baked refined flour bread topped with butter and minced garlic', price: 75.00, is_veg: 1, is_available: 1, prep_time_mins: 8, image_url: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=60' },
    { id: 13, category_id: 3, name: 'Tandoori Roti', description: 'Whole wheat tandoor baked healthy flatbread', price: 40.00, is_veg: 1, is_available: 1, prep_time_mins: 6, image_url: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&auto=format&fit=crop&q=60' },
    { id: 14, category_id: 3, name: 'Jeera Basmati Rice', description: 'Steamed long grain basmati rice tempered with roasted cumin seeds & ghee', price: 180.00, is_veg: 1, is_available: 1, prep_time_mins: 10, image_url: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=500&auto=format&fit=crop&q=60' },
    { id: 15, category_id: 4, name: 'Virgin Mint Mojito', description: 'Fresh crushed mint, lime wedges, simple syrup topped with soda splash', price: 160.00, is_veg: 1, is_available: 1, prep_time_mins: 5, image_url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=60' },
    { id: 16, category_id: 4, name: 'Mango Lassi Royale', description: 'Thick churned sweet yogurt flavored with Alphonso mango pulp and pistachios', price: 150.00, is_veg: 1, is_available: 1, prep_time_mins: 5, image_url: 'https://images.unsplash.com/photo-1553787499-6f9133860278?w=500&auto=format&fit=crop&q=60' },
    { id: 17, category_id: 4, name: 'Masala Chai Pot', description: 'Authentic Indian spiced milk tea infused with cardamom and fresh ginger', price: 90.00, is_veg: 1, is_available: 1, prep_time_mins: 6, image_url: 'https://images.unsplash.com/photo-1561336313-0bd5e0b27ec8?w=500&auto=format&fit=crop&q=60' },
    { id: 18, category_id: 4, name: 'Blue Lagoon Mocktail', description: 'Blue curacao syrup, lemon juice, and chilled citrus fizz', price: 170.00, is_veg: 1, is_available: 1, prep_time_mins: 5, image_url: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&auto=format&fit=crop&q=60' },
    { id: 19, category_id: 5, name: 'Gulab Jamun with Rabri', description: 'Warm khoya dumplings dipped in saffron rose syrup served with rabri', price: 180.00, is_veg: 1, is_available: 1, prep_time_mins: 5, image_url: 'https://images.unsplash.com/photo-1589119908995-c6837fa14d48?w=500&auto=format&fit=crop&q=60' },
    { id: 20, category_id: 5, name: 'Sizzling Chocolate Brownie', description: 'Warm walnut brownie served with vanilla ice cream and hot chocolate fudge', price: 240.00, is_veg: 1, is_available: 1, prep_time_mins: 8, image_url: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=500&auto=format&fit=crop&q=60' },
    { id: 21, category_id: 5, name: 'Kesar Pista Rasmalai', description: 'Soft spongy cottage cheese patties soaked in thickened saffron cardamom milk', price: 190.00, is_veg: 1, is_available: 1, prep_time_mins: 5, image_url: 'https://images.unsplash.com/photo-1589119908995-c6837fa14d48?w=500&auto=format&fit=crop&q=60' },
  ],
  orders: [
    {
      id: 101,
      order_number: 'ORD-2026-001',
      table_id: 2,
      order_type: 'dine_in',
      customer_name: 'Rahul Sharma',
      customer_phone: '+91 9876543210',
      status: 'kitchen_processing',
      total_amount: 1175.00,
      tax_amount: 58.75,
      discount_amount: 0.00,
      grand_total: 1233.75,
      payment_status: 'unpaid',
      notes: 'Table requested less spicy food for kids.',
      created_at: new Date(Date.now() - 14 * 60000).toISOString()
    },
    {
      id: 102,
      order_number: 'ORD-2026-002',
      table_id: 6,
      order_type: 'dine_in',
      customer_name: 'Priya Kapoor',
      customer_phone: '+91 9811223344',
      status: 'ready_to_serve',
      total_amount: 960.00,
      tax_amount: 48.00,
      discount_amount: 50.00,
      grand_total: 958.00,
      payment_status: 'unpaid',
      notes: 'Celebrating birthday anniversary.',
      created_at: new Date(Date.now() - 25 * 60000).toISOString()
    },
    {
      id: 103,
      order_number: 'ORD-2026-003',
      table_id: 10,
      order_type: 'dine_in',
      customer_name: 'Vikram Patel',
      customer_phone: '+91 9723456789',
      status: 'served',
      total_amount: 1450.00,
      tax_amount: 72.50,
      discount_amount: 0.00,
      grand_total: 1522.50,
      payment_status: 'unpaid',
      notes: 'Add extra garlic naan if required.',
      created_at: new Date(Date.now() - 40 * 60000).toISOString()
    },
    {
      id: 100,
      order_number: 'ORD-2026-000',
      table_id: null,
      order_type: 'takeaway',
      customer_name: 'Aman Verma',
      customer_phone: '+91 9998887776',
      status: 'completed',
      total_amount: 730.00,
      tax_amount: 36.50,
      discount_amount: 0.00,
      grand_total: 766.50,
      payment_status: 'paid',
      notes: 'Takeaway packaging complete',
      created_at: new Date(Date.now() - 90 * 60000).toISOString()
    }
  ],
  order_items: [
    { id: 1, order_id: 101, menu_item_id: 1, quantity: 1, unit_price: 320.00, total_price: 320.00, special_instructions: 'Make it medium spicy with mint chutney', item_status: 'preparing', created_at: new Date().toISOString() },
    { id: 2, order_id: 101, menu_item_id: 5, quantity: 1, unit_price: 420.00, total_price: 420.00, special_instructions: 'Less oil, boneless chicken only', item_status: 'preparing', created_at: new Date().toISOString() },
    { id: 3, order_id: 101, menu_item_id: 12, quantity: 3, unit_price: 75.00, total_price: 225.00, special_instructions: 'Crispy garlic topping', item_status: 'pending', created_at: new Date().toISOString() },
    { id: 4, order_id: 101, menu_item_id: 15, quantity: 2, unit_price: 160.00, total_price: 320.00, special_instructions: 'Less ice, extra mint', item_status: 'ready', created_at: new Date().toISOString() },
    { id: 5, order_id: 102, menu_item_id: 3, quantity: 1, unit_price: 380.00, total_price: 380.00, special_instructions: 'Mild spice level', item_status: 'ready', created_at: new Date().toISOString() },
    { id: 6, order_id: 102, menu_item_id: 6, quantity: 1, unit_price: 360.00, total_price: 360.00, special_instructions: 'Rich cream on top', item_status: 'ready', created_at: new Date().toISOString() },
    { id: 7, order_id: 102, menu_item_id: 12, quantity: 2, unit_price: 75.00, total_price: 150.00, special_instructions: 'Well buttered', item_status: 'ready', created_at: new Date().toISOString() },
    { id: 8, order_id: 102, menu_item_id: 16, quantity: 2, unit_price: 150.00, total_price: 300.00, special_instructions: 'Chilled with dry fruit garnish', item_status: 'served', created_at: new Date().toISOString() },
    { id: 9, order_id: 103, menu_item_id: 4, quantity: 1, unit_price: 490.00, total_price: 490.00, special_instructions: 'Extra lemon wedge', item_status: 'served', created_at: new Date().toISOString() },
    { id: 10, order_id: 103, menu_item_id: 10, quantity: 2, unit_price: 410.00, total_price: 820.00, special_instructions: 'Served with extra salan and raita', item_status: 'served', created_at: new Date().toISOString() },
    { id: 11, order_id: 103, menu_item_id: 18, quantity: 2, unit_price: 170.00, total_price: 340.00, special_instructions: 'Double shot blue curacao', item_status: 'served', created_at: new Date().toISOString() },
    { id: 12, order_id: 100, menu_item_id: 5, quantity: 1, unit_price: 420.00, total_price: 420.00, special_instructions: 'Extra gravy', item_status: 'served', created_at: new Date().toISOString() },
    { id: 13, order_id: 100, menu_item_id: 10, quantity: 1, unit_price: 410.00, total_price: 410.00, special_instructions: 'Spicy Hyderabadi style', item_status: 'served', created_at: new Date().toISOString() }
  ],
  bills: [
    {
      id: 1,
      invoice_number: 'INV-2026-001',
      order_id: 100,
      customer_name: 'Aman Verma',
      customer_phone: '+91 9998887776',
      subtotal: 730.00,
      tax_rate: 5.00,
      tax_amount: 36.50,
      discount_percent: 0.00,
      discount_amount: 0.00,
      tip_amount: 20.00,
      grand_total: 786.50,
      payment_method: 'upi',
      payment_status: 'completed',
      sms_status: 'sent',
      sms_text: 'Dear Aman Verma, thank you for dining with us at RestroOps Gourmet! Invoice: INV-2026-001, Amount Paid: Rs 786.50 (UPI). We hope you enjoyed your meal and look forward to serving you again soon!',
      paid_at: new Date(Date.now() - 75 * 60000).toISOString(),
      cashier_notes: 'Paid via GPay',
      created_at: new Date(Date.now() - 75 * 60000).toISOString()
    }
  ]
};

async function initDb() {
  const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'restro_db',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    connectTimeout: 2000
  };

  try {
    const tempPool = mysql.createPool(dbConfig);
    const conn = await tempPool.getConnection();
    console.log(`[Database] Successfully connected to MySQL at ${dbConfig.host}:${dbConfig.port}, database: ${dbConfig.database}`);
    conn.release();
    dbState.pool = tempPool;
    dbState.isFallbackMode = false;
    dbState.isInitialized = true;
  } catch (err) {
    console.warn(`[Database Warning] Could not connect to MySQL (${err.code || err.message}). Switching gracefully to built-in In-Memory Database store with preloaded seed data.`);
    console.warn(`[Database Tip] To use live MySQL, ensure MySQL server is running on port ${dbConfig.port} and import 'db.sql'.`);
    dbState.isFallbackMode = true;
    dbState.isInitialized = true;
  }
}

// Universal query wrapper
async function query(sql, params = []) {
  if (!dbState.isFallbackMode && dbState.pool) {
    try {
      const [results] = await dbState.pool.query(sql, params);
      return results;
    } catch (error) {
      console.error('[MySQL Query Error]:', error.message, 'SQL:', sql);
      throw error;
    }
  }

  // Handle fallback mock in-memory executions
  return handleMockQuery(sql, params);
}

function handleMockQuery(sql, params) {
  const trimmed = sql.trim().toUpperCase();

  // Helper matching
  if (trimmed.startsWith('SELECT')) {
    if (sql.includes('FROM tables') || sql.includes('FROM `tables`')) {
      return JSON.parse(JSON.stringify(mockDb.tables));
    }
    if (sql.includes('FROM menu_categories') || sql.includes('FROM `menu_categories`')) {
      return JSON.parse(JSON.stringify(mockDb.menu_categories));
    }
    if (sql.includes('FROM menu_items') || sql.includes('FROM `menu_items`')) {
      return JSON.parse(JSON.stringify(mockDb.menu_items));
    }
    if (sql.includes('FROM orders') || sql.includes('FROM `orders`')) {
      return JSON.parse(JSON.stringify(mockDb.orders));
    }
    if (sql.includes('FROM bills') || sql.includes('FROM `bills`')) {
      return JSON.parse(JSON.stringify(mockDb.bills));
    }
  }

  return [];
}

module.exports = {
  initDb,
  query,
  dbState,
  isFallback: () => dbState.isFallbackMode,
  mockDb
};
