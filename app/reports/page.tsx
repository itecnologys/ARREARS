"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "../../components/AppLayout";
import { fetchMonthlyArrearsFromSupabase } from "../actions";
import { MonthlyArrearsRecord } from "../rent-model";
import { 
  PieChart, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  Users
} from "lucide-react";

export default function ReportsPage() {
  const [stats, setStats] = useState({
    totalArrears: 0,
    totalCollected: 0,
    arrearsByStaff: [] as { name: string; amount: number; count: number }[],
    topDebtors: [] as MonthlyArrearsRecord[]
  });
  const [isLoading, setIsLoading] = useState(true);
  const year = new Date().getFullYear();

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const data = await fetchMonthlyArrearsFromSupabase(year);
        
        // Latest snapshot per tenant
        const latestByTenant = new Map<string, MonthlyArrearsRecord>();
        let totalCollected = 0;

        data.forEach(r => {
            const key = `${r.roomCode}|${r.tenantName}`;
            const existing = latestByTenant.get(key);
            if (!existing || r.periodMonth > existing.periodMonth) {
                latestByTenant.set(key, r);
            }
            // Sum up collected amounts (monthTotalPaidAmount is for that month)
            // But fetchMonthlyArrearsFromSupabase returns all months.
            // So summing monthTotalPaidAmount across all records gives total collected for year.
            totalCollected += r.monthTotalPaidAmount;
        });

        const latestRecords = Array.from(latestByTenant.values());
        const totalArrears = latestRecords.reduce((sum, r) => sum + (r.monthArrearsAmount + r.yearArrearsAmount), 0);

        // Group by Staff
        const staffMap = new Map<string, { amount: number; count: number }>();
        latestRecords.forEach(r => {
            const staff = r.staffName || 'Unassigned';
            const amount = r.monthArrearsAmount + r.yearArrearsAmount;
            if (amount > 0) {
                const current = staffMap.get(staff) || { amount: 0, count: 0 };
                staffMap.set(staff, { amount: current.amount + amount, count: current.count + 1 });
            }
        });

        const arrearsByStaff = Array.from(staffMap.entries())
            .map(([name, val]) => ({ name, ...val }))
            .sort((a, b) => b.amount - a.amount);

        // Top Debtors
        const topDebtors = latestRecords
            .filter(r => (r.monthArrearsAmount + r.yearArrearsAmount) > 0)
            .sort((a, b) => (b.monthArrearsAmount + b.yearArrearsAmount) - (a.monthArrearsAmount + a.yearArrearsAmount))
            .slice(0, 5);

        setStats({
            totalArrears,
            totalCollected,
            arrearsByStaff,
            topDebtors
        });

      } catch (error) {
        console.error("Failed to load report data", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, [year]);

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 h-full">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Financial Reports</h1>
            <p className="text-sm text-zinc-500 mt-1">Overview for {year}</p>
          </div>
        </div>

        {isLoading ? (
             <div className="flex items-center justify-center h-64 text-zinc-500">Loading reports...</div>
        ) : (
            <main className="flex-1 flex flex-col gap-6">
              {/* Cards */}
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="rounded-lg bg-red-100 p-3 text-red-600">
                            <TrendingDown size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-zinc-500">Total Arrears</p>
                            <p className="text-2xl font-bold text-zinc-900">€{stats.totalArrears.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
                 <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="rounded-lg bg-emerald-100 p-3 text-emerald-600">
                            <DollarSign size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-zinc-500">Total Collected</p>
                            <p className="text-2xl font-bold text-zinc-900">€{stats.totalCollected.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
                 <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="rounded-lg bg-blue-100 p-3 text-blue-600">
                            <Users size={24} />
                        </div>
                        <div>
                            <p className="text-sm font-medium text-zinc-500">Debtors Count</p>
                            <p className="text-2xl font-bold text-zinc-900">{stats.arrearsByStaff.reduce((acc, curr) => acc + curr.count, 0)}</p>
                        </div>
                    </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
                {/* Staff Table */}
                <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
                    <div className="border-b border-zinc-200 px-6 py-4">
                        <h3 className="text-base font-semibold leading-6 text-zinc-900">Arrears by Staff</h3>
                    </div>
                    <div className="px-6 py-4">
                         <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="text-zinc-500 border-b border-zinc-100">
                                    <th className="pb-2 font-medium">Staff Member</th>
                                    <th className="pb-2 font-medium text-right">Tenants</th>
                                    <th className="pb-2 font-medium text-right">Total Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {stats.arrearsByStaff.map((s, idx) => (
                                    <tr key={idx}>
                                        <td className="py-3 text-zinc-900">{s.name}</td>
                                        <td className="py-3 text-right text-zinc-600">{s.count}</td>
                                        <td className="py-3 text-right font-medium text-red-600">€{s.amount.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                 {/* Top Debtors Table */}
                <div className="rounded-xl border border-zinc-200 bg-white shadow-sm">
                    <div className="border-b border-zinc-200 px-6 py-4">
                        <h3 className="text-base font-semibold leading-6 text-zinc-900">Top 5 Highest Arrears</h3>
                    </div>
                    <div className="px-6 py-4">
                         <table className="w-full text-left text-sm">
                            <thead>
                                <tr className="text-zinc-500 border-b border-zinc-100">
                                    <th className="pb-2 font-medium">Tenant</th>
                                    <th className="pb-2 font-medium">Room</th>
                                    <th className="pb-2 font-medium text-right">Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-100">
                                {stats.topDebtors.map((r, idx) => (
                                    <tr key={idx}>
                                        <td className="py-3 text-zinc-900">{r.tenantName}</td>
                                        <td className="py-3 text-zinc-600">{r.roomCode}</td>
                                        <td className="py-3 text-right font-medium text-red-600">
                                            €{(r.monthArrearsAmount + r.yearArrearsAmount).toFixed(2)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
              </div>
            </main>
        )}
      </div>
    </AppLayout>
  );
}
