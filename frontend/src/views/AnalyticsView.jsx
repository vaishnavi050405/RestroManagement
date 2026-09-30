import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Receipt, 
  CreditCard, 
  Flame, 
  CheckCircle2, 
  Clock,
  Sparkles
} from 'lucide-react';
import { analyticsApi } from '../api';

export default function AnalyticsView() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    try {
      setLoading(true);
      const res = await analyticsApi.getOverview();
      if (res.data.success) {
        setData(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !data) {
    return (
      <div className="text-center py-20 text-slate-400">
        <BarChart3 className="w-10 h-10 mx-auto animate-pulse text-orange-500 mb-2" />
        <p>Loading restaurant analytics...</p>
      </div>
    );
  }

  const { tables, revenue, top_items } = data;

  return (
    <div className="space-y-6">
      
      {/* Top Banner */}
      <div className="flex items-center justify-between p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white tracking-tight">Operations & Revenue Analytics</h2>
            <p className="text-xs text-slate-400">Real-time table turnover, sales volume, and dish demand metrics</p>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Today's Sales */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Today's Revenue</span>
            <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-white font-mono mt-2">
            ₹{parseFloat(revenue.today_total || 0).toLocaleString()}
          </p>
          <p className="text-xs text-emerald-400">From {revenue.total_bills || 0} completed invoices</p>
        </div>

        {/* Average Ticket Size */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Avg Ticket Size</span>
            <span className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Receipt className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-white font-mono mt-2">
            ₹{parseFloat(revenue.average_ticket_size || 0).toFixed(2)}
          </p>
          <p className="text-xs text-amber-400">Average spend per table</p>
        </div>

        {/* Table Occupancy Rate */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">Floor Occupancy</span>
            <span className="p-2 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20">
              <Users className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-white font-mono mt-2">
            {tables.occupancy_rate}%
          </p>
          <p className="text-xs text-orange-400">{tables.occupied} of {tables.total} tables seated</p>
        </div>

        {/* Live Active Line */}
        <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase">KDS Active Line</span>
            <span className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Flame className="w-4 h-4" />
            </span>
          </div>
          <p className="text-2xl font-black text-white font-mono mt-2">
            {data.orders.kitchen_pending_items} Dishes
          </p>
          <p className="text-xs text-purple-400">Across {data.orders.active_count} active tickets</p>
        </div>

      </div>

      {/* Analytics Breakdown Grids */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top 5 Popular Dishes */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-orange-400" />
              <span>Top Selling Dishes</span>
            </h3>
            <span className="text-xs text-slate-400">By quantity ordered</span>
          </div>

          <div className="space-y-3">
            {top_items.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No orders registered yet.</p>
            ) : (
              top_items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-orange-500/20 text-orange-400 font-bold text-xs flex items-center justify-center font-mono">
                      #{idx + 1}
                    </span>
                    <span className="font-semibold text-xs text-white">{item.name}</span>
                  </div>
                  <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/40 px-2.5 py-1 rounded-lg border border-emerald-800/30">
                    {item.count} orders
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Section Occupancy Breakdown */}
        <div className="p-6 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-orange-400" />
              <span>Section Capacity & Occupancy</span>
            </h3>
            <span className="text-xs text-slate-400">Live floor distribution</span>
          </div>

          <div className="space-y-3">
            {Object.entries(tables.by_section || {}).map(([secName, secData]) => {
              const secOccupancyPct = secData.total > 0 ? Math.round((secData.occupied / secData.total) * 100) : 0;

              return (
                <div key={secName} className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-2">
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <span className="text-white">{secName}</span>
                    <span className="text-slate-400 font-mono">
                      {secData.occupied} / {secData.total} Tables ({secOccupancyPct}%)
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full h-2 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-orange-500 to-amber-500 rounded-full transition-all duration-500"
                      style={{ width: `${secOccupancyPct}%` }}
                    ></div>
                  </div>

                  <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-1">
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> {secData.available || 0} Free
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> {secData.occupied || 0} Occupied
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> {secData.reserved || 0} Reserved
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> {secData.cleaning || 0} Cleaning
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
