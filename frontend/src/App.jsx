import React, { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import TablesView from './views/TablesView';
import PosOrderView from './views/PosOrderView';
import KitchenDisplayView from './views/KitchenDisplayView';
import BillingView from './views/BillingView';
import MenuView from './views/MenuView';
import AnalyticsView from './views/AnalyticsView';
import { tablesApi, analyticsApi } from './api';

export default function App() {
  const [activeTab, setActiveTab] = useState('tables');
  const [tables, setTables] = useState([]);
  const [stats, setStats] = useState(null);
  const [selectedTableForOrder, setSelectedTableForOrder] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchAllData();
    const interval = setInterval(fetchStatsOnly, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchAllData = async () => {
    try {
      setIsRefreshing(true);
      const [tablesRes, statsRes] = await Promise.all([
        tablesApi.getAll(),
        analyticsApi.getOverview()
      ]);
      if (tablesRes.data.success) setTables(tablesRes.data.data);
      if (statsRes.data.success) setStats(statsRes.data.data);
    } catch (err) {
      console.error('Error refreshing app data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const fetchStatsOnly = async () => {
    try {
      const statsRes = await analyticsApi.getOverview();
      if (statsRes.data.success) setStats(statsRes.data.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  // Navigations from table grid
  const handleSelectTableForOrder = (table) => {
    setSelectedTableForOrder(table);
    setActiveTab('pos');
  };

  const handleSelectTableForBilling = (table) => {
    setActiveTab('billing');
  };

  const handleOrderSuccess = async () => {
    setSelectedTableForOrder(null);
    await fetchAllData();
    setActiveTab('kitchen');
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-orange-500 selection:text-white">
      {/* Top Navbar with live badges */}
      <Navbar
        activeTab={activeTab}
        setActiveTab={(tab) => {
          if (tab !== 'pos') setSelectedTableForOrder(null);
          setActiveTab(tab);
        }}
        stats={stats}
        onRefresh={fetchAllData}
        isRefreshing={isRefreshing}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'tables' && (
          <TablesView
            tables={tables}
            onRefresh={fetchAllData}
            onSelectTableForOrder={handleSelectTableForOrder}
            onSelectTableForBilling={handleSelectTableForBilling}
            onNavigateToKitchen={() => setActiveTab('kitchen')}
          />
        )}

        {activeTab === 'pos' && (
          <PosOrderView
            tables={tables}
            selectedTable={selectedTableForOrder}
            onOrderSuccess={handleOrderSuccess}
            onCancel={() => {
              setSelectedTableForOrder(null);
              setActiveTab('tables');
            }}
          />
        )}

        {activeTab === 'kitchen' && (
          <KitchenDisplayView onRefreshAll={fetchAllData} />
        )}

        {activeTab === 'billing' && (
          <BillingView
            tables={tables}
            onPaymentSuccess={fetchAllData}
            onRefreshAll={fetchAllData}
          />
        )}

        {activeTab === 'menu' && (
          <MenuView />
        )}

        {activeTab === 'analytics' && (
          <AnalyticsView />
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} RestroOps — Restaurant Operations & Kitchen Management Platform</p>
          <div className="flex items-center gap-3">
            <span className="text-slate-400 font-medium">Stack: React + Node.js + Express + MySQL</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
