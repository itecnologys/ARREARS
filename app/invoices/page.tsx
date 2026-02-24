"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "../../components/AppLayout";
import { fetchMonthlyArrearsFromSupabase } from "../actions";
import { MonthlyArrearsRecord } from "../rent-model";
import { 
  FileText, 
  Send,
  CheckSquare,
  Square
} from "lucide-react";

export default function InvoicesPage() {
  const [arrears, setArrears] = useState<MonthlyArrearsRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const year = new Date().getFullYear();

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const data = await fetchMonthlyArrearsFromSupabase(year);
        
        // Group by tenant and find latest record for each
        const latestByTenant = new Map<string, MonthlyArrearsRecord>();
        data.forEach(r => {
            const key = `${r.roomCode}|${r.tenantName}`;
            const existing = latestByTenant.get(key);
            if (!existing || r.periodMonth > existing.periodMonth) {
                latestByTenant.set(key, r);
            }
        });

        // Filter only those with total positive arrears
        const candidates = Array.from(latestByTenant.values())
            .filter(r => (r.monthArrearsAmount + r.yearArrearsAmount) > 0)
            .sort((a, b) => (b.monthArrearsAmount + b.yearArrearsAmount) - (a.monthArrearsAmount + a.yearArrearsAmount)); // Sort by amount desc

        setArrears(candidates);
      } catch (error) {
        console.error("Failed to load arrears", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [year]);

  const toggleSelect = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === arrears.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(arrears.map(r => r.roomCode + r.tenantName)));
    }
  };

  const getTotalAmount = (r: MonthlyArrearsRecord) => r.monthArrearsAmount + r.yearArrearsAmount;

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 h-full">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Invoices Ready</h1>
            <p className="text-sm text-zinc-500 mt-1">
              {arrears.length} tenants with outstanding arrears for {year}
            </p>
          </div>
          
          <button 
            disabled={selectedIds.size === 0}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={16} />
            Send {selectedIds.size > 0 ? `${selectedIds.size} Invoices` : 'Invoices'}
          </button>
        </div>

        <main className="flex-1">
          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
                  <tr>
                    <th className="px-6 py-4 w-10">
                      <button onClick={toggleSelectAll} className="flex items-center">
                        {arrears.length > 0 && selectedIds.size === arrears.length ? (
                          <CheckSquare size={18} className="text-blue-600" />
                        ) : (
                          <Square size={18} className="text-zinc-400" />
                        )}
                      </button>
                    </th>
                    <th className="px-6 py-4">Tenant</th>
                    <th className="px-6 py-4">Room</th>
                    <th className="px-6 py-4">Latest Period</th>
                    <th className="px-6 py-4 text-right">Outstanding Amount</th>
                    <th className="px-6 py-4 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">
                        Loading invoice candidates...
                      </td>
                    </tr>
                  ) : arrears.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">
                        No outstanding arrears found for {year}. Everyone is paid up!
                      </td>
                    </tr>
                  ) : (
                    arrears.map((r, idx) => {
                      const id = r.roomCode + r.tenantName;
                      const isSelected = selectedIds.has(id);
                      const total = getTotalAmount(r);
                      return (
                        <tr key={idx} className={`hover:bg-zinc-50 transition-colors ${isSelected ? 'bg-blue-50/50' : ''}`}>
                          <td className="px-6 py-4">
                            <button onClick={() => toggleSelect(id)} className="flex items-center">
                              {isSelected ? (
                                <CheckSquare size={18} className="text-blue-600" />
                              ) : (
                                <Square size={18} className="text-zinc-400" />
                              )}
                            </button>
                          </td>
                          <td className="px-6 py-4 font-medium text-zinc-900">
                            {r.tenantName}
                          </td>
                          <td className="px-6 py-4 text-zinc-600">
                            <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600 ring-1 ring-inset ring-zinc-500/10">
                              {r.roomCode}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-zinc-600">
                            {r.periodMonth}
                          </td>
                          <td className="px-6 py-4 text-right font-medium text-red-600">
                            €{total.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
                              Pending
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>
    </AppLayout>
  );
}
