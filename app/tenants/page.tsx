"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "../../components/AppLayout";
import { fetchTenants, createTenant, updateTenant } from "../actions";
import { Tenant, AbsentPeriod, RentHistory } from "../rent-model";
import { 
  Users, 
  Search, 
  Plus,
  MoreHorizontal,
  X,
  Calendar,
  Trash2
} from "lucide-react";

export default function TenantsPage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentTenant, setCurrentTenant] = useState<Partial<Tenant>>({});
  const [isSaving, setIsSaving] = useState(false);

  // Load Data
  async function loadData() {
    setIsLoading(true);
    try {
      const data = await fetchTenants();
      setTenants(data);
    } catch (error) {
      console.error("Failed to load tenants", error);
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  // Handlers
  const handleAddNew = () => {
    setCurrentTenant({
      status: 'active',
      weeklyRent: 0,
      absentPeriods: []
    });
    setIsEditing(false);
    setIsModalOpen(true);
  };

  const handleEdit = (tenant: Tenant) => {
    // Deep copy to avoid mutating state directly when editing nested arrays
    setCurrentTenant(JSON.parse(JSON.stringify(tenant)));
    setIsEditing(true);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      if (isEditing && currentTenant.id) {
        await updateTenant(currentTenant as Tenant);
      } else {
        await createTenant(currentTenant as Omit<Tenant, 'id'>);
      }
      await loadData();
      setIsModalOpen(false);
    } catch (error) {
      console.error("Failed to save tenant", error);
      alert("Failed to save tenant. Please check the console for details.");
    } finally {
      setIsSaving(false);
    }
  };

  const addAbsentPeriod = () => {
    const newPeriod: AbsentPeriod = {
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0],
      reason: 'Other',
      notes: ''
    };
    setCurrentTenant(prev => ({
      ...prev,
      absentPeriods: [...(prev.absentPeriods || []), newPeriod]
    }));
  };

  const removeAbsentPeriod = (index: number) => {
    setCurrentTenant(prev => ({
      ...prev,
      absentPeriods: prev.absentPeriods?.filter((_, i) => i !== index)
    }));
  };

  const updateAbsentPeriod = (index: number, field: keyof AbsentPeriod, value: any) => {
    setCurrentTenant(prev => {
      const newPeriods = [...(prev.absentPeriods || [])];
      newPeriods[index] = { ...newPeriods[index], [field]: value };
      return { ...prev, absentPeriods: newPeriods };
    });
  };

  const addRentHistoryItem = () => {
    const newItem: RentHistory = {
      weeklyRent: 0,
      effectiveDate: new Date().toISOString().split('T')[0]
    };
    setCurrentTenant(prev => ({
      ...prev,
      rentHistory: [...(prev.rentHistory || []), newItem]
    }));
  };

  const removeRentHistoryItem = (index: number) => {
    setCurrentTenant(prev => ({
      ...prev,
      rentHistory: prev.rentHistory?.filter((_, i) => i !== index)
    }));
  };

  const updateRentHistoryItem = (index: number, field: keyof RentHistory, value: any) => {
    setCurrentTenant(prev => {
      const newHistory = [...(prev.rentHistory || [])];
      newHistory[index] = { ...newHistory[index], [field]: value };
      return { ...prev, rentHistory: newHistory };
    });
  };

  const filteredTenants = tenants.filter(t => 
    (t.tenantName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.roomCode || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 h-full">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Tenants</h1>
            <p className="text-sm text-zinc-500 mt-1">Manage tenant information and contacts</p>
          </div>
          
          <button 
            onClick={handleAddNew}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus size={16} />
            Add Tenant
          </button>
        </div>

        <main className="flex-1">
          {/* Filters */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4 bg-white p-1 rounded-lg border border-zinc-200 shadow-sm">
               <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input 
                  type="text"
                  placeholder="Search tenants..."
                  className="h-9 w-64 rounded-md border-none bg-transparent pl-9 text-sm outline-none placeholder:text-zinc-400 focus:ring-0"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
                  <tr>
                    <th className="px-6 py-4">Tenant Name</th>
                    <th className="px-6 py-4">Sage ID</th>
                    <th className="px-6 py-4">Room</th>
                    <th className="px-6 py-4">Weekly Rent</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4">Assigned Staff</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-zinc-500">
                        Loading tenants...
                      </td>
                    </tr>
                  ) : filteredTenants.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-zinc-500">
                        No tenants found.
                      </td>
                    </tr>
                  ) : (
                    filteredTenants.map((t, idx) => (
                      <tr 
                        key={idx} 
                        className="hover:bg-zinc-50 transition-colors group cursor-pointer"
                        onClick={() => handleEdit(t)}
                      >
                        <td className="px-6 py-4 font-medium text-zinc-900">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-zinc-100 flex items-center justify-center text-zinc-500 text-xs font-bold">
                              {t.tenantName ? t.tenantName.substring(0, 2).toUpperCase() : "??"}
                            </div>
                            {t.tenantName}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-zinc-600 font-mono text-xs">
                          {t.sageId}
                        </td>
                        <td className="px-6 py-4 text-zinc-600">
                          <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600 ring-1 ring-inset ring-zinc-500/10">
                            {t.roomCode}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-zinc-600">
                          £{t.weeklyRent?.toFixed(2)}
                        </td>
                        <td className="px-6 py-4">
                           <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ring-1 ring-inset ${
                             t.status === 'active' 
                               ? 'bg-green-50 text-green-700 ring-green-600/20' 
                               : 'bg-zinc-100 text-zinc-600 ring-zinc-500/10'
                           }`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-zinc-600">
                          {t.staffName}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button className="text-zinc-400 hover:text-zinc-600 transition-colors">
                            <MoreHorizontal size={18} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
             <div className="border-t border-zinc-200 bg-zinc-50 px-6 py-4 flex items-center justify-between">
              <div className="text-xs text-zinc-500">
                Showing {filteredTenants.length} tenants
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Edit/Create Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 sm:p-6">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-xl flex flex-col">
            <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4 sticky top-0 bg-white z-10">
              <h2 className="text-lg font-semibold text-zinc-900">
                {isEditing ? 'Edit Tenant' : 'Add New Tenant'}
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-zinc-600 transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-8">
              {/* Basic Info */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-zinc-900 border-b border-zinc-100 pb-2">Basic Information</h3>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700">Tenant Name</label>
                    <input
                      type="text"
                      required
                      className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      value={currentTenant.tenantName || ''}
                      onChange={e => setCurrentTenant({...currentTenant, tenantName: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700">Sage ID (Unique)</label>
                    <input
                      type="text"
                      required
                      className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      value={currentTenant.sageId || ''}
                      onChange={e => setCurrentTenant({...currentTenant, sageId: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700">Room Code</label>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      value={currentTenant.roomCode || ''}
                      onChange={e => setCurrentTenant({...currentTenant, roomCode: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700">Staff Name</label>
                    <input
                      type="text"
                      className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      value={currentTenant.staffName || ''}
                      onChange={e => setCurrentTenant({...currentTenant, staffName: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700">Weekly Rent (£)</label>
                    <input
                      type="number"
                      step="0.01"
                      className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      value={currentTenant.weeklyRent || 0}
                      onChange={e => setCurrentTenant({...currentTenant, weeklyRent: parseFloat(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700">Status</label>
                    <select
                      className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      value={currentTenant.status || 'active'}
                      onChange={e => setCurrentTenant({...currentTenant, status: e.target.value as 'active' | 'inactive'})}
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="space-y-4">
                <h3 className="text-sm font-medium text-zinc-900 border-b border-zinc-100 pb-2">Payment Period</h3>
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-zinc-700">Start Date</label>
                    <input
                      type="date"
                      className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      value={currentTenant.startDate || ''}
                      onChange={e => setCurrentTenant({...currentTenant, startDate: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-700">End Date</label>
                    <input
                      type="date"
                      className="mt-1 block w-full rounded-md border-zinc-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      value={currentTenant.endDate || ''}
                      onChange={e => setCurrentTenant({...currentTenant, endDate: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Rent History */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                  <h3 className="text-sm font-medium text-zinc-900">Rent History (Adjustments)</h3>
                  <button
                    type="button"
                    onClick={addRentHistoryItem}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    <Plus size={14} /> Add Adjustment
                  </button>
                </div>
                
                {(!currentTenant.rentHistory || currentTenant.rentHistory.length === 0) && (
                  <p className="text-sm text-zinc-500 italic">No rent adjustments recorded. Using current weekly rent for all past dates.</p>
                )}

                <div className="space-y-3">
                  {currentTenant.rentHistory?.map((item, index) => (
                    <div key={index} className="flex flex-col sm:flex-row gap-3 items-start sm:items-end bg-zinc-50 p-3 rounded-lg border border-zinc-200">
                      <div className="flex-1 w-full sm:w-auto">
                        <label className="block text-xs font-medium text-zinc-500 mb-1">Effective Date</label>
                        <input
                          type="date"
                          className="block w-full rounded-md border-zinc-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                          value={item.effectiveDate}
                          onChange={e => updateRentHistoryItem(index, 'effectiveDate', e.target.value)}
                        />
                      </div>
                      <div className="flex-1 w-full sm:w-auto">
                        <label className="block text-xs font-medium text-zinc-500 mb-1">New Weekly Rent (£)</label>
                        <input
                          type="number"
                          step="0.01"
                          className="block w-full rounded-md border-zinc-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                          value={item.weeklyRent}
                          onChange={e => updateRentHistoryItem(index, 'weeklyRent', parseFloat(e.target.value))}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeRentHistoryItem(index)}
                        className="text-red-500 hover:text-red-700 p-2"
                        title="Remove adjustment"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Absent Periods */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-zinc-100 pb-2">
                  <h3 className="text-sm font-medium text-zinc-900">Absent Periods (Non-payment)</h3>
                  <button
                    type="button"
                    onClick={addAbsentPeriod}
                    className="text-sm text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                  >
                    <Plus size={14} /> Add Period
                  </button>
                </div>
                
                {(!currentTenant.absentPeriods || currentTenant.absentPeriods.length === 0) && (
                  <p className="text-sm text-zinc-500 italic">No absent periods recorded.</p>
                )}

                <div className="space-y-3">
                  {currentTenant.absentPeriods?.map((period, index) => (
                    <div key={index} className="flex flex-col sm:flex-row gap-3 items-start sm:items-end bg-zinc-50 p-3 rounded-lg border border-zinc-200">
                      <div className="flex-1 w-full sm:w-auto">
                        <label className="block text-xs font-medium text-zinc-500 mb-1">Start Date</label>
                        <input
                          type="date"
                          className="block w-full rounded-md border-zinc-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                          value={period.startDate}
                          onChange={e => updateAbsentPeriod(index, 'startDate', e.target.value)}
                        />
                      </div>
                      <div className="flex-1 w-full sm:w-auto">
                        <label className="block text-xs font-medium text-zinc-500 mb-1">End Date</label>
                        <input
                          type="date"
                          className="block w-full rounded-md border-zinc-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                          value={period.endDate}
                          onChange={e => updateAbsentPeriod(index, 'endDate', e.target.value)}
                        />
                      </div>
                      <div className="flex-1 w-full sm:w-auto">
                        <label className="block text-xs font-medium text-zinc-500 mb-1">Reason</label>
                        <select
                          className="block w-full rounded-md border-zinc-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                          value={period.reason}
                          onChange={e => updateAbsentPeriod(index, 'reason', e.target.value)}
                        >
                          <option value="Hospital">Hospital</option>
                          <option value="Respite">Respite</option>
                          <option value="Custody">Custody</option>
                          <option value="Travel">Travel</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div className="flex-[2] w-full sm:w-auto">
                        <label className="block text-xs font-medium text-zinc-500 mb-1">Notes</label>
                        <input
                          type="text"
                          placeholder="Details..."
                          className="block w-full rounded-md border-zinc-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 text-sm"
                          value={period.notes || ''}
                          onChange={e => updateAbsentPeriod(index, 'notes', e.target.value)}
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAbsentPeriod(index)}
                        className="text-red-500 hover:text-red-700 p-2"
                        title="Remove period"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-6 border-t border-zinc-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors shadow-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50"
                >
                  {isSaving ? 'Saving...' : isEditing ? 'Update Tenant' : 'Create Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
}
