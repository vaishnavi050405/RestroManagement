-- ==========================================================
-- RESTAURANT OPERATIONS MANAGEMENT SYSTEM DATABASE (db.sql)
-- Complete Schema, Foreign Keys, Indexes, Seed Data & Queries
-- ==========================================================

CREATE DATABASE IF NOT EXISTS `restro_db` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `restro_db`;

-- Drop existing tables in reverse dependency order
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS `bills`;
DROP TABLE IF EXISTS `order_items`;
DROP TABLE IF EXISTS `orders`;
DROP TABLE IF EXISTS `menu_items`;
DROP TABLE IF EXISTS `menu_categories`;
DROP TABLE IF EXISTS `tables`;
SET FOREIGN_KEY_CHECKS = 1;

-- ----------------------------------------------------------
-- 1. TABLES & FLOOR MANAGEMENT TABLE
-- ----------------------------------------------------------
CREATE TABLE `tables` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `table_number` VARCHAR(20) NOT NULL UNIQUE,
  `capacity` INT NOT NULL DEFAULT 4,
  `section` VARCHAR(50) NOT NULL DEFAULT 'Main Dining',
  `status` ENUM('available', 'occupied', 'reserved', 'cleaning') NOT NULL DEFAULT 'available',
  `current_order_id` INT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX `idx_tables_status` (`status`),
  INDEX `idx_tables_section` (`section`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------
-- 2. MENU CATEGORIES TABLE
-- ----------------------------------------------------------
CREATE TABLE `menu_categories` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL UNIQUE,
  `description` VARCHAR(255) DEFAULT NULL,
  `icon` VARCHAR(50) DEFAULT 'Utensils',
  `sort_order` INT NOT NULL DEFAULT 0,
  `is_active` TINYINT(1) NOT NULL DEFAULT 1,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------
-- 3. MENU ITEMS TABLE
-- ----------------------------------------------------------
CREATE TABLE `menu_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `category_id` INT NOT NULL,
  `name` VARCHAR(150) NOT NULL,
  `description` TEXT DEFAULT NULL,
  `price` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `is_veg` TINYINT(1) NOT NULL DEFAULT 1,
  `is_available` TINYINT(1) NOT NULL DEFAULT 1,
  `prep_time_mins` INT NOT NULL DEFAULT 15,
  `image_url` VARCHAR(500) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`category_id`) REFERENCES `menu_categories`(`id`) ON DELETE CASCADE,
  INDEX `idx_menu_category` (`category_id`),
  INDEX `idx_menu_available` (`is_available`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------
-- 4. ORDERS TABLE
-- ----------------------------------------------------------
CREATE TABLE `orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_number` VARCHAR(30) NOT NULL UNIQUE,
  `table_id` INT DEFAULT NULL,
  `order_type` ENUM('dine_in', 'takeaway', 'delivery') NOT NULL DEFAULT 'dine_in',
  `customer_name` VARCHAR(100) DEFAULT 'Guest',
  `customer_phone` VARCHAR(30) DEFAULT NULL,
  `status` ENUM('active', 'kitchen_processing', 'ready_to_serve', 'served', 'billed', 'completed', 'cancelled') NOT NULL DEFAULT 'active',
  `total_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `tax_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `discount_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `grand_total` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `payment_status` ENUM('unpaid', 'paid', 'refunded') NOT NULL DEFAULT 'unpaid',
  `notes` TEXT DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`table_id`) REFERENCES `tables`(`id`) ON DELETE SET NULL,
  INDEX `idx_orders_status` (`status`),
  INDEX `idx_orders_payment` (`payment_status`),
  INDEX `idx_orders_table` (`table_id`),
  INDEX `idx_orders_phone` (`customer_phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------
-- 5. ORDER ITEMS (KITCHEN PROCESSING & ITEM BREAKDOWN)
-- ----------------------------------------------------------
CREATE TABLE `order_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `menu_item_id` INT NOT NULL,
  `quantity` INT NOT NULL DEFAULT 1,
  `unit_price` DECIMAL(10, 2) NOT NULL,
  `total_price` DECIMAL(10, 2) NOT NULL,
  `special_instructions` VARCHAR(255) DEFAULT NULL,
  `item_status` ENUM('pending', 'preparing', 'ready', 'served', 'cancelled') NOT NULL DEFAULT 'pending',
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `prepared_at` TIMESTAMP NULL DEFAULT NULL,
  `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE,
  FOREIGN KEY (`menu_item_id`) REFERENCES `menu_items`(`id`) ON DELETE RESTRICT,
  INDEX `idx_order_items_order` (`order_id`),
  INDEX `idx_order_items_status` (`item_status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ----------------------------------------------------------
-- 6. BILLS & TRANSACTIONS TABLE (WITH CUSTOMER PHONE & SMS)
-- ----------------------------------------------------------
CREATE TABLE `bills` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `invoice_number` VARCHAR(50) NOT NULL UNIQUE,
  `order_id` INT NOT NULL,
  `customer_name` VARCHAR(100) DEFAULT 'Guest',
  `customer_phone` VARCHAR(30) DEFAULT NULL,
  `subtotal` DECIMAL(10, 2) NOT NULL,
  `tax_rate` DECIMAL(5, 2) NOT NULL DEFAULT 5.00,
  `tax_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `discount_percent` DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
  `discount_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `tip_amount` DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  `grand_total` DECIMAL(10, 2) NOT NULL,
  `payment_method` ENUM('cash', 'card', 'upi', 'other') NOT NULL DEFAULT 'cash',
  `payment_status` ENUM('pending', 'completed', 'failed') NOT NULL DEFAULT 'completed',
  `sms_status` ENUM('sent', 'pending', 'failed') NOT NULL DEFAULT 'sent',
  `sms_text` TEXT DEFAULT NULL,
  `paid_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  `cashier_notes` VARCHAR(255) DEFAULT NULL,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE RESTRICT,
  INDEX `idx_bills_invoice` (`invoice_number`),
  INDEX `idx_bills_order` (`order_id`),
  INDEX `idx_bills_phone` (`customer_phone`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ==========================================================
-- SEED DATA INSERTIONS
-- ==========================================================

-- 1. Seed Tables
INSERT INTO `tables` (`table_number`, `capacity`, `section`, `status`) VALUES
('T-01', 2, 'Main Dining', 'available'),
('T-02', 4, 'Main Dining', 'occupied'),
('T-03', 4, 'Main Dining', 'available'),
('T-04', 6, 'Main Dining', 'reserved'),
('T-05', 8, 'Family Section', 'available'),
('T-06', 4, 'Family Section', 'occupied'),
('P-01', 2, 'Patio Garden', 'available'),
('P-02', 4, 'Patio Garden', 'cleaning'),
('P-03', 4, 'Patio Garden', 'available'),
('R-01', 4, 'Rooftop Lounge', 'occupied'),
('R-02', 6, 'Rooftop Lounge', 'available'),
('R-03', 2, 'Rooftop Lounge', 'available'),
('B-01', 2, 'Bar Counter', 'available'),
('B-02', 2, 'Bar Counter', 'available');

-- 2. Seed Menu Categories
INSERT INTO `menu_categories` (`id`, `name`, `description`, `icon`, `sort_order`, `is_active`) VALUES
(1, 'Starters & Appetizers', 'Crispy, flavorful bites to begin your meal', 'Utensils', 1, 1),
(2, 'Main Courses', 'Rich curries, sizzling platters, and chef specials', 'Flame', 2, 1),
(3, 'Breads & Rice', 'Fresh tandoori breads, basmati rice & biryanis', 'Wheat', 3, 1),
(4, 'Beverages & Mocktails', 'Refreshing cold drinks, smoothies, and hot brews', 'GlassWater', 4, 1),
(5, 'Desserts', 'Sweet treats and decadent traditional desserts', 'Cake', 5, 1);

-- 3. Seed Menu Items
INSERT INTO `menu_items` (`category_id`, `name`, `description`, `price`, `is_veg`, `is_available`, `prep_time_mins`, `image_url`) VALUES
-- Starters
(1, 'Paneer Tikka Angaare', 'Charcoal-grilled cottage cheese cubes marinated in spiced yogurt and herbs', 320.00, 1, 1, 15, 'https://images.unsplash.com/photo-1599488615731-7e5c2823ff28?w=500&auto=format&fit=crop&q=60'),
(1, 'Crispy Corn & Pepper Fries', 'Golden tossed corn kernels with bell peppers, lime, and chat masala', 240.00, 1, 1, 10, 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=60'),
(1, 'Murgh Malai Tikka', 'Tender chicken morsels steeped in cream, cheese, cardamom and cooked in clay oven', 380.00, 0, 1, 18, 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&auto=format&fit=crop&q=60'),
(1, 'Tandoori Garlic Prawns', 'Jumbo prawns infused with smoked garlic butter and ajwain spices', 490.00, 0, 1, 15, 'https://images.unsplash.com/photo-1559742811-822873691df8?w=500&auto=format&fit=crop&q=60'),

-- Mains
(2, 'Butter Chicken Supreme', 'Slow-cooked shredded chicken in rich velvety tomato and fenugreek gravy', 420.00, 0, 1, 20, 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=500&auto=format&fit=crop&q=60'),
(2, 'Paneer Butter Masala', 'Soft paneer cubes simmered in spiced tomato cashew butter sauce', 360.00, 1, 1, 15, 'https://images.unsplash.com/photo-1631452180519-c014fe946bc7?w=500&auto=format&fit=crop&q=60'),
(2, 'Dal Makhani Bukhara', 'Black lentils slow-cooked overnight with churned butter and cream', 310.00, 1, 1, 12, 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=500&auto=format&fit=crop&q=60'),
(2, 'Kadhai Veg Delight', 'Melange of garden fresh vegetables tossed with freshly ground spices in kadhai', 290.00, 1, 1, 15, 'https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=500&auto=format&fit=crop&q=60'),
(2, 'Mutton Rogan Josh', 'Kashmiri delicacy of tender braised lamb cooked in aromatic spicy gravy', 520.00, 0, 1, 22, 'https://images.unsplash.com/photo-1545247181-516773cae754?w=500&auto=format&fit=crop&q=60'),

-- Breads & Rice
(3, 'Dum Hyderabadi Chicken Biryani', 'Layered fragrant basmati rice and marinated chicken cooked under dum seal', 410.00, 0, 1, 20, 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=500&auto=format&fit=crop&q=60'),
(3, 'Subz Dum Biryani', 'Fragrant basmati rice cooked with fresh seasonal vegetables and saffron', 340.00, 1, 1, 18, 'https://images.unsplash.com/photo-1642821373181-696a54913e93?w=500&auto=format&fit=crop&q=60'),
(3, 'Butter Garlic Naan', 'Clay-oven baked refined flour bread topped with butter and minced garlic', 75.00, 1, 1, 8, 'https://images.unsplash.com/photo-1601050690597-df0568f70950?w=500&auto=format&fit=crop&q=60'),
(3, 'Tandoori Roti', 'Whole wheat tandoor baked healthy flatbread', 40.00, 1, 1, 6, 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?w=500&auto=format&fit=crop&q=60'),
(3, 'Jeera Basmati Rice', 'Steamed long grain basmati rice tempered with roasted cumin seeds & ghee', 180.00, 1, 1, 10, 'https://images.unsplash.com/photo-1512058564366-18510be2db19?w=500&auto=format&fit=crop&q=60'),

-- Beverages
(4, 'Virgin Mint Mojito', 'Fresh crushed mint, lime wedges, simple syrup topped with soda splash', 160.00, 1, 1, 5, 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=500&auto=format&fit=crop&q=60'),
(4, 'Mango Lassi Royale', 'Thick churned sweet yogurt flavored with Alphonso mango pulp and pistachios', 150.00, 1, 1, 5, 'https://images.unsplash.com/photo-1553787499-6f9133860278?w=500&auto=format&fit=crop&q=60'),
(4, 'Masala Chai Pot', 'Authentic Indian spiced milk tea infused with cardamom and fresh ginger', 90.00, 1, 1, 6, 'https://images.unsplash.com/photo-1561336313-0bd5e0b27ec8?w=500&auto=format&fit=crop&q=60'),
(4, 'Blue Lagoon Mocktail', 'Blue curacao syrup, lemon juice, and chilled citrus fizz', 170.00, 1, 1, 5, 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=500&auto=format&fit=crop&q=60'),

-- Desserts
(5, 'Gulab Jamun with Rabri', 'Warm khoya dumplings dipped in saffron rose syrup served with rabri', 180.00, 1, 1, 5, 'https://images.unsplash.com/photo-1589119908995-c6837fa14d48?w=500&auto=format&fit=crop&q=60'),
(5, 'Sizzling Chocolate Brownie', 'Warm walnut brownie served with vanilla ice cream and hot chocolate fudge', 240.00, 1, 1, 8, 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?w=500&auto=format&fit=crop&q=60'),
(5, 'Kesar Pista Rasmalai', 'Soft spongy cottage cheese patties soaked in thickened saffron cardamom milk', 190.00, 1, 1, 5, 'https://images.unsplash.com/photo-1589119908995-c6837fa14d48?w=500&auto=format&fit=crop&q=60');

-- 4. Seed Active Sample Orders (With Customer Names & Mobile Numbers)
INSERT INTO `orders` (`id`, `order_number`, `table_id`, `order_type`, `customer_name`, `customer_phone`, `status`, `total_amount`, `tax_amount`, `discount_amount`, `grand_total`, `payment_status`, `notes`) VALUES
(101, 'ORD-2026-001', 2, 'dine_in', 'Rahul Sharma', '+91 9876543210', 'kitchen_processing', 1175.00, 58.75, 0.00, 1233.75, 'unpaid', 'Table requested less spicy food for kids.'),
(102, 'ORD-2026-002', 6, 'dine_in', 'Priya Kapoor', '+91 9811223344', 'ready_to_serve', 960.00, 48.00, 50.00, 958.00, 'unpaid', 'Celebrating birthday anniversary.'),
(103, 'ORD-2026-003', 10, 'dine_in', 'Vikram Patel', '+91 9723456789', 'served', 1450.00, 72.50, 0.00, 1522.50, 'unpaid', 'Add extra garlic naan if required.');

-- Link active orders to tables
UPDATE `tables` SET `current_order_id` = 101, `status` = 'occupied' WHERE `id` = 2;
UPDATE `tables` SET `current_order_id` = 102, `status` = 'occupied' WHERE `id` = 6;
UPDATE `tables` SET `current_order_id` = 103, `status` = 'occupied' WHERE `id` = 10;

-- 5. Seed Order Items
INSERT INTO `order_items` (`order_id`, `menu_item_id`, `quantity`, `unit_price`, `total_price`, `special_instructions`, `item_status`) VALUES
-- Order 101 items (Table 2)
(101, 1, 1, 320.00, 320.00, 'Make it medium spicy with mint chutney', 'preparing'),
(101, 5, 1, 420.00, 420.00, 'Less oil, boneless chicken only', 'preparing'),
(101, 12, 3, 75.00, 225.00, 'Crispy garlic topping', 'pending'),
(101, 15, 2, 160.00, 320.00, 'Less ice, extra mint', 'ready'),

-- Order 102 items (Table 6)
(102, 3, 1, 380.00, 380.00, 'Mild spice level', 'ready'),
(102, 6, 1, 360.00, 360.00, 'Rich cream on top', 'ready'),
(102, 12, 2, 75.00, 150.00, 'Well buttered', 'ready'),
(102, 16, 2, 150.00, 300.00, 'Chilled with dry fruit garnish', 'served'),

-- Order 103 items (Table 10 - Rooftop)
(103, 4, 1, 490.00, 490.00, 'Extra lemon wedge', 'served'),
(103, 10, 2, 410.00, 820.00, 'Served with extra salan and raita', 'served'),
(103, 18, 2, 170.00, 340.00, 'Double shot blue curacao', 'served');

-- 6. Sample Completed Past Bill (With Customer Name, Mobile & Thank You SMS Log)
INSERT INTO `orders` (`id`, `order_number`, `table_id`, `order_type`, `customer_name`, `customer_phone`, `status`, `total_amount`, `tax_amount`, `discount_amount`, `grand_total`, `payment_status`, `notes`) VALUES
(100, 'ORD-2026-000', NULL, 'takeaway', 'Aman Verma', '+91 9998887776', 'completed', 730.00, 36.50, 0.00, 766.50, 'paid', 'Takeaway packaging complete');

INSERT INTO `order_items` (`order_id`, `menu_item_id`, `quantity`, `unit_price`, `total_price`, `special_instructions`, `item_status`) VALUES
(100, 5, 1, 420.00, 420.00, 'Extra gravy', 'served'),
(100, 10, 1, 410.00, 410.00, 'Spicy Hyderabadi style', 'served');

INSERT INTO `bills` (`invoice_number`, `order_id`, `customer_name`, `customer_phone`, `subtotal`, `tax_rate`, `tax_amount`, `discount_percent`, `discount_amount`, `tip_amount`, `grand_total`, `payment_method`, `payment_status`, `sms_status`, `sms_text`, `cashier_notes`) VALUES
('INV-2026-001', 100, 'Aman Verma', '+91 9998887776', 730.00, 5.00, 36.50, 0.00, 0.00, 20.00, 786.50, 'upi', 'completed', 'sent', 'Dear Aman Verma, thank you for dining with us at RestroOps Gourmet! Invoice: INV-2026-001, Amount Paid: Rs 786.50 (UPI). We hope you enjoyed your meal and look forward to serving you again soon!', 'Paid via GPay');

-- ==========================================================
-- 🛠️ 10 ESSENTIAL OPERATIONAL SQL QUERIES AT A GLANCE
-- ==========================================================

-- ----------------------------------------------------------
-- QUERY 1: Live Table Availability & Section Occupancy Breakdown
-- ----------------------------------------------------------
-- SELECT 
--   section,
--   COUNT(*) AS total_tables,
--   SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) AS available_tables,
--   SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) AS occupied_tables,
--   SUM(CASE WHEN status = 'reserved' THEN 1 ELSE 0 END) AS reserved_tables,
--   SUM(CASE WHEN status = 'cleaning' THEN 1 ELSE 0 END) AS cleaning_tables,
--   ROUND((SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 1) AS occupancy_pct
-- FROM tables
-- GROUP BY section;

-- ----------------------------------------------------------
-- QUERY 2: Active Kitchen Display Queue (KDS) with Urgency Elapsed Minutes
-- ----------------------------------------------------------
-- SELECT 
--   o.id AS order_id,
--   o.order_number,
--   COALESCE(t.table_number, 'Takeaway') AS table_number,
--   o.order_type,
--   o.customer_name,
--   o.customer_phone,
--   o.status AS order_status,
--   TIMESTAMPDIFF(MINUTE, o.created_at, NOW()) AS elapsed_minutes,
--   COUNT(oi.id) AS total_items,
--   SUM(CASE WHEN oi.item_status = 'ready' THEN 1 ELSE 0 END) AS ready_items,
--   SUM(CASE WHEN oi.item_status IN ('pending', 'preparing') THEN 1 ELSE 0 END) AS pending_items
-- FROM orders o
-- LEFT JOIN tables t ON o.table_id = t.id
-- JOIN order_items oi ON o.id = oi.order_id
-- WHERE o.status IN ('active', 'kitchen_processing', 'ready_to_serve')
-- GROUP BY o.id, o.order_number, t.table_number, o.order_type, o.customer_name, o.customer_phone, o.status, o.created_at
-- ORDER BY o.created_at ASC;

-- ----------------------------------------------------------
-- QUERY 3: Live Item-wise Kitchen Ticket Detail
-- ----------------------------------------------------------
-- SELECT 
--   oi.id AS order_item_id,
--   o.order_number,
--   COALESCE(t.table_number, 'Takeaway') AS table_number,
--   m.name AS item_name,
--   m.is_veg,
--   oi.quantity,
--   oi.special_instructions,
--   oi.item_status,
--   TIMESTAMPDIFF(MINUTE, oi.created_at, NOW()) AS cook_time_minutes
-- FROM order_items oi
-- JOIN orders o ON oi.order_id = o.id
-- LEFT JOIN tables t ON o.table_id = t.id
-- JOIN menu_items m ON oi.menu_item_id = m.id
-- WHERE oi.item_status != 'cancelled' AND o.status IN ('active', 'kitchen_processing', 'ready_to_serve')
-- ORDER BY o.created_at ASC, oi.id ASC;

-- ----------------------------------------------------------
-- QUERY 4: Customer Billing & Thank You SMS Log
-- ----------------------------------------------------------
-- SELECT 
--   b.invoice_number,
--   b.customer_name,
--   b.customer_phone,
--   b.grand_total,
--   b.payment_method,
--   b.sms_status,
--   b.sms_text,
--   b.paid_at
-- FROM bills b
-- ORDER BY b.paid_at DESC;

-- ----------------------------------------------------------
-- QUERY 5: Daily Revenue, Tax, Discounts & Payment Method Summary
-- ----------------------------------------------------------
-- SELECT 
--   COUNT(b.id) AS total_transactions,
--   SUM(b.subtotal) AS gross_subtotal,
--   SUM(b.tax_amount) AS total_tax_collected,
--   SUM(b.discount_amount) AS total_discounts_given,
--   SUM(b.tip_amount) AS total_tips_received,
--   SUM(b.grand_total) AS net_revenue,
--   SUM(CASE WHEN b.payment_method = 'upi' THEN b.grand_total ELSE 0 END) AS upi_revenue,
--   SUM(CASE WHEN b.payment_method = 'card' THEN b.grand_total ELSE 0 END) AS card_revenue,
--   SUM(CASE WHEN b.payment_method = 'cash' THEN b.grand_total ELSE 0 END) AS cash_revenue
-- FROM bills b
-- WHERE DATE(b.paid_at) = CURRENT_DATE();

-- ----------------------------------------------------------
-- QUERY 6: Top 5 Bestselling Dishes by Quantity and Sales Revenue
-- ----------------------------------------------------------
-- SELECT 
--   m.id AS item_id,
--   m.name AS dish_name,
--   c.name AS category_name,
--   m.price AS unit_price,
--   SUM(oi.quantity) AS total_quantity_sold,
--   SUM(oi.total_price) AS total_revenue_generated
-- FROM order_items oi
-- JOIN menu_items m ON oi.menu_item_id = m.id
-- JOIN menu_categories c ON m.category_id = c.id
-- WHERE oi.item_status != 'cancelled'
-- GROUP BY m.id, m.name, c.name, m.price
-- ORDER BY total_quantity_sold DESC
-- LIMIT 5;

-- ----------------------------------------------------------
-- QUERY 7: Customer Order & Visit History by Mobile Number
-- ----------------------------------------------------------
-- SELECT 
--   o.order_number,
--   o.customer_name,
--   o.customer_phone,
--   COALESCE(t.table_number, 'Takeaway') AS table_number,
--   o.grand_total,
--   o.status,
--   o.created_at
-- FROM orders o
-- LEFT JOIN tables t ON o.table_id = t.id
-- WHERE o.customer_phone = '+91 9876543210'
-- ORDER BY o.created_at DESC;

-- ----------------------------------------------------------
-- QUERY 8: Active Unsettled Orders for Cashier Desk
-- ----------------------------------------------------------
-- SELECT 
--   o.id AS order_id,
--   o.order_number,
--   COALESCE(t.table_number, 'Takeaway') AS table_number,
--   o.customer_name,
--   o.customer_phone,
--   o.total_amount AS subtotal,
--   o.tax_amount,
--   o.grand_total,
--   o.status AS order_status,
--   o.payment_status
-- FROM orders o
-- LEFT JOIN tables t ON o.table_id = t.id
-- WHERE o.payment_status = 'unpaid' AND o.status != 'cancelled'
-- ORDER BY o.created_at ASC;

-- ----------------------------------------------------------
-- QUERY 9: Real-time Menu Availability & Out of Stock Alert
-- ----------------------------------------------------------
-- SELECT 
--   m.id,
--   m.name AS item_name,
--   c.name AS category_name,
--   m.price,
--   m.is_available
-- FROM menu_items m
-- JOIN menu_categories c ON m.category_id = c.id
-- WHERE m.is_available = 0
-- ORDER BY c.name, m.name;

-- ----------------------------------------------------------
-- QUERY 10: Settle Bill and Free Table (Transaction Flow)
-- ----------------------------------------------------------
-- START TRANSACTION;
-- -- 1. Create Bill record
-- INSERT INTO bills (invoice_number, order_id, customer_name, customer_phone, subtotal, tax_rate, tax_amount, discount_percent, discount_amount, tip_amount, grand_total, payment_method, payment_status, sms_status, sms_text)
-- VALUES ('INV-2026-999', 101, 'Rahul Sharma', '+91 9876543210', 1175.00, 5.00, 58.75, 0.00, 0.00, 0.00, 1233.75, 'upi', 'completed', 'sent', 'Dear Rahul Sharma, thank you for dining with us! Invoice: INV-2026-999, Total: Rs 1233.75. We look forward to seeing you again!');
-- -- 2. Update Order
-- UPDATE orders SET status = 'completed', payment_status = 'paid' WHERE id = 101;
-- -- 3. Free Table / Set to Cleaning
-- UPDATE tables SET status = 'cleaning', current_order_id = NULL WHERE id = 2;
-- COMMIT;
