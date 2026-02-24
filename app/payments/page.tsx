"use client";

import { useState, useEffect } from "react";
import { AppLayout } from "../../components/AppLayout";
import { fetchTransactionsFromSupabase, getAvailableYears } from "../actions";
import { TransactionSaCash } from "../rent-model";
import { 
  Download, 
  Filter, 
  Search,
  Calendar
} from "lucide-react";

export default function PaymentsPage() {
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [transactions, setTransactions] = useState<TransactionSaCash[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    async function init() {
      try {
        const years = await getAvailableYears();
        setAvailableYears(years);
        if (years.length > 0 && !years.includes(selectedYear)) {
          setSelectedYear(years[years.length - 1]);
        }
      } catch (error) {
        console.error("Failed to load years", error);
      }
    }
    init();
  }, []);

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const data = await fetchTransactionsFromSupabase(selectedYear);
        setTransactions(data);
      } catch (error) {
        console.error("Failed to load transactions", error);
      } finally {
        setIsLoading(false);
      }
    }
    if (selectedYear) {
      loadData();
    }
  }, [selectedYear]);

  const filteredTransactions = transactions.filter(t => 
    (t.tenantName || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.roomCode || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.transactionNo || "").toLowerCase().includes(searchTerm.toLowerCase()) ||
    (t.reference || "").toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <AppLayout>
      <div className="flex flex-col gap-6 h-full">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-zinc-900">Payments History</h1>
            <p className="text-sm text-zinc-500 mt-1">View and manage all payment transactions</p>
          </div>
          
          <div className="flex items-center gap-3">
             <div className="relative">
                <Calendar className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(Number(e.target.value))}
                  className="h-10 rounded-lg border border-zinc-200 bg-white pl-9 pr-8 text-sm font-medium text-zinc-700 hover:bg-zinc-50 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none shadow-sm cursor-pointer"
                >
                  {availableYears.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
            </div>
            <button className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm">
              <Download size={16} />
              Export CSV
            </button>
          </div>
        </div>

        <main className="flex-1">
          {/* Stats / Filters */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4 bg-white p-1 rounded-lg border border-zinc-200 shadow-sm">
               <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                <input 
                  type="text"
                  placeholder="Search transactions..."
                  className="h-9 w-64 rounded-md border-none bg-transparent pl-9 text-sm outline-none placeholder:text-zinc-400 focus:ring-0"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button className="flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors shadow-sm">
                <Filter size={16} />
                Filter
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-zinc-50 text-xs font-semibold uppercase text-zinc-500">
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Transaction No</th>
                    <th className="px-6 py-4">Tenant</th>
                    <th className="px-6 py-4">Room</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Reference</th>
                    <th className="px-6 py-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-zinc-500">
                        Loading transactions...
                      </td>
                    </tr>
                  ) : filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-zinc-500">
                        No transactions found for {selectedYear}.
                      </td>
                    </tr>
                  ) : (
                    filteredTransactions.map((t, idx) => (
                      <tr key={idx} className="hover:bg-zinc-50 transition-colors">
                        <td className="px-6 py-4 text-zinc-600 whitespace-nowrap">
                          {t.date}
                        </td>
                        <td className="px-6 py-4 font-medium text-zinc-900">
                          {t.transactionNo}
                        </td>
                        <td className="px-6 py-4 text-zinc-900 font-medium">
                          {t.tenantName}
                        </td>
                         <td className="px-6 py-4 text-zinc-600">
                          <span className="inline-flex items-center rounded-md bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-600 ring-1 ring-inset ring-zinc-500/10">
                            {t.roomCode}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-zinc-600">
                          {t.type}
                        </td>
                        <td className="px-6 py-4 text-zinc-600 max-w-xs truncate" title={t.reference}>
                          {t.reference}
                        </td>
                        <td className="px-6 py-4 text-right font-medium text-emerald-600">
                          €{t.amount.toFixed(2)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
             <div className="border-t border-zinc-200 bg-zinc-50 px-6 py-4 flex items-center justify-between">
              <div className="text-xs text-zinc-500">
                Showing {filteredTransactions.length} transactions
              </div>
            </div>
          </div>
        </main>
      </div>
    </AppLayout>
  );
}
