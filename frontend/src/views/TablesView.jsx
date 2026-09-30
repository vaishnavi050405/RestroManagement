import React, { useState } from 'react';
import { 
  Users, 
  Clock, 
  Sparkles, 
  Plus, 
  ShoppingBag, 
  Receipt, 
  CheckCircle2, 
  BookmarkCheck, 
  Trash2, 
  Edit3,
  X,
  AlertCircle
} from 'lucide-react';
import { tablesApi } from '../api';

export default function TablesView({ 
  tables = [], 
  onRefresh, 
  onSelectTableForOrder, 
  onSelectTableForBilling,
  onNavigateToKitchen
}) {
  const [selectedSection, setSelectedSection] = useState('All');
  const [selectedStatus, setSelectedStatus] = useState('All');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [tableForm, setTableForm] = useState({ table_number: '', capacity: 4, section: 'Main Dining' });
  const [loadingAction, setLoadingAction] = useState(null);

  // Extract unique sections
  const sections = ['All', ...new Set(tables.map(t => t.section))];
  const statuses = ['All', 'available', 'occupied', 'reserved', 'cleaning'];

  // Filtered tables
  const filteredTables = tables.filter(t => {
    const matchSection = selectedSection === 'All' || t.section === selectedSection;
    const matchStatus = selectedStatus === 'All' || t.status === selectedStatus;
    return matchSection && matchStatus;
  });

  // Count stats
  const stats = {
    total: tables.length,
    available: tables.filter(t => t.status === 'available').length,
    occupied: tables.filter(t => t.status === 'occupied').length,
    reserved: tables.filter(t => t.status === 'reserved').length,
    cleaning: tables.filter(t => t.status === 'cleaning').length,
  };

  // Quick status update handler
  const handleStatusChange = async (tableId, newStatus) => {
    try {
      setLoadingAction(tableId);
      await tablesApi.updateStatus(tableId, newStatus);
      await onRefresh();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update table status');
    } finally {
      setLoadingAction(null);
    }
  };

  // Add table handler
  const handleAddTable = async (e) => {
    e.preventDefault();
    if (!tableForm.table_number.trim()) return;
    try {
      await tablesApi.create(tableForm);
      setIsAddModalOpen(false);
      setTableForm({ table_number: '', capacity: 4, section: 'Main Dining' });
      await onRefresh();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to add table');
    }
  };

  // Delete table handler
  const handleDeleteTable = async (tableId, tableNum) => {
    if (!window.confirm(`Are you sure you want to remove table ${tableNum}?`)) return;
    try {
      await tablesApi.delete(tableId);
      await onRefresh();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete table');
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'available':
        return {
          label: 'Available',
          badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          dotClass: 'bg-emerald-500',
          cardBorder: 'hover:border-emerald-500/50'
        };
      case 'occupied':
        return {
          label: 'Occupied',
          badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
          dotClass: 'bg-rose-500 animate-pulse',
          cardBorder: 'border-rose-500/30'
        };
      case 'reserved':
        return {
          label: 'Reserved',
          badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          dotClass: 'bg-amber-500',
          cardBorder: 'border-amber-500/30'
        };
      case 'cleaning':
        return {
          label: 'Cleaning',
          badgeClass: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
          dotClass: 'bg-purple-500',
          cardBorder: 'border-purple-500/30'
        };
      default:
        return {
          label: status,
          badgeClass: 'bg-slate-700 text-slate-300 border-slate-600',
          dotClass: 'bg-slate-400',
          cardBorder: 'border-slate-700'
        };
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Banner & Quick Counters */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 lg:gap-4">
        
        <div 
          onClick={() => setSelectedStatus('available')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            selectedStatus === 'available' 
              ? 'bg-emerald-950/40 border-emerald-500/60 ring-1 ring-emerald-500/40' 
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Available</span>
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm shadow-emerald-500/50"></div>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{stats.available}</p>
          <p className="text-xs text-emerald-400 mt-0.5">Ready for guests</p>
        </div>

        <div 
          onClick={() => setSelectedStatus('occupied')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            selectedStatus === 'occupied' 
              ? 'bg-rose-950/40 border-rose-500/60 ring-1 ring-rose-500/40' 
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Occupied</span>
            <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse"></div>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{stats.occupied}</p>
          <p className="text-xs text-rose-400 mt-0.5">Dining in progress</p>
        </div>

        <div 
          onClick={() => setSelectedStatus('reserved')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            selectedStatus === 'reserved' 
              ? 'bg-amber-950/40 border-amber-500/60 ring-1 ring-amber-500/40' 
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Reserved</span>
            <div className="w-2.5 h-2.5 rounded-full bg-amber-500"></div>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{stats.reserved}</p>
          <p className="text-xs text-amber-400 mt-0.5">Booked slots</p>
        </div>

        <div 
          onClick={() => setSelectedStatus('cleaning')}
          className={`cursor-pointer p-4 rounded-xl border transition-all ${
            selectedStatus === 'cleaning' 
              ? 'bg-purple-950/40 border-purple-500/60 ring-1 ring-purple-500/40' 
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cleaning</span>
            <div className="w-2.5 h-2.5 rounded-full bg-purple-500"></div>
          </div>
          <p className="mt-2 text-2xl font-bold text-white">{stats.cleaning}</p>
          <p className="text-xs text-purple-400 mt-0.5">Needs turnover</p>
        </div>

      </div>

      {/* Filter Toolbar & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-900/70 border border-slate-800">
        
        {/* Section Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <span className="text-xs text-slate-400 font-semibold mr-1 shrink-0">Section:</span>
          {sections.map(section => (
            <button
              key={section}
              onClick={() => setSelectedSection(section)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedSection === section
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {section}
            </button>
          ))}
        </div>

        {/* Right controls */}
        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-between sm:justify-end">
          {selectedStatus !== 'All' && (
            <button
              onClick={() => setSelectedStatus('All')}
              className="text-xs text-slate-400 hover:text-white underline"
            >
              Clear status filter
            </button>
          )}

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold text-xs hover:from-orange-600 hover:to-amber-600 transition-all shadow-md shadow-orange-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Add Table</span>
          </button>
        </div>
      </div>

      {/* Tables Grid Layout */}
      {filteredTables.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/40 rounded-2xl border border-dashed border-slate-800">
          <AlertCircle className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white">No tables match current filters</h3>
          <p className="text-sm text-slate-400 mt-1">Try switching sections or resetting status filter.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredTables.map(table => {
            const statusConfig = getStatusBadge(table.status);
            const isOccupied = table.status === 'occupied';
            const isAvailable = table.status === 'available';
            const isReserved = table.status === 'reserved';
            const isCleaning = table.status === 'cleaning';

            return (
              <div
                key={table.id}
                className={`relative flex flex-col justify-between p-4 rounded-xl bg-slate-900/80 border transition-all duration-200 ${statusConfig.cardBorder} hover:shadow-xl hover:shadow-black/40`}
              >
                {/* Header: Table Number & Status Badge */}
                <div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xl font-black text-white tracking-tight">{table.table_number}</span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5 text-slate-500" />
                        {table.capacity}
                      </span>
                    </div>

                    <span className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-semibold border ${statusConfig.badgeClass}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dotClass}`}></span>
                      {statusConfig.label}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400 mt-1 font-medium">{table.section}</p>

                  {/* Occupied State Details */}
                  {isOccupied && table.order_info && (
                    <div className="mt-3 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-slate-300">
                        <span className="font-semibold text-white">{table.order_info.customer_name || 'Guest'}</span>
                        <span className="font-mono text-orange-400 font-bold">₹{table.order_info.grand_total}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>{table.order_info.order_number}</span>
                        <span className="capitalize px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                          {table.order_info.status?.replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Reserved Info */}
                  {isReserved && (
                    <div className="mt-3 p-2.5 rounded-lg bg-amber-950/30 border border-amber-800/40 text-xs text-amber-300 flex items-center gap-2">
                      <BookmarkCheck className="w-4 h-4 text-amber-400 shrink-0" />
                      <span>Reserved for booked guests</span>
                    </div>
                  )}

                  {/* Cleaning Info */}
                  {isCleaning && (
                    <div className="mt-3 p-2.5 rounded-lg bg-purple-950/30 border border-purple-800/40 text-xs text-purple-300 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-purple-400 shrink-0" />
                      <span>Being sanitized for next seating</span>
                    </div>
                  )}
                </div>

                {/* Bottom Action Buttons */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex flex-col gap-1.5">
                  {isAvailable && (
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => onSelectTableForOrder(table)}
                        className="col-span-2 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold transition-all shadow-sm"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Start Order</span>
                      </button>
                      <button
                        onClick={() => handleStatusChange(table.id, 'reserved')}
                        className="py-1 px-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-all"
                      >
                        Reserve
                      </button>
                      <button
                        onClick={() => handleStatusChange(table.id, 'cleaning')}
                        className="py-1 px-2 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-medium transition-all"
                      >
                        Cleaning
                      </button>
                    </div>
                  )}

                  {isOccupied && (
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => onSelectTableForBilling(table)}
                        className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Bill & Pay</span>
                      </button>
                      <button
                        onClick={() => onSelectTableForOrder(table)}
                        className="flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all"
                      >
                        <Plus className="w-3.5 h-3.5 text-orange-400" />
                        <span>Add Items</span>
                      </button>
                    </div>
                  )}

                  {isCleaning && (
                    <button
                      onClick={() => handleStatusChange(table.id, 'available')}
                      className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Ready / Cleaned (Free Table)</span>
                    </button>
                  )}

                  {isReserved && (
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        onClick={() => onSelectTableForOrder(table)}
                        className="py-1.5 px-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-semibold"
                      >
                        Seat & Order
                      </button>
                      <button
                        onClick={() => handleStatusChange(table.id, 'available')}
                        className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium"
                      >
                        Cancel Res.
                      </button>
                    </div>
                  )}

                  {/* Delete option */}
                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => handleDeleteTable(table.id, table.table_number)}
                      title="Delete Table"
                      className="text-slate-600 hover:text-rose-400 text-[10px] p-1 transition-all"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add New Table Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Add New Table</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTable} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Table Number / Identifier</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. T-07, ROOF-04, P-05"
                  value={tableForm.table_number}
                  onChange={e => setTableForm({ ...tableForm, table_number: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Seating Capacity</label>
                <select
                  value={tableForm.capacity}
                  onChange={e => setTableForm({ ...tableForm, capacity: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500 text-sm"
                >
                  <option value={2}>2 Guests</option>
                  <option value={4}>4 Guests</option>
                  <option value={6}>6 Guests</option>
                  <option value={8}>8 Guests</option>
                  <option value={10}>10+ Large Group</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Floor Section</label>
                <select
                  value={tableForm.section}
                  onChange={e => setTableForm({ ...tableForm, section: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-lg bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-orange-500 text-sm"
                >
                  <option value="Main Dining">Main Dining</option>
                  <option value="Family Section">Family Section</option>
                  <option value="Patio Garden">Patio Garden</option>
                  <option value="Rooftop Lounge">Rooftop Lounge</option>
                  <option value="Bar Counter">Bar Counter</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-sm font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-sm font-semibold shadow-md shadow-orange-500/20"
                >
                  Create Table
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
