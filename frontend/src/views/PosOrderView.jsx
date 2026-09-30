import React, { useState, useEffect } from 'react';
import { 
  Search, 
  ShoppingBag, 
  Plus, 
  Minus, 
  Trash2, 
  ChefHat, 
  Clock, 
  Check, 
  Utensils, 
  FileText,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { ordersApi, menuApi } from '../api';

export default function PosOrderView({ 
  tables = [], 
  selectedTable = null, 
  onOrderSuccess, 
  onCancel 
}) {
  const [categories, setCategories] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategoryId, setActiveCategoryId] = useState('all');
  const [dietFilter, setDietFilter] = useState('all'); // all, veg, non-veg

  // Order state
  const [orderType, setOrderType] = useState('dine_in');
  const [tableId, setTableId] = useState(selectedTable ? selectedTable.id : '');
  const [customerName, setCustomerName] = useState(selectedTable?.order_info?.customer_name || 'Guest');
  const [customerPhone, setCustomerPhone] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [cart, setCart] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  // Check if we are appending items to an existing active order
  const existingOrderId = selectedTable?.current_order_id || null;

  useEffect(() => {
    fetchMenuData();
  }, []);

  useEffect(() => {
    if (selectedTable) {
      setTableId(selectedTable.id);
      if (selectedTable.order_info?.customer_name) {
        setCustomerName(selectedTable.order_info.customer_name);
      }
    }
  }, [selectedTable]);

  const fetchMenuData = async () => {
    try {
      setLoading(true);
      const res = await menuApi.getMenu();
      if (res.data.success) {
        setCategories(res.data.data);
        const allItems = res.data.data.flatMap(cat => 
          cat.items.map(item => ({ ...item, category_name: cat.name }))
        );
        setMenuItems(allItems);
      }
    } catch (err) {
      console.error('Error fetching menu:', err);
    } finally {
      setLoading(false);
    }
  };

  // Add item to cart
  const handleAddToCart = (item) => {
    const existingIndex = cart.findIndex(c => c.id === item.id);
    if (existingIndex > -1) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      setCart([...cart, { ...item, quantity: 1, special_instructions: '' }]);
    }
  };

  // Update quantity
  const handleUpdateQuantity = (itemId, delta) => {
    setCart(prev => 
      prev
        .map(item => {
          if (item.id === itemId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean)
    );
  };

  // Update item instructions
  const handleItemInstructionChange = (itemId, note) => {
    setCart(prev =>
      prev.map(item => (item.id === itemId ? { ...item, special_instructions: note } : item))
    );
  };

  // Remove item
  const handleRemoveFromCart = (itemId) => {
    setCart(prev => prev.filter(item => item.id !== itemId));
  };

  // Totals
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const taxRate = 5.0; // 5% GST
  const taxAmount = (subtotal * taxRate) / 100;
  const grandTotal = subtotal + taxAmount;

  // Filtered Menu Items
  const filteredItems = menuItems.filter(item => {
    const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCategory = activeCategoryId === 'all' || item.category_id === activeCategoryId;
    const matchDiet = dietFilter === 'all' || 
                      (dietFilter === 'veg' && item.is_veg === 1) || 
                      (dietFilter === 'non-veg' && item.is_veg === 0);
    return matchSearch && matchCategory && matchDiet;
  });

  // Submit Order / Dispatch to Kitchen
  const handleSubmitOrder = async () => {
    if (cart.length === 0) {
      alert('Please add at least one item to the cart.');
      return;
    }

    if (orderType === 'dine_in' && !tableId) {
      alert('Please select a dining table.');
      return;
    }

    try {
      setSubmitting(true);

      if (existingOrderId) {
        // Append items to existing running order
        await ordersApi.addItems(existingOrderId, cart);
        alert(`Items successfully added to Order #${selectedTable?.order_info?.order_number || existingOrderId} and sent to Kitchen!`);
      } else {
        // Create brand new order
        const payload = {
          table_id: orderType === 'dine_in' ? parseInt(tableId, 10) : null,
          order_type: orderType,
          customer_name: customerName.trim() || 'Guest',
          customer_phone: customerPhone.trim(),
          notes: orderNotes.trim(),
          items: cart
        };
        await ordersApi.create(payload);
        alert('Order placed successfully and routed to Kitchen Display System (KDS)!');
      }

      setCart([]);
      if (onOrderSuccess) onOrderSuccess();
    } catch (err) {
      console.error('Order creation error:', err);
      alert(err.response?.data?.message || 'Failed to place order.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      
      {/* Left: Menu Catalog (8 Cols) */}
      <div className="lg:col-span-8 space-y-4">
        
        {/* Order Setup Header */}
        <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            
            {/* Order Type Toggle */}
            <div className="flex items-center p-1 rounded-lg bg-slate-950 border border-slate-800">
              <button
                type="button"
                onClick={() => setOrderType('dine_in')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  orderType === 'dine_in' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Dine-In
              </button>
              <button
                type="button"
                onClick={() => setOrderType('takeaway')}
                className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-all ${
                  orderType === 'takeaway' ? 'bg-orange-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                }`}
              >
                Takeaway
              </button>
            </div>

            {/* Table Selection for Dine-In */}
            {orderType === 'dine_in' && (
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-slate-300">Table:</label>
                <select
                  value={tableId}
                  onChange={e => setTableId(e.target.value)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-orange-500"
                >
                  <option value="">-- Select Table --</option>
                  {tables.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.table_number} ({t.section} - {t.capacity}p) {t.status === 'occupied' ? '• (Occupied)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Customer Name & Phone */}
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Guest Name"
                value={customerName}
                onChange={e => setCustomerName(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-orange-500 placeholder-slate-500 w-32 sm:w-36"
              />
              <input
                type="tel"
                placeholder="Mobile (for SMS)"
                value={customerPhone}
                onChange={e => setCustomerPhone(e.target.value)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-mono focus:outline-none focus:border-orange-500 placeholder-slate-500 w-32 sm:w-36"
              />
            </div>
          </div>

          {existingOrderId && (
            <div className="p-2 rounded-lg bg-orange-950/40 border border-orange-500/30 text-xs text-orange-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-400 shrink-0" />
              <span>
                Appending items to active Table <strong>{selectedTable?.table_number}</strong> (Order #{selectedTable?.order_info?.order_number})
              </span>
            </div>
          )}
        </div>

        {/* Menu Search & Category Filters */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-center gap-3">
            
            {/* Search Input */}
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
              <input
                type="text"
                placeholder="Search dishes, curries, mocktails, desserts..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-slate-500"
              />
            </div>

            {/* Diet Filter Pills */}
            <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800 shrink-0">
              <button
                onClick={() => setDietFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  dietFilter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setDietFilter('veg')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  dietFilter === 'veg' ? 'bg-emerald-600 text-white' : 'text-emerald-400 hover:text-emerald-300'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span> Veg
              </button>
              <button
                onClick={() => setDietFilter('non-veg')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                  dietFilter === 'non-veg' ? 'bg-rose-600 text-white' : 'text-rose-400 hover:text-rose-300'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-rose-400"></span> Non-Veg
              </button>
            </div>

          </div>

          {/* Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              onClick={() => setActiveCategoryId('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                activeCategoryId === 'all'
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              All Categories
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategoryId(cat.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                  activeCategoryId === cat.id
                    ? 'bg-orange-500 text-white shadow-sm'
                    : 'bg-slate-900 text-slate-300 hover:bg-slate-800 border border-slate-800'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Menu Items Grid */}
        {filteredItems.length === 0 ? (
          <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
            <Utensils className="w-10 h-10 text-slate-500 mx-auto mb-3" />
            <h3 className="text-base font-semibold text-white">No menu items found</h3>
            <p className="text-sm text-slate-400 mt-1">Try adjusting your search or diet filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {filteredItems.map(item => {
              const inCart = cart.find(c => c.id === item.id);
              const isAvailable = item.is_available === 1;

              return (
                <div
                  key={item.id}
                  className={`group relative flex flex-col justify-between p-3.5 rounded-xl bg-slate-900/90 border border-slate-800/80 transition-all hover:border-slate-700 hover:shadow-lg ${
                    !isAvailable ? 'opacity-50 grayscale' : ''
                  }`}
                >
                  <div>
                    {/* Item Image */}
                    {item.image_url && (
                      <div className="w-full h-32 rounded-lg overflow-hidden bg-slate-800 mb-2.5 relative">
                        <img
                          src={item.image_url}
                          alt={item.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        <div className="absolute top-2 left-2">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 ${
                            item.is_veg ? 'bg-emerald-950/80 text-emerald-400 border border-emerald-500/40' : 'bg-rose-950/80 text-rose-400 border border-rose-500/40'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${item.is_veg ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                            {item.is_veg ? 'Veg' : 'Non-Veg'}
                          </span>
                        </div>
                        {item.prep_time_mins && (
                          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/70 backdrop-blur-sm text-[10px] text-slate-300 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-orange-400" />
                            {item.prep_time_mins}m
                          </div>
                        )}
                      </div>
                    )}

                    <h4 className="text-sm font-bold text-white line-clamp-1 group-hover:text-orange-400 transition-colors">
                      {item.name}
                    </h4>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1 leading-relaxed">
                      {item.description || item.category_name}
                    </p>
                  </div>

                  {/* Price & Action */}
                  <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between">
                    <span className="font-mono text-sm font-extrabold text-white">
                      ₹{parseFloat(item.price).toFixed(2)}
                    </span>

                    {isAvailable ? (
                      inCart ? (
                        <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-0.5 border border-slate-700">
                          <button
                            onClick={() => handleUpdateQuantity(item.id, -1)}
                            className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-white"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 text-xs font-bold text-orange-400">{inCart.quantity}</span>
                          <button
                            onClick={() => handleUpdateQuantity(item.id, 1)}
                            className="p-1 rounded bg-orange-500 hover:bg-orange-600 text-white"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAddToCart(item)}
                          className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-orange-500/10 hover:bg-orange-500 text-orange-400 hover:text-white border border-orange-500/20 text-xs font-bold transition-all shadow-sm"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Add</span>
                        </button>
                      )
                    ) : (
                      <span className="text-[11px] font-semibold text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-900/40">
                        Out of Stock
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Right: Order Cart & Kitchen Dispatch Panel (4 Cols) */}
      <div className="lg:col-span-4 sticky top-20 space-y-4">
        <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl flex flex-col justify-between max-h-[calc(100vh-6rem)] overflow-hidden">
          
          {/* Cart Header */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-orange-500" />
              <h3 className="font-bold text-white text-base">Current Order</h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-orange-500/20 text-orange-400">
              {cart.reduce((s, i) => s + i.quantity, 0)} Items
            </span>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto py-3 space-y-3 max-h-72">
            {cart.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs space-y-2">
                <ShoppingBag className="w-8 h-8 mx-auto text-slate-600 opacity-60" />
                <p>Order is currently empty.</p>
                <p className="text-[11px] text-slate-500">Select dishes from the menu to build order.</p>
              </div>
            ) : (
              cart.map(item => (
                <div key={item.id} className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${item.is_veg ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                      <span className="font-semibold text-xs text-white truncate">{item.name}</span>
                    </div>
                    <span className="font-mono text-xs font-bold text-white shrink-0">
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    {/* Quantity controls */}
                    <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-0.5">
                      <button
                        onClick={() => handleUpdateQuantity(item.id, -1)}
                        className="p-1 rounded bg-slate-700 hover:bg-slate-600 text-white"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="px-2 text-xs font-bold text-white">{item.quantity}</span>
                      <button
                        onClick={() => handleUpdateQuantity(item.id, 1)}
                        className="p-1 rounded bg-orange-500 hover:bg-orange-600 text-white"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>

                    <button
                      onClick={() => handleRemoveFromCart(item.id)}
                      className="text-slate-500 hover:text-rose-400 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Kitchen Special Instructions */}
                  <input
                    type="text"
                    placeholder="Kitchen note: e.g. Less spicy, extra sauce"
                    value={item.special_instructions || ''}
                    onChange={e => handleItemInstructionChange(item.id, e.target.value)}
                    className="w-full px-2.5 py-1 rounded bg-slate-900 border border-slate-800 text-[11px] text-slate-300 focus:outline-none focus:border-orange-500 placeholder-slate-600"
                  />
                </div>
              ))
            )}
          </div>

          {/* Cart Bill Breakdown & Dispatch */}
          <div className="pt-3 border-t border-slate-800 space-y-3">
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Subtotal</span>
                <span className="font-mono text-slate-200">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Taxes (5% GST)</span>
                <span className="font-mono text-slate-200">₹{taxAmount.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-sm font-bold text-white pt-1 border-t border-slate-800">
                <span>Grand Total</span>
                <span className="font-mono text-orange-400 text-base">₹{grandTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* General Order Notes */}
            <textarea
              rows={2}
              placeholder="General table notes or allergies..."
              value={orderNotes}
              onChange={e => setOrderNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-orange-500 placeholder-slate-600 resize-none"
            />

            {/* Send to Kitchen Action */}
            <button
              onClick={handleSubmitOrder}
              disabled={submitting || cart.length === 0}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white text-sm font-bold shadow-lg shadow-orange-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChefHat className="w-5 h-5" />
              <span>{submitting ? 'Dispatching...' : (existingOrderId ? 'Send Additional Items to Kitchen' : 'Place Order & Send to KDS')}</span>
            </button>
          </div>

        </div>
      </div>

    </div>
  );
}
