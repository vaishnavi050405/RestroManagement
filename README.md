# 🍽️ RestroOps - Restaurant Operations Management System

A full-stack, enterprise-grade Restaurant Operations and Kitchen Management platform built with **React, Node.js, Express, and MySQL**.

---

## 🚀 Key Modules & Capabilities

1. **Interactive Table & Floor Management**:
   - Visual floor plan and categorized table grid (Main Dining, Family Section, Patio Garden, Rooftop Lounge, Bar Counter).
   - Real-time color-coded statuses:
     - 🟢 **Available** (Free for seating)
     - 🔴 **Occupied** (Live order with active billing total)
     - 🟡 **Reserved** (Booked tables)
     - 🟣 **Cleaning** (Sanitation & turnaround)
   - 1-click status actions: Start Order, Reserve, Settle Bill, Add Items, Mark Cleaned/Ready.

2. **Rapid POS & Order Management**:
   - Fast Point of Sale screen for Dine-In and Takeaway orders.
   - Capture Customer Name & Customer Mobile Number directly at order entry.
   - Dynamic menu catalog with real-time search, category tabs, and vegetarian / non-vegetarian filter pills.
   - Custom kitchen cooking notes per dish (e.g., *"Less spicy"*, *"No onions"*).
   - Instant dispatch to the Kitchen Display System (KDS).

3. **Kitchen Display System (KDS)**:
   - Live kitchen ticket cards sorted by order arrival time.
   - Urgency visual indicators:
     - 🟢 **Fresh** (< 10 mins)
     - 🟡 **Cooking** (10 - 20 mins)
     - 🔴 **Delayed** (> 20 mins)
   - Step-by-step dish preparation lifecycle (`Pending` ➔ `Preparing` ➔ `Ready to Serve` ➔ `Served`).
   - Batch 1-click *"Mark Entire Ticket Ready"* and *"Mark Served"*.

4. **Billing, Invoicing & Automated Thank You Text Messages**:
   - Itemized bill generator with dynamic tax (GST/VAT), customizable discounts (%), and tips.
   - Multiple payment methods (Cash, Card, UPI / QR Code).
   - **Customer Name & Mobile Number Tracking** on all invoices.
   - **Automated Thank You Text Message**: Sends personalized SMS / WhatsApp visit confirmation to customer upon payment completion.
   - 1-Click WhatsApp (`wa.me`) & Native SMS sharing actions.
   - Digital printable thermal receipt popup with invoice numbers.
   - **Automated Table Turnover**: Automatically frees table or sets it to "Cleaning" upon checkout completion.

5. **Menu & Stock Inventory**:
   - Manage categories and dishes with pricing, preparation time, and dietary tags.
   - 1-click In-Stock / Out-of-Stock instant availability toggle.

6. **Operations Analytics Dashboard**:
   - Today's total sales & revenue, completed invoices count, average ticket size, and floor occupancy percentage.
   - Section-by-section occupancy progress bars.
   - Top 5 bestselling dishes ranking.

---

## 🗄️ Database Queries & SQL Setup (`db.sql`)

The [`db.sql`](file:///d:/PROJECTs/RestroManagement/db.sql) file contains the complete relational schema along with **10 essential operational SQL queries**:

1. **Live Table Occupancy by Section**:
   ```sql
   SELECT section, COUNT(*) AS total_tables,
          SUM(CASE WHEN status = 'available' THEN 1 ELSE 0 END) AS available_tables,
          SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) AS occupied_tables,
          ROUND((SUM(CASE WHEN status = 'occupied' THEN 1 ELSE 0 END) / COUNT(*)) * 100, 1) AS occupancy_pct
   FROM tables GROUP BY section;
   ```

2. **Active Kitchen Display Queue with Elapsed Urgency Minutes**:
   ```sql
   SELECT o.id, o.order_number, COALESCE(t.table_number, 'Takeaway') AS table_number,
          o.customer_name, o.customer_phone, o.status,
          TIMESTAMPDIFF(MINUTE, o.created_at, NOW()) AS elapsed_minutes
   FROM orders o
   LEFT JOIN tables t ON o.table_id = t.id
   WHERE o.status IN ('active', 'kitchen_processing', 'ready_to_serve')
   ORDER BY o.created_at ASC;
   ```

3. **Customer Billing & Thank You SMS Log**:
   ```sql
   SELECT invoice_number, customer_name, customer_phone, grand_total, payment_method, sms_status, sms_text, paid_at
   FROM bills ORDER BY paid_at DESC;
   ```

4. **Daily Net Sales & Payment Channel Breakdown**:
   ```sql
   SELECT COUNT(id) AS total_bills, SUM(subtotal) AS subtotal, SUM(tax_amount) AS total_tax,
          SUM(discount_amount) AS total_discounts, SUM(grand_total) AS net_revenue,
          SUM(CASE WHEN payment_method = 'upi' THEN grand_total ELSE 0 END) AS upi_revenue,
          SUM(CASE WHEN payment_method = 'card' THEN grand_total ELSE 0 END) AS card_revenue,
          SUM(CASE WHEN payment_method = 'cash' THEN grand_total ELSE 0 END) AS cash_revenue
   FROM bills WHERE DATE(paid_at) = CURRENT_DATE();
   ```

5. **Top 5 Bestselling Dishes by Quantity & Revenue**:
   ```sql
   SELECT m.name AS dish_name, c.name AS category, SUM(oi.quantity) AS total_sold, SUM(oi.total_price) AS revenue
   FROM order_items oi
   JOIN menu_items m ON oi.menu_item_id = m.id
   JOIN menu_categories c ON m.category_id = c.id
   WHERE oi.item_status != 'cancelled'
   GROUP BY m.id, m.name, c.name ORDER BY total_sold DESC LIMIT 5;
   ```

---

## ⚡ Quick Start

### 1. Database Setup (MySQL)
```bash
mysql -u root -p < db.sql
```

### 2. Start Backend API
```powershell
cd backend
npm.cmd start
```
*Backend runs on `http://localhost:5000`*

### 3. Start Frontend Client
```powershell
cd frontend
npm.cmd run dev
```
*Frontend runs on `http://localhost:5173`*
