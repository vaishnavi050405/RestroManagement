import React, { useState, useEffect } from 'react';
import { 
  Receipt, 
  CreditCard, 
  Banknote, 
  QrCode, 
  Printer, 
  CheckCircle2, 
  Clock, 
  Percent, 
  Sparkles,
  ArrowRight,
  X,
  History,
  AlertCircle,
  Phone,
  User,
  MessageSquare,
  Share2,
  Copy,
  Check,
  Smartphone
} from 'lucide-react';
import { billingApi, ordersApi } from '../api';

export default function BillingView({ tables = [], onPaymentSuccess, onRefreshAll }) {
  const [activeOrders, setActiveOrders] = useState([]);
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [billPreview, setBillPreview] = useState(null);
  const [billHistory, setBillHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(true);

  // Customer contact info for billing
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');

  // Billing calculation states
  const [discountPercent, setDiscountPercent] = useState(0);
  const [taxRate, setTaxRate] = useState(5.0);
  const [tipAmount, setTipAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState('cash'); // cash, card, upi, other
  const [cashierNotes, setCashierNotes] = useState('');
  const [nextTableStatus, setNextTableStatus] = useState('cleaning'); // cleaning or available
  const [submitting, setSubmitting] = useState(false);

  // Completed Receipt Modal & SMS Data State
  const [receiptModalData, setReceiptModalData] = useState(null);
  const [copiedSms, setCopiedSms] = useState(false);

  useEffect(() => {
    fetchActiveOrders();
    fetchBillsHistory();
  }, []);

  useEffect(() => {
    if (selectedOrderId) {
      fetchBillPreview(selectedOrderId, discountPercent, taxRate, tipAmount);
    } else {
      setBillPreview(null);
    }
  }, [selectedOrderId, discountPercent, taxRate, tipAmount]);

  // Update customer info inputs when bill preview changes
  useEffect(() => {
    if (billPreview) {
      setCustomerName(billPreview.customer_name || 'Guest');
      setCustomerPhone(billPreview.customer_phone || '');
    }
  }, [billPreview]);

  const fetchActiveOrders = async () => {
    try {
      setLoading(true);
      const res = await ordersApi.getAll({ payment_status: 'unpaid' });
      if (res.data.success) {
        setActiveOrders(res.data.data);
        if (res.data.data.length > 0 && !selectedOrderId) {
          setSelectedOrderId(res.data.data[0].id);
        }
      }
    } catch (err) {
      console.error('Error fetching active orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchBillsHistory = async () => {
    try {
      const res = await billingApi.getHistory();
      if (res.data.success) {
        setBillHistory(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching history:', err);
    }
  };

  const fetchBillPreview = async (orderId, disc, tax, tip) => {
    try {
      const res = await billingApi.getPreview(orderId, {
        discount_percent: disc,
        tax_rate: tax,
        tip_amount: tip
      });
      if (res.data.success) {
        setBillPreview(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching bill preview:', err);
    }
  };

  const handleCheckout = async () => {
    if (!selectedOrderId || !billPreview) return;

    try {
      setSubmitting(true);
      const payload = {
        order_id: selectedOrderId,
        customer_name: customerName,
        customer_phone: customerPhone,
        payment_method: paymentMethod,
        discount_percent: discountPercent,
        tax_rate: taxRate,
        tip_amount: tipAmount,
        cashier_notes: cashierNotes,
        auto_free_table: true,
        next_table_status: nextTableStatus
      };

      const res = await billingApi.checkout(payload);
      if (res.data.success) {
        const resData = res.data.data;
        // Show printable receipt and SMS notification modal
        setReceiptModalData({
          ...billPreview,
          invoice_number: resData.bill?.invoice_number || resData.invoice_number,
          customer_name: resData.customer_name || customerName || 'Guest',
          customer_phone: resData.customer_phone || customerPhone || '',
          sms_notification: resData.sms_notification || null,
          paid_at: new Date().toLocaleString(),
          payment_method: paymentMethod,
          next_table_status: nextTableStatus
        });

        // Reset states
        setSelectedOrderId(null);
        setDiscountPercent(0);
        setTipAmount(0);
        setCashierNotes('');

        await fetchActiveOrders();
        await fetchBillsHistory();
        if (onPaymentSuccess) onPaymentSuccess();
        if (onRefreshAll) onRefreshAll();
      }
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to process checkout');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopySms = (text) => {
    navigator.clipboard.writeText(text);
    setCopiedSms(true);
    setTimeout(() => setCopiedSms(false), 2500);
  };

  // Clean phone number for URL schemes
  const getCleanPhone = (phone) => {
    if (!phone) return '';
    return phone.replace(/[^0-9]/g, '');
  };

  return (
    <div className="space-y-6">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
            <Receipt className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
              Billing & Cashier Desk
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {activeOrders.length} Unsettled Orders
              </span>
            </h2>
            <p className="text-xs text-slate-400">Customer receipts, Thank You SMS dispatch, and instant checkout</p>
          </div>
        </div>

        <button
          onClick={() => setShowHistory(!showHistory)}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-all border ${
            showHistory
              ? 'bg-slate-800 text-white border-slate-700'
              : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
          }`}
        >
          <History className="w-4 h-4 text-orange-400" />
          <span>{showHistory ? 'Back to Active Billing' : 'View Payment History'}</span>
        </button>
      </div>

      {showHistory ? (
        /* Bills Payment History Table */
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
          <h3 className="text-base font-bold text-white">Settled Transactions & Invoices</h3>
          {billHistory.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-10">No completed transactions found yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-slate-950/80 text-slate-400 uppercase text-[10px] font-bold">
                  <tr>
                    <th className="py-3 px-4 rounded-l-lg">Invoice #</th>
                    <th className="py-3 px-4">Order / Table</th>
                    <th className="py-3 px-4">Customer</th>
                    <th className="py-3 px-4">Mobile</th>
                    <th className="py-3 px-4">Payment Method</th>
                    <th className="py-3 px-4">Grand Total</th>
                    <th className="py-3 px-4 rounded-r-lg">Date & Time</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {billHistory.map(b => (
                    <tr key={b.id} className="hover:bg-slate-800/40">
                      <td className="py-3 px-4 font-mono font-bold text-white">{b.invoice_number}</td>
                      <td className="py-3 px-4 font-semibold text-orange-400">{b.table_number || 'Takeaway'}</td>
                      <td className="py-3 px-4 font-medium text-white">{b.customer_name || 'Guest'}</td>
                      <td className="py-3 px-4 text-slate-400 font-mono">{b.customer_phone || '—'}</td>
                      <td className="py-3 px-4 uppercase font-bold text-[11px] text-emerald-400">{b.payment_method}</td>
                      <td className="py-3 px-4 font-mono font-bold text-emerald-400 text-sm">
                        ₹{parseFloat(b.grand_total).toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {new Date(b.created_at || b.paid_at).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        /* Active Billing Grid */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Left Column: Active Unsettled Orders (4 Cols) */}
          <div className="lg:col-span-4 space-y-3">
            <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider px-1">Select Order to Settle</h3>
            
            {activeOrders.length === 0 ? (
              <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-dashed border-slate-800 p-4">
                <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-white">All Orders Settled</h4>
                <p className="text-xs text-slate-400 mt-1">There are no pending dine-in or takeaway bills.</p>
              </div>
            ) : (
              activeOrders.map(order => {
                const isSelected = selectedOrderId === order.id;
                return (
                  <div
                    key={order.id}
                    onClick={() => setSelectedOrderId(order.id)}
                    className={`cursor-pointer p-4 rounded-xl border transition-all ${
                      isSelected
                        ? 'bg-slate-900 border-orange-500/60 ring-2 ring-orange-500/30 shadow-lg'
                        : 'bg-slate-900/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-white">{order.table_number || 'Takeaway'}</span>
                        <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                          {order.order_type?.replace('_', ' ')}
                        </span>
                      </div>
                      <span className="font-mono text-base font-bold text-emerald-400">
                        ₹{parseFloat(order.grand_total).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between mt-2 text-xs text-slate-400">
                      <span className="font-semibold text-slate-200">{order.customer_name || 'Guest'}</span>
                      <span>{order.customer_phone ? `📱 ${order.customer_phone}` : `${order.items_count || order.items?.length || 0} items`}</span>
                    </div>

                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800/80 text-[11px] text-slate-500">
                      <span>{order.order_number}</span>
                      <span className="capitalize text-orange-400 font-medium">{order.status?.replace('_', ' ')}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Right Column: Checkout & Itemized Invoice Breakdown (8 Cols) */}
          <div className="lg:col-span-8">
            {billPreview ? (
              <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 shadow-2xl space-y-5">
                
                {/* Invoice Top Meta */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
                  <div>
                    <h3 className="text-xl font-black text-white">Invoice Settlement</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Order: <strong className="text-slate-200">{billPreview.order_number}</strong> • Table: <strong className="text-orange-400">{billPreview.table_number}</strong>
                    </p>
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>SMS Receipt will be triggered to guest</span>
                  </div>
                </div>

                {/* Customer Contact Details (Name & Mobile Number) */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-orange-400" />
                      <span>Customer Details (for Bill & Thank You SMS)</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Customer / Guest Name</label>
                      <div className="relative">
                        <User className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                        <input
                          type="text"
                          placeholder="e.g. Rahul Sharma"
                          value={customerName}
                          onChange={e => setCustomerName(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-400 mb-1">Mobile Number (for SMS & WhatsApp)</label>
                      <div className="relative">
                        <Phone className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-3" />
                        <input
                          type="tel"
                          placeholder="e.g. +91 9876543210"
                          value={customerPhone}
                          onChange={e => setCustomerPhone(e.target.value)}
                          className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-white text-xs font-mono font-semibold focus:outline-none focus:border-orange-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Itemized list */}
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  <table className="w-full text-left text-xs">
                    <thead className="text-slate-500 uppercase text-[10px] border-b border-slate-800">
                      <tr>
                        <th className="pb-2">Item</th>
                        <th className="pb-2 text-center">Qty</th>
                        <th className="pb-2 text-right">Rate</th>
                        <th className="pb-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {billPreview.items.map(item => (
                        <tr key={item.id} className="text-slate-300">
                          <td className="py-2 flex items-center gap-1.5">
                            <span className={`w-1.5 h-1.5 rounded-full ${item.is_veg ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                            <span className="font-medium text-white">{item.item_name}</span>
                          </td>
                          <td className="py-2 text-center font-mono font-bold text-slate-200">{item.quantity}</td>
                          <td className="py-2 text-right font-mono text-slate-400">₹{parseFloat(item.unit_price).toFixed(2)}</td>
                          <td className="py-2 text-right font-mono font-bold text-white">₹{parseFloat(item.total_price).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Billing Adjustment Controls (Discounts, Tax, Tip) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-4 rounded-xl bg-slate-950/70 border border-slate-800 text-xs">
                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Discount (%)</label>
                    <div className="flex items-center gap-1">
                      {[0, 5, 10, 15].map(pct => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setDiscountPercent(pct)}
                          className={`flex-1 py-1.5 rounded text-xs font-bold transition-all ${
                            discountPercent === pct ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">GST / VAT Rate</label>
                    <select
                      value={taxRate}
                      onChange={e => setTaxRate(parseFloat(e.target.value))}
                      className="w-full py-1.5 px-2.5 rounded bg-slate-800 border border-slate-700 text-white font-semibold focus:outline-none"
                    >
                      <option value={0}>0% (Tax Exempt)</option>
                      <option value={5.0}>5% (Standard GST)</option>
                      <option value={12.0}>12% (Premium GST)</option>
                      <option value={18.0}>18% (Alcoholic/Special)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-400 font-semibold mb-1">Tip Amount (₹)</label>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      value={tipAmount}
                      onChange={e => setTipAmount(parseFloat(e.target.value) || 0)}
                      placeholder="0"
                      className="w-full py-1.5 px-2.5 rounded bg-slate-800 border border-slate-700 text-white font-semibold focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider">Payment Mode</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                    {[
                      { id: 'cash', label: 'Cash', icon: Banknote },
                      { id: 'card', label: 'Card (POS)', icon: CreditCard },
                      { id: 'upi', label: 'UPI / QR Code', icon: QrCode },
                      { id: 'other', label: 'Other', icon: Receipt },
                    ].map(mode => {
                      const Icon = mode.icon;
                      const isChosen = paymentMethod === mode.id;
                      return (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => setPaymentMethod(mode.id)}
                          className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border text-xs font-bold transition-all ${
                            isChosen
                              ? 'bg-orange-500 text-white border-orange-400 shadow-md shadow-orange-500/20'
                              : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          <span>{mode.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Next Table Status Setting */}
                {billPreview.table_id && (
                  <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs">
                    <span className="text-slate-400">After payment, set Table {billPreview.table_number} to:</span>
                    <div className="flex items-center gap-2">
                      <label className="flex items-center gap-1.5 cursor-pointer text-purple-300 font-semibold">
                        <input
                          type="radio"
                          name="tableStatus"
                          value="cleaning"
                          checked={nextTableStatus === 'cleaning'}
                          onChange={() => setNextTableStatus('cleaning')}
                          className="text-purple-500"
                        />
                        <span>Cleaning</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-emerald-300 font-semibold ml-2">
                        <input
                          type="radio"
                          name="tableStatus"
                          value="available"
                          checked={nextTableStatus === 'available'}
                          onChange={() => setNextTableStatus('available')}
                          className="text-emerald-500"
                        />
                        <span>Immediately Available</span>
                      </label>
                    </div>
                  </div>
                )}

                {/* Final Calculation Summary */}
                <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
                  <div className="flex justify-between text-slate-400">
                    <span>Subtotal</span>
                    <span className="font-mono text-slate-200">₹{billPreview.subtotal.toFixed(2)}</span>
                  </div>
                  {billPreview.discount_amount > 0 && (
                    <div className="flex justify-between text-emerald-400">
                      <span>Discount ({billPreview.discount_percent}%)</span>
                      <span className="font-mono">-₹{billPreview.discount_amount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-400">
                    <span>Tax ({billPreview.tax_rate}%)</span>
                    <span className="font-mono text-slate-200">+₹{billPreview.tax_amount.toFixed(2)}</span>
                  </div>
                  {billPreview.tip_amount > 0 && (
                    <div className="flex justify-between text-amber-400">
                      <span>Tip / Gratuity</span>
                      <span className="font-mono">+₹{billPreview.tip_amount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-base font-extrabold text-white pt-2 border-t border-slate-800">
                    <span>Grand Total Payable</span>
                    <span className="font-mono text-emerald-400 text-xl font-black">₹{billPreview.grand_total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Settle Payment Button */}
                <button
                  onClick={handleCheckout}
                  disabled={submitting}
                  className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-bold text-sm shadow-xl shadow-emerald-600/25 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-5 h-5" />
                  <span>{submitting ? 'Processing Payment & SMS...' : `Complete Payment & Dispatch Thank You SMS (₹${billPreview.grand_total.toFixed(2)})`}</span>
                </button>

              </div>
            ) : (
              <div className="text-center py-24 bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
                <Receipt className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <h4 className="text-base font-semibold text-white">No Order Selected</h4>
                <p className="text-xs text-slate-400 mt-1">Select an active order from the left list to view billing breakdown.</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Printable Receipt & Thank You SMS Modal */}
      {receiptModalData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 text-slate-100 rounded-2xl p-6 shadow-2xl space-y-6 my-8 print:bg-white print:text-black print:p-0">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 print:hidden">
              <div className="flex items-center gap-2 text-emerald-400 font-bold text-base">
                <CheckCircle2 className="w-6 h-6" />
                <span>Payment Completed & Receipt Generated</span>
              </div>
              <button onClick={() => setReceiptModalData(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              
              {/* Left: Thermal Receipt Slip (Printable) */}
              <div className="p-4 rounded-xl bg-white text-slate-900 shadow-lg font-mono text-xs space-y-3 print:shadow-none">
                <div className="text-center border-b border-slate-300 pb-3">
                  <h2 className="text-base font-black uppercase tracking-wider">RestroOps Gourmet</h2>
                  <p className="text-[10px] text-slate-500">Fine Dining & Culinary Lounge</p>
                  <p className="text-[10px] text-slate-500">GSTIN: 27AABCR1234F1Z9</p>
                  <p className="text-[10px] text-slate-500">Tel: +91 98765 43210</p>
                </div>

                <div className="space-y-0.5 text-[11px] border-b border-slate-300 pb-2">
                  <div className="flex justify-between">
                    <span>Invoice: <strong>{receiptModalData.invoice_number}</strong></span>
                    <span>Table: <strong>{receiptModalData.table_number}</strong></span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Customer: <strong>{receiptModalData.customer_name || 'Guest'}</strong></span>
                  </div>
                  {receiptModalData.customer_phone && (
                    <div className="flex justify-between text-slate-600">
                      <span>Mobile: {receiptModalData.customer_phone}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>Date: {receiptModalData.paid_at}</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Mode: <strong className="uppercase">{receiptModalData.payment_method}</strong></span>
                    <span className="text-emerald-700 font-bold">PAID ✓</span>
                  </div>
                </div>

                {/* Items List */}
                <div className="space-y-1 border-b border-slate-300 pb-2">
                  {receiptModalData.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between text-[11px]">
                      <span className="truncate pr-2">{item.quantity}× {item.item_name}</span>
                      <span className="shrink-0 font-semibold">₹{parseFloat(item.total_price).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="space-y-1 text-[11px] border-b border-slate-300 pb-2">
                  <div className="flex justify-between text-slate-600">
                    <span>Subtotal:</span>
                    <span>₹{receiptModalData.subtotal.toFixed(2)}</span>
                  </div>
                  {receiptModalData.discount_amount > 0 && (
                    <div className="flex justify-between text-emerald-600">
                      <span>Discount:</span>
                      <span>-₹{receiptModalData.discount_amount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-slate-600">
                    <span>GST ({receiptModalData.tax_rate}%):</span>
                    <span>₹{receiptModalData.tax_amount.toFixed(2)}</span>
                  </div>
                  {receiptModalData.tip_amount > 0 && (
                    <div className="flex justify-between text-slate-600">
                      <span>Tip:</span>
                      <span>₹{receiptModalData.tip_amount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-sm text-slate-900 pt-1 border-t border-slate-300">
                    <span>TOTAL PAID:</span>
                    <span>₹{receiptModalData.grand_total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="text-center text-[10px] text-slate-500 pt-1">
                  <p>Thank you for dining with us!</p>
                  <p>Please visit again.</p>
                </div>
              </div>

              {/* Right: Thank You SMS & WhatsApp Notification Trigger (Screen Only) */}
              <div className="space-y-4 print:hidden">
                <div className="p-4 rounded-xl bg-slate-950 border border-emerald-500/30 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 uppercase">
                      <MessageSquare className="w-4 h-4" />
                      <span>Thank You SMS Dispatched</span>
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                      SENT ✓
                    </span>
                  </div>

                  <div className="text-xs text-slate-300">
                    <p>To: <strong className="text-white">{receiptModalData.customer_name || 'Guest'}</strong> ({receiptModalData.customer_phone || 'Customer Phone'})</p>
                  </div>

                  {/* SMS Bubble */}
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 whitespace-pre-line font-sans leading-relaxed shadow-inner">
                    {receiptModalData.sms_notification?.message_text || (
                      `Dear ${receiptModalData.customer_name || 'Guest'}, thank you for dining with us at RestroOps Gourmet! 🍽️\n\n📄 Invoice: ${receiptModalData.invoice_number}\n🪑 Table: ${receiptModalData.table_number}\n💳 Amount Paid: ₹${receiptModalData.grand_total.toFixed(2)} (${receiptModalData.payment_method.toUpperCase()})\n\nWe hope you had a wonderful culinary experience! Looking forward to welcoming you again soon. ✨`
                    )}
                  </div>

                  {/* Action Triggers: Copy, WhatsApp, SMS */}
                  <div className="space-y-2 pt-1">
                    <div className="grid grid-cols-2 gap-2">
                      {/* WhatsApp Direct Share */}
                      {receiptModalData.customer_phone ? (
                        <a
                          href={`https://wa.me/${getCleanPhone(receiptModalData.customer_phone)}?text=${encodeURIComponent(receiptModalData.sms_notification?.message_text || '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm text-center"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </a>
                      ) : (
                        <button
                          onClick={() => alert('No mobile number was entered for this order.')}
                          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-800 text-slate-400 text-xs font-bold"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </button>
                      )}

                      {/* Native SMS Trigger */}
                      {receiptModalData.customer_phone ? (
                        <a
                          href={`sms:${getCleanPhone(receiptModalData.customer_phone)}?body=${encodeURIComponent(receiptModalData.sms_notification?.message_text || '')}`}
                          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition-all shadow-sm text-center"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Direct SMS</span>
                        </a>
                      ) : (
                        <button
                          onClick={() => alert('No mobile number was entered for this order.')}
                          className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-800 text-slate-400 text-xs font-bold"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span>Direct SMS</span>
                        </button>
                      )}
                    </div>

                    {/* Copy SMS text */}
                    <button
                      onClick={() => handleCopySms(receiptModalData.sms_notification?.message_text || '')}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all border border-slate-700"
                    >
                      {copiedSms ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-emerald-400">Message Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5 text-slate-400" />
                          <span>Copy Thank You Message</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Print and Close controls */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => window.print()}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold transition-all shadow-md shadow-orange-500/20"
                  >
                    <Printer className="w-4 h-4" />
                    <span>Print Receipt</span>
                  </button>
                  <button
                    onClick={() => setReceiptModalData(null)}
                    className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all"
                  >
                    Close
                  </button>
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
