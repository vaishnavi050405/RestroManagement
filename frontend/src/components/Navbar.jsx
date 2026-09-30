import React from 'react';
import { 
  LayoutGrid, 
  ShoppingBag, 
  ChefHat, 
  Receipt, 
  UtensilsCrossed, 
  BarChart3, 
  RefreshCw,
  Clock,
  CircleDot
} from 'lucide-react';

export default function Navbar({ activeTab, setActiveTab, stats, onRefresh, isRefreshing }) {
  const navItems = [
    { id: 'tables', label: 'Tables & Floor', icon: LayoutGrid, count: stats?.tables?.occupied ? `${stats.tables.occupied}/${stats.tables.total}` : null },
    { id: 'pos', label: 'Take Order (POS)', icon: ShoppingBag },
    { id: 'kitchen', label: 'Kitchen (KDS)', icon: ChefHat, badge: stats?.orders?.kitchen_pending_items || null, badgeColor: 'bg-amber-500' },
    { id: 'billing', label: 'Billing & Cashier', icon: Receipt, badge: stats?.orders?.active_count || null, badgeColor: 'bg-emerald-500' },
    { id: 'menu', label: 'Menu & Stock', icon: UtensilsCrossed },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <header className="sticky top-0 z-40 w-full bg-slate-900/90 backdrop-blur-md border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center shadow-lg shadow-orange-500/20">
              <UtensilsCrossed className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg text-white tracking-tight">Restro<span className="text-orange-500">Ops</span></span>
                <span className="px-1.5 py-0.5 rounded text-[10px] font-bold uppercase bg-orange-500/20 text-orange-400 border border-orange-500/30">PRO</span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">Operations & POS Manager</p>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1.5 overflow-x-auto py-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all relative ${
                    isActive
                      ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                  {item.badge !== null && item.badge > 0 && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold text-white ${item.badgeColor || 'bg-orange-500'}`}>
                      {item.badge}
                    </span>
                  )}
                  {item.count && (
                    <span className="text-[11px] text-slate-400 bg-slate-800/80 px-1.5 py-0.5 rounded">
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Header Stats & Refresh */}
          <div className="flex items-center gap-3 shrink-0">
            {/* Live occupancy chip */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="text-slate-400">Occupancy:</span>
              <span className="font-bold text-white">{stats?.tables?.occupancy_rate || 0}%</span>
            </div>

            {/* Daily revenue chip */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/60 text-xs">
              <span className="text-slate-400">Sales:</span>
              <span className="font-bold text-emerald-400">₹{stats?.revenue?.today_total ? stats.revenue.today_total.toLocaleString() : '0'}</span>
            </div>

            {/* Refresh Button */}
            <button
              onClick={onRefresh}
              disabled={isRefreshing}
              title="Refresh Data"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-orange-400' : ''}`} />
            </button>
          </div>
        </div>

        {/* Mobile Sub-Navigation */}
        <div className="flex md:hidden items-center gap-1 pb-3 overflow-x-auto no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap ${
                  isActive
                    ? 'bg-orange-500 text-white'
                    : 'text-slate-400 bg-slate-800/60 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
                {item.badge !== null && item.badge > 0 && (
                  <span className="px-1 py-0.2 rounded-full text-[9px] bg-red-500 text-white font-bold">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
}
