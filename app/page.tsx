"use client";

import { useEffect, useState } from "react";
import { MonthlyArrearsRecord, MonthlyAudit, TransactionSaCash } from "./rent-model";
import { fetchMonthlyArrearsFromSupabase, fetchTransactionsFromSupabase, getAvailableYears } from "./actions";
import { AppLayout } from "../components/AppLayout";
import { 
  Download, 
  Filter, 
  MoreHorizontal, 
  ArrowUpDown, 
  Calendar,
  Search,
  CheckSquare,
  AlertCircle,
  CheckCircle2,
  Users,
  PieChart
} from "lucide-react";

function getMonthsForYear(year: number, records: MonthlyArrearsRecord[]): string[] {
  return Array.from(
    new Set(
      records
        .filter((r) => r.periodMonth.startsWith(String(year)))
        .map((r) => r.periodMonth),
    ),
  ).sort();
}

function monthLabel(code: string): string {
  if (!code || code.length < 7) return code;
  const month = Number(code.slice(5, 7));
  const labels = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  return labels[month - 1] ?? code;
}

export default function Home() {
  const [allRecords, setAllRecords] = useState<MonthlyArrearsRecord[]>([]);
  const [allTransactions, setAllTransactions] = useState<TransactionSaCash[]>([]);
  const [loading, setLoading] = useState(true);
  const [availableYears, setAvailableYears] = useState<number[]>([2024]);
  const [selectedYear, setSelectedYear] = useState<number>(2024);
  const [selectedMonth, setSelectedMonth] = useState<string>("");

  // 1. Fetch available years on mount
  useEffect(() => {
    async function loadYears() {
      const years = await getAvailableYears();
      if (years.length > 0) {
        setAvailableYears(years);
        if (!years.includes(selectedYear)) {
            setSelectedYear(years[0]);
        }
      }
    }
    loadYears();
  }, []);

  // 2. Fetch data when selectedYear changes
  useEffect(() => {
    async function loadData() {
        setLoading(true);
        try {
            console.log(`Loading data for year ${selectedYear}...`);
            const records = await fetchMonthlyArrearsFromSupabase(selectedYear);
            const transactions = await fetchTransactionsFromSupabase(selectedYear);
            
            if (records.length > 0) {
                setAllRecords(records);
            } else {
                setAllRecords([]); 
            }
            setAllTransactions(transactions);
        } catch (error) {
            console.error("Failed to load data", error);
            setAllRecords([]);
        } finally {
            setLoading(false);
        }
    }
    if (selectedYear) {
        loadData();
    }
  }, [selectedYear]);

  // Update selectedMonth when records change
  useEffect(() => {
     if (selectedYear) {
         const months = getMonthsForYear(selectedYear, allRecords);
         if (months.length > 0) {
            if (!months.includes(selectedMonth) || selectedMonth === "") {
                setSelectedMonth(months[0]);
            }
         } else {
             setSelectedMonth("");
         }
     }
  }, [selectedYear, allRecords, selectedMonth]);

  const [auditTarget, setAuditTarget] = useState<MonthlyArrearsRecord | null>(null);

  const monthsForYear = getMonthsForYear(selectedYear, allRecords);
  const recordsForMonth = allRecords.filter((r) => r.periodMonth === selectedMonth);

  // Calculate totals
  const totalArrears = recordsForMonth.reduce((acc, r) => acc + r.monthArrearsAmount, 0);
  const totalPaid = recordsForMonth.reduce((acc, r) => acc + r.monthTotalPaidAmount, 0);
  const totalUnits = recordsForMonth.length;
  const overdueCount = recordsForMonth.filter(r => r.monthArrearsAmount > 0).length;

  if (loading && allRecords.length === 0) {
      return (
        <AppLayout>
          <div className="flex h-96 items-center justify-center">
            <div className="text-zinc-500 flex flex-col items-center gap-2">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
              <p>Loading data...</p>
            </div>
          </div>
        </AppLayout>
      );
  }

  return (
    <AppLayout>
      {/* Top Bar */}
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 tracking-tight">Debt Collection Dashboard</h1>
          <p className="text-zinc-500">Overview of rent arrears and payments for {selectedYear}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
             <Calendar className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
             <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="h-10 rounded-lg border border-zinc-200 bg-white pl-9 pr-8 text-sm font-medium text-zinc-700 hover:bg-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
              >
                {availableYears.map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
          </div>
          <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm">
            <Download size={16} />
            Export Report
          </button>
        </div>
      </div>

      {/* Month Tabs */}
      <div className="mb-8 border-b border-zinc-200">
        <nav className="-mb-px flex gap-6 overflow-x-auto" aria-label="Tabs">
          {monthsForYear.length > 0 ? monthsForYear.map(code => (
            <button 
              key={code}
              onClick={() => setSelectedMonth(code)}
              className={[
                selectedMonth === code 
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-zinc-500 hover:text-zinc-700 hover:border-zinc-300',
                'whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-colors'
              ].join(' ')}
            >
              {monthLabel(code)}
            </button>
          )) : (
             <div className="py-4 text-sm text-zinc-400">No monthly data available</div>
          )}
        </nav>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatsCard 
          label="Total Arrears" 
          value={`€ ${totalArrears.toFixed(2)}`} 
          trend="+2.5%" 
          trendUp={false}
          icon={<AlertCircle className="text-red-600" size={20} />}
        />
        <StatsCard 
          label="Total Collected" 
          value={`€ ${totalPaid.toFixed(2)}`} 
          trend="+12%" 
          trendUp={true}
          icon={<CheckCircle2 className="text-emerald-600" size={20} />}
        />
        <StatsCard 
          label="Overdue Accounts" 
          value={overdueCount.toString()} 
          subtext={`Out of ${totalUnits} units`}
          icon={<Users className="text-blue-600" size={20} />}
        />
         <StatsCard 
          label="Collection Rate" 
          value={`${totalUnits > 0 ? ((totalUnits - overdueCount) / totalUnits * 100).toFixed(0) : 0}%`} 
          subtext="Target: 95%"
          icon={<PieChart className="text-purple-600" size={20} />}
        />
      </div>

      {/* Main Table */}
      <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
        <div className="flex items-center justify-between border-b border-zinc-200 bg-zinc-50/50 px-6 py-4">
           <div>
             <h3 className="text-base font-semibold leading-6 text-zinc-900">
               Invoices Ready to Collect
             </h3>
             <p className="text-xs text-zinc-500 mt-0.5">
               {recordsForMonth.length} records found
             </p>
           </div>
           <div className="flex gap-2">
               <button className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
                  <Filter size={14} />
                  Filter
               </button>
               <button className="flex items-center gap-2 rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-50">
                  <MoreHorizontal size={14} />
                  Columns
               </button>
           </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-zinc-200">
             <thead className="bg-zinc-50">
               <tr>
                 <th scope="col" className="px-6 py-3 text-left">
                   <input type="checkbox" className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500" />
                 </th>
                 <Th>Tenant</Th>
                 <Th>Room / Unit</Th>
                 <Th>Status</Th>
                 <Th className="text-right">Rent Amount</Th>
                 <Th className="text-right">Prev Balance</Th>
                 <Th className="text-right">Paid</Th>
                 <Th className="text-right">Month Arrears</Th>
                 <Th className="text-right">Month Surplus</Th>
                 <Th className="text-right">Current Balance</Th>
                 <Th className="text-right">Actions</Th>
               </tr>
             </thead>
             <tbody className="divide-y divide-zinc-200 bg-white">
                {recordsForMonth.length === 0 ? (
                    <tr>
                        <td colSpan={8} className="px-6 py-12 text-center text-zinc-500">
                            No records found for this period.
                        </td>
                    </tr>
                ) : (
                    recordsForMonth.map((r) => {
                        const isOverdue = r.monthArrearsAmount > 0;
                        return (
                          <tr key={r.roomCode + r.tenantName} className="hover:bg-zinc-50 transition-colors group">
                             <td className="px-6 py-4">
                               <input type="checkbox" className="rounded border-zinc-300 text-blue-600 focus:ring-blue-500" />
                             </td>
                             <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                   <div className="h-8 w-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                                      {r.tenantName.slice(0, 2).toUpperCase()}
                                   </div>
                                   <div>
                                      <div className="text-sm font-medium text-zinc-900">{r.tenantName}</div>
                                      <div className="text-xs text-zinc-500">{r.staffName || 'No Agent'}</div>
                                   </div>
                                </div>
                             </td>
                             <td className="px-6 py-4 whitespace-nowrap text-sm text-zinc-600">
                                {r.roomCode}
                             </td>
                             <td className="px-6 py-4 whitespace-nowrap">
                                <span className={[
                                    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
                                    isOverdue ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800'
                                ].join(' ')}>
                                    {isOverdue ? 'Overdue' : 'Paid'}
                                </span>
                             </td>
                             <td className="px-6 py-4 whitespace-nowrap text-right text-sm text-zinc-600">
                                € {r.weeklyRentAmount.toFixed(2)}/wk
                             </td>
                             <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <span className={r.previousBalanceAmount > 0 ? 'text-emerald-600' : (r.previousBalanceAmount < 0 ? 'text-red-600' : 'text-zinc-400')}>
                                    € {Math.abs(r.previousBalanceAmount).toFixed(2)}
                                    {r.previousBalanceAmount > 0 ? ' Cr' : (r.previousBalanceAmount < 0 ? ' Dr' : '')}
                                </span>
                             </td>
                             <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium text-zinc-900">
                                € {r.monthTotalPaidAmount.toFixed(2)}
                             </td>
                             <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold">
                                <span className={r.monthArrearsAmount > 0 ? 'text-red-600' : 'text-zinc-400'}>
                                    € {r.monthArrearsAmount.toFixed(2)}
                                </span>
                             </td>
                             <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold">
                                <span className={r.monthSurplusAmount > 0 ? 'text-emerald-600' : 'text-zinc-400'}>
                                    € {r.monthSurplusAmount.toFixed(2)}
                                </span>
                             </td>
                             <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold">
                                 {r.currentSurplusAmount > 0 ? (
                                     <span className="text-emerald-600">€ {r.currentSurplusAmount.toFixed(2)} Cr</span>
                                 ) : r.currentArrearsAmount > 0 ? (
                                     <span className="text-red-600">€ {r.currentArrearsAmount.toFixed(2)} Dr</span>
                                 ) : (
                                     <span className="text-zinc-400">-</span>
                                 )}
                             </td>
                             <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {isOverdue && (
                                        <button className="text-blue-600 hover:text-blue-900 bg-blue-50 px-3 py-1 rounded-md text-xs font-semibold">
                                            Collect Now
                                        </button>
                                    )}
                                    <button 
                                      onClick={() => setAuditTarget(r)}
                                      className="text-zinc-500 hover:text-zinc-900 p-1"
                                    >
                                       View
                                    </button>
                                </div>
                             </td>
                          </tr>
                        );
                    })
                )}
             </tbody>
          </table>
        </div>
      </div>

      {/* Audit Modal (Simplified for now, reused logic) */}
      {auditTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
           <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto bg-white rounded-xl shadow-2xl">
              <div className="flex items-center justify-between border-b border-zinc-200 px-6 py-4">
                 <h2 className="text-lg font-semibold text-zinc-900">Audit: {auditTarget.roomCode} - {auditTarget.tenantName}</h2>
                 <button onClick={() => setAuditTarget(null)} className="text-zinc-400 hover:text-zinc-600">
                    Close
                 </button>
              </div>
              <div className="p-6">
                 {/* Reusing the audit table logic here but cleaner */}
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                    <div className="p-4 bg-zinc-50 rounded-lg border border-zinc-200">
                        <div className="text-sm text-zinc-500 mb-1">Weekly Rent (Mode)</div>
                        <div className="text-2xl font-bold text-zinc-900">€ {auditTarget.weeklyRentAmount.toFixed(2)}</div>
                    </div>
                    <div className="md:col-span-2 p-4 bg-zinc-50 rounded-lg border border-zinc-200">
                         <div className="text-sm text-zinc-500 mb-3">Calculation Breakdown</div>
                         <table className="w-full text-sm">
                             <thead>
                                 <tr className="text-left text-xs text-zinc-400 uppercase">
                                     <th>Week</th>
                                     <th className="text-right">Expected</th>
                                     <th className="text-right">Paid</th>
                                     <th className="text-right">Difference</th>
                                 </tr>
                             </thead>
                             <tbody>
                                 {auditTarget.audit?.weeks.map(w => (
                                     <tr key={w.weekNumber} className="border-t border-zinc-200">
                                         <td className="py-2">W{w.weekNumber}</td>
                                         <td className="py-2 text-right">€ {auditTarget.weeklyRentAmount.toFixed(2)}</td>
                                         <td className="py-2 text-right">€ {w.amount.toFixed(2)}</td>
                                         <td className="py-2 text-right font-medium">
                                             {w.amount < auditTarget.weeklyRentAmount ? (
                                                 <span className="text-red-600">- € {(auditTarget.weeklyRentAmount - w.amount).toFixed(2)}</span>
                                             ) : (
                                                 <span className="text-emerald-600">OK</span>
                                             )}
                                         </td>
                                     </tr>
                                 ))}
                             </tbody>
                         </table>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}

    </AppLayout>
  );
}

// Components

function StatsCard({ label, value, trend, trendUp, icon, subtext }: any) {
    return (
        <div className="rounded-xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
                <div>
                    <p className="text-sm font-medium text-zinc-500">{label}</p>
                    <p className="mt-2 text-3xl font-bold text-zinc-900">{value}</p>
                </div>
                <div className="rounded-full bg-zinc-50 p-3">
                    {icon}
                </div>
            </div>
            {(trend || subtext) && (
                <div className="mt-4 flex items-center gap-2 text-sm">
                    {trend && (
                        <span className={trendUp ? "text-emerald-600 font-medium" : "text-red-600 font-medium"}>
                            {trend}
                        </span>
                    )}
                    {subtext && <span className="text-zinc-500">{subtext}</span>}
                </div>
            )}
        </div>
    )
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th
      scope="col"
      className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-zinc-500 ${className ?? ""}`}
    >
      {children}
    </th>
  );
}

function Td({ children, className, colSpan }: { children: React.ReactNode; className?: string; colSpan?: number }) {
  return (
    <td colSpan={colSpan} className={`whitespace-nowrap px-6 py-4 text-sm text-zinc-500 ${className ?? ""}`}>
      {children}
    </td>
  );
}
