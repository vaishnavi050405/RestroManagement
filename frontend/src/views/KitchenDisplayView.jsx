import React, { useState, useEffect } from 'react';
import { 
  ChefHat, 
  Clock, 
  CheckCircle, 
  Flame, 
  AlertTriangle, 
  RefreshCw, 
  CheckCheck, 
  Sparkles,
  Utensils,
  BellRing
} from 'lucide-react';
import { kitchenApi } from '../api';

export default function KitchenDisplayView({ onRefreshAll }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, preparing, ready

  useEffect(() => {
    fetchKitchenQueue();
    // Live polling every 10 seconds for kitchen updates
    const interval = setInterval(fetchKitchenQueue, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchKitchenQueue = async () => {
    try {
      const res = await kitchenApi.getQueue();
      if (res.data.success) {
        setTickets(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching kitchen queue:', err);
    } finally {
      setLoading(false);
    }
  };

  // Update single item status
  const handleUpdateItemStatus = async (itemId, nextStatus) => {
    try {
      await kitchenApi.updateItemStatus(itemId, nextStatus);
      await fetchKitchenQueue();
      if (onRefreshAll) onRefreshAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update item status');
    }
  };

  // Batch update entire ticket status
  const handleBatchTicketStatus = async (orderId, targetStatus) => {
    try {
      await kitchenApi.updateTicketStatus(orderId, targetStatus);
      await fetchKitchenQueue();
      if (onRefreshAll) onRefreshAll();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update ticket status');
    }
  };

  // Urgency classification based on elapsed minutes
  const getUrgencyConfig = (minutes) => {
    if (minutes > 20) {
      return {
        badgeClass: 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse',
        cardBorder: 'border-rose-500/60 shadow-rose-950/40',
        label: 'Delayed'
      };
    }
    if (minutes > 10) {
      return {
        badgeClass: 'bg-amber-500/20 text-amber-400 border-amber-500/40',
        cardBorder: 'border-amber-500/40 shadow-amber-950/30',
        label: 'In Progress'
      };
    }
    return {
      badgeClass: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40',
      cardBorder: 'border-slate-800',
      label: 'Fresh'
    };
  };

  // Next status progression helper
  const getNextStatus = (current) => {
    switch (current) {
      case 'pending': return 'preparing';
      case 'preparing': return 'ready';
      case 'ready': return 'served';
      default: return 'served';
    }
  };

  const filteredTickets = tickets.filter(t => {
    if (filter === 'preparing') return t.status === 'kitchen_processing' || t.status === 'active';
    if (filter === 'ready') return t.status === 'ready_to_serve';
    return true;
  });

  const totalPendingItems = tickets.reduce((acc, t) => 
    acc + t.items.filter(i => ['pending', 'preparing'].includes(i.item_status)).length, 0
  );

  return (
    <div className="space-y-6">
      
      {/* KDS Header & Stats */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
              Kitchen Display System (KDS)
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-orange-500 text-white">
                {tickets.length} Active Tickets
              </span>
            </h2>
            <p className="text-xs text-slate-400">Real-time order line & cook times</p>
          </div>
        </div>

        {/* Filters and Actions */}
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          <div className="flex items-center p-1 rounded-xl bg-slate-950 border border-slate-800">
            <button
              onClick={() => setFilter('all')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                filter === 'all' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({tickets.length})
            </button>
            <button
              onClick={() => setFilter('preparing')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                filter === 'preparing' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Cooking
            </button>
            <button
              onClick={() => setFilter('ready')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                filter === 'ready' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Ready to Serve
            </button>
          </div>

          <button
            onClick={fetchKitchenQueue}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-all"
            title="Refresh Tickets"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tickets Board */}
      {filteredTickets.length === 0 ? (
        <div className="text-center py-20 bg-slate-900/40 rounded-3xl border border-dashed border-slate-800">
          <div className="w-14 h-14 rounded-2xl bg-slate-800/80 text-emerald-400 flex items-center justify-center mx-auto mb-3">
            <CheckCheck className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-bold text-white">All Kitchen Orders Cleared!</h3>
          <p className="text-sm text-slate-400 mt-1">New incoming orders from POS will appear here automatically.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
          {filteredTickets.map(ticket => {
            const urgency = getUrgencyConfig(ticket.elapsed_minutes);
            const isAllReady = ticket.items.every(i => i.item_status === 'ready' || i.item_status === 'served');

            return (
              <div
                key={ticket.order_id}
                className={`flex flex-col justify-between rounded-2xl bg-slate-900/90 border ${urgency.cardBorder} shadow-xl overflow-hidden transition-all`}
              >
                {/* Ticket Top Header */}
                <div className="p-4 bg-slate-950/80 border-b border-slate-800">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-black text-white">{ticket.table_number}</span>
                      <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium capitalize">
                        {ticket.order_type.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Elapsed Time Badge */}
                    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${urgency.badgeClass}`}>
                      <Clock className="w-3.5 h-3.5" />
                      <span>{ticket.elapsed_minutes} mins ago</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between mt-2 text-xs text-slate-400">
                    <span>Order #{ticket.order_number}</span>
                    <span className="text-slate-300 font-semibold">{ticket.customer_name || 'Guest'}</span>
                  </div>

                  {ticket.notes && (
                    <div className="mt-2.5 p-2 rounded-lg bg-orange-950/30 border border-orange-800/40 text-xs text-orange-300 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                      <span className="line-clamp-2">{ticket.notes}</span>
                    </div>
                  )}
                </div>

                {/* Items Checklist */}
                <div className="p-4 space-y-3 divide-y divide-slate-800/60 flex-1">
                  {ticket.items.map((item, idx) => {
                    const isPending = item.item_status === 'pending';
                    const isPreparing = item.item_status === 'preparing';
                    const isReady = item.item_status === 'ready';
                    const isServed = item.item_status === 'served';

                    return (
                      <div key={item.id} className={`pt-3 first:pt-0 flex items-start justify-between gap-3 ${isServed ? 'opacity-40' : ''}`}>
                        <div className="flex items-start gap-2.5 flex-1">
                          {/* Quantity Badge */}
                          <span className="w-6 h-6 rounded-lg bg-orange-500/20 text-orange-400 border border-orange-500/30 font-mono font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                            {item.quantity}×
                          </span>

                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className={`w-2 h-2 rounded-full shrink-0 ${item.is_veg ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                              <span className={`text-sm font-bold text-white ${isReady ? 'line-through text-slate-400' : ''}`}>
                                {item.item_name}
                              </span>
                            </div>

                            {item.special_instructions && (
                              <p className="text-xs text-amber-300 mt-0.5 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40 font-medium">
                                👉 {item.special_instructions}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Status Toggle Button */}
                        <div className="shrink-0">
                          {isPending && (
                            <button
                              onClick={() => handleUpdateItemStatus(item.id, 'preparing')}
                              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500 text-amber-300 hover:text-white border border-amber-500/30 text-xs font-bold transition-all flex items-center gap-1"
                            >
                              <Flame className="w-3 h-3" />
                              <span>Start</span>
                            </button>
                          )}
                          {isPreparing && (
                            <button
                              onClick={() => handleUpdateItemStatus(item.id, 'ready')}
                              className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-white border border-emerald-500/30 text-xs font-bold transition-all flex items-center gap-1"
                            >
                              <CheckCircle className="w-3 h-3" />
                              <span>Ready</span>
                            </button>
                          )}
                          {isReady && (
                            <button
                              onClick={() => handleUpdateItemStatus(item.id, 'served')}
                              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all"
                            >
                              Serve
                            </button>
                          )}
                          {isServed && (
                            <span className="text-[11px] text-slate-500 font-semibold px-2 py-0.5 rounded bg-slate-900">
                              Served ✓
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Ticket Footer Actions */}
                <div className="p-3 bg-slate-950 border-t border-slate-800 grid grid-cols-2 gap-2">
                  {!isAllReady ? (
                    <button
                      onClick={() => handleBatchTicketStatus(ticket.order_id, 'ready')}
                      className="col-span-2 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-emerald-600/20"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Mark Entire Ticket Ready</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleBatchTicketStatus(ticket.order_id, 'served')}
                      className="col-span-2 py-2 px-3 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition-all shadow-md shadow-orange-500/20"
                    >
                      <CheckCheck className="w-4 h-4" />
                      <span>Mark Ticket Served</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
