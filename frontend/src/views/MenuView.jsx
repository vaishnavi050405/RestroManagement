import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Search, 
  Clock, 
  Trash2, 
  Edit3, 
  ToggleLeft, 
  ToggleRight, 
  UtensilsCrossed, 
  Sparkles,
  X,
  Check
} from 'lucide-react';
import { menuApi } from '../api';

export default function MenuView() {
  const [categories, setCategories] = useState([]);
  const [activeCategoryId, setActiveCategoryId] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dietFilter, setDietFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  // Add/Edit Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({
    category_id: 1,
    name: '',
    description: '',
    price: '',
    is_veg: 1,
    is_available: 1,
    prep_time_mins: 15,
    image_url: ''
  });

  useEffect(() => {
    fetchMenuData();
  }, []);

  const fetchMenuData = async () => {
    try {
      setLoading(true);
      const res = await menuApi.getMenu();
      if (res.data.success) {
        setCategories(res.data.data);
      }
    } catch (err) {
      console.error('Error fetching menu:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAvailability = async (item) => {
    try {
      const nextVal = item.is_available === 1 ? 0 : 1;
      await menuApi.toggleAvailability(item.id, nextVal);
      await fetchMenuData();
    } catch (err) {
      alert('Failed to update item availability');
    }
  };

  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormData({
      category_id: categories.length > 0 ? categories[0].id : 1,
      name: '',
      description: '',
      price: '',
      is_veg: 1,
      is_available: 1,
      prep_time_mins: 15,
      image_url: ''
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (item) => {
    setEditingItem(item);
    setFormData({
      category_id: item.category_id,
      name: item.name,
      description: item.description || '',
      price: item.price,
      is_veg: item.is_veg,
      is_available: item.is_available,
      prep_time_mins: item.prep_time_mins || 15,
      image_url: item.image_url || ''
    });
    setIsModalOpen(true);
  };

  const handleSubmitItem = async (e) => {
    e.preventDefault();
    try {
      if (editingItem) {
        await menuApi.updateItem(editingItem.id, formData);
      } else {
        await menuApi.createItem(formData);
      }
      setIsModalOpen(false);
      await fetchMenuData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save menu item');
    }
  };

  const handleDeleteItem = async (item) => {
    if (!window.confirm(`Are you sure you want to delete ${item.name}?`)) return;
    try {
      await menuApi.deleteItem(item.id);
      await fetchMenuData();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete item');
    }
  };

  // Flatten and filter items
  const allItems = categories.flatMap(cat => 
    (cat.items || []).map(i => ({ ...i, category_name: cat.name }))
  );

  const filteredItems = allItems.filter(item => {
    const matchCat = activeCategoryId === 'all' || item.category_id === activeCategoryId;
    const matchSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        item.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchDiet = dietFilter === 'all' || 
                      (dietFilter === 'veg' && item.is_veg === 1) || 
                      (dietFilter === 'non-veg' && item.is_veg === 0);
    return matchCat && matchSearch && matchDiet;
  });

  return (
    <div className="space-y-6">
      
      {/* Header & Add Button */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-900/80 border border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 border border-orange-500/30 flex items-center justify-center">
            <UtensilsCrossed className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
              Menu & Inventory Manager
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                {allItems.length} Total Items
              </span>
            </h2>
            <p className="text-xs text-slate-400">Configure prices, availability toggles, and recipe prep times</p>
          </div>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-xs shadow-lg shadow-orange-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Dish</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search items by name or ingredients..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-white text-sm focus:outline-none focus:border-orange-500 placeholder-slate-500"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveCategoryId('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
              activeCategoryId === 'all' ? 'bg-orange-500 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'
            }`}
          >
            All Categories
          </button>
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setActiveCategoryId(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-all ${
                activeCategoryId === c.id ? 'bg-orange-500 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'
              }`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </div>

      {/* Menu Grid Table / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredItems.map(item => {
          const isAvailable = item.is_available === 1;

          return (
            <div
              key={item.id}
              className={`p-4 rounded-xl bg-slate-900/90 border transition-all ${
                isAvailable ? 'border-slate-800 hover:border-slate-700' : 'border-rose-950/60 bg-slate-950/80 opacity-70'
              }`}
            >
              <div className="flex gap-3">
                {/* Image */}
                {item.image_url && (
                  <img
                    src={item.image_url}
                    alt={item.name}
                    className="w-20 h-20 rounded-lg object-cover bg-slate-800 shrink-0"
                  />
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 truncate">
                      <span className={`w-2 h-2 rounded-full shrink-0 ${item.is_veg ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                      <h4 className="font-bold text-sm text-white truncate">{item.name}</h4>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2 mt-0.5">{item.description}</p>

                  <div className="flex items-center gap-2 mt-2">
                    <span className="font-mono text-sm font-bold text-white">₹{parseFloat(item.price).toFixed(2)}</span>
                    <span className="text-[10px] text-slate-400 px-1.5 py-0.5 rounded bg-slate-800">
                      {item.prep_time_mins || 15} mins
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between">
                {/* Stock Toggle */}
                <button
                  onClick={() => handleToggleAvailability(item)}
                  className={`flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-lg transition-all ${
                    isAvailable
                      ? 'bg-emerald-950/50 text-emerald-400 border border-emerald-800/40 hover:bg-rose-950/50 hover:text-rose-400 hover:border-rose-800/40'
                      : 'bg-rose-950/50 text-rose-400 border border-rose-800/40 hover:bg-emerald-950/50 hover:text-emerald-400 hover:border-emerald-800/40'
                  }`}
                >
                  <span className={`w-1.5 h-1.5 rounded-full ${isAvailable ? 'bg-emerald-400' : 'bg-rose-400'}`}></span>
                  <span>{isAvailable ? 'In Stock (Live)' : 'Out of Stock'}</span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEditModal(item)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all"
                    title="Edit Item"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDeleteItem(item)}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400 transition-all"
                    title="Delete Item"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Dish Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-lg font-bold text-white">
                {editingItem ? `Edit Dish: ${editingItem.name}` : 'Add New Dish to Menu'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitItem} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Category</label>
                <select
                  value={formData.category_id}
                  onChange={e => setFormData({ ...formData, category_id: parseInt(e.target.value, 10) })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs font-semibold focus:outline-none focus:border-orange-500"
                >
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Dish / Item Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Paneer Lababdar, Chicken Wings"
                  value={formData.name}
                  onChange={e => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-orange-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Description / Ingredients</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Fresh cottage cheese simmered in spiced cashew tomato gravy"
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="350.00"
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Prep Time (Mins)</label>
                  <input
                    type="number"
                    value={formData.prep_time_mins}
                    onChange={e => setFormData({ ...formData, prep_time_mins: e.target.value })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Food Preference</label>
                  <select
                    value={formData.is_veg}
                    onChange={e => setFormData({ ...formData, is_veg: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none"
                  >
                    <option value={1}>🟢 Vegetarian</option>
                    <option value={0}>🔴 Non-Vegetarian</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Initial Availability</label>
                  <select
                    value={formData.is_available}
                    onChange={e => setFormData({ ...formData, is_available: parseInt(e.target.value, 10) })}
                    className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none"
                  >
                    <option value={1}>In Stock</option>
                    <option value={0}>Out of Stock</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Image URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/photo-..."
                  value={formData.image_url}
                  onChange={e => setFormData({ ...formData, image_url: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg bg-slate-800 border border-slate-700 text-white text-xs focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-md shadow-orange-500/20"
                >
                  {editingItem ? 'Save Changes' : 'Add to Menu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
