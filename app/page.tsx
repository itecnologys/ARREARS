"use client";

import React, { useState, useEffect } from "react";
import {
  MonthlyArrearsRecord,
  TransactionSaCash,
  sampleMonthlyArrears,
} from "./rent-model";
// import monthlyArrearsData from "../data/monthly-arrears.json";
// import transactionsSaCashData from "../data/transactions-sa-cash-agg.json";
import { fetchMonthlyArrearsFromSupabase, fetchTransactionsFromSupabase, getAvailableYears } from "./actions";

// const jsonRecords = (monthlyArrearsData as MonthlyArrearsRecord[]) ?? [];
// const baseRecords: MonthlyArrearsRecord[] =
//   Array.isArray(jsonRecords) && jsonRecords.length > 0
//     ? jsonRecords
//     : sampleMonthlyArrears;

// const allRecords: MonthlyArrearsRecord[] = baseRecords;

// const yearValues = Array.from(
//   new Set(allRecords.map((r) => r.periodMonth.slice(0, 4))),
// ).sort();
// const numberYears = yearValues.map((y) => Number(y));

// const allTransactions: TransactionSaCash[] = Array.isArray(
//   transactionsSaCashData as unknown as TransactionSaCash[],
// )
//   ? ((transactionsSaCashData as unknown as TransactionSaCash[]) ?? [])
//   : [];

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
        // Default to the latest year usually, or first. Let's stick to first for consistency with old logic
        // But user probably wants latest data. Let's use latest.
        // Actually, let's just pick the first one for now to avoid confusion with existing logic.
        // The previous logic was: if (numberYears.length > 0 && !numberYears.includes(selectedYear)) setSelectedYear(numberYears[0]);
        // Let's replicate that.
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
                setAllRecords([]); // Empty if no records for year
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

  // Update selectedMonth when records change (e.g. year changed)
  useEffect(() => {
     if (selectedYear) {
         const months = getMonthsForYear(selectedYear, allRecords);
         // If current selectedMonth is not in the new list, pick the first one.
         // Or if it's empty, pick the first one.
         if (months.length > 0) {
            if (!months.includes(selectedMonth) || selectedMonth === "") {
                setSelectedMonth(months[0]);
            }
         } else {
             setSelectedMonth("");
         }
     }
  }, [selectedYear, allRecords, selectedMonth]);

  const [auditTarget, setAuditTarget] = useState<MonthlyArrearsRecord | null>(
    null,
  );

  if (loading) {
      return <div className="p-8">Carregando dados do Supabase...</div>;
  }

  const monthsForYear = getMonthsForYear(selectedYear, allRecords);

  const recordsForMonth = allRecords.filter(
    (r) => r.periodMonth === selectedMonth,
  );
  const transactionsForMonth = allTransactions.filter(
    (t) => t.periodMonth === selectedMonth,
  );
  const weekNumbersForMonth = Array.from(
    new Set(transactionsForMonth.map((t) => t.weekNumber)),
  ).sort((a, b) => a - b);
  const weeklyByResident = new Map<
    string,
    { roomCode: string; tenantName: string; byWeek: Record<number, number> }
  >();
  for (const t of transactionsForMonth) {
    const key = `${t.roomCode}|${t.tenantName}`;
    if (!weeklyByResident.has(key)) {
      weeklyByResident.set(key, {
        roomCode: t.roomCode,
        tenantName: t.tenantName,
        byWeek: {},
      });
    }
    const entry = weeklyByResident.get(key)!;
    const prev = entry.byWeek[t.weekNumber] ?? 0;
    entry.byWeek[t.weekNumber] = prev + t.amount;
  }

  return (
    <div className="min-h-screen bg-zinc-100 text-zinc-900">
      <header className="border-b border-zinc-200 bg-white/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-zinc-900">
              Rent Arrears Dashboard
            </h1>
            <p className="text-sm text-zinc-500">
              Snapshot of rent status by room and tenant
            </p>
          </div>
          <div className="flex gap-3 text-xs text-zinc-500">
            <div className="rounded-full border border-zinc-200 bg-white px-3 py-1">
              Year:{" "}
              <span className="font-medium text-zinc-900">{selectedYear}</span>
            </div>
            <div className="rounded-full border border-zinc-200 bg-white px-3 py-1">
              Records:{" "}
              <span className="font-medium text-zinc-900">
                {recordsForMonth.length}
              </span>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <section className="mb-4">
          <div className="mb-2 text-xs font-medium text-zinc-500">
            Select year
          </div>
          <div className="flex flex-wrap gap-2">
            <select
              value={selectedYear}
              onChange={(e) => {
                const year = Number(e.target.value);
                setSelectedYear(year);
              }}
              className="rounded-md border border-zinc-200 bg-white px-3 py-1.5 text-sm text-zinc-700 shadow-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </section>

        <section className="mb-6">
          <div className="mb-2 text-xs font-medium text-zinc-500">
            Select month
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex flex-wrap gap-2">
              {monthsForYear.map((code) => {
                const isActive = code === selectedMonth;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => setSelectedMonth(code)}
                    className={[
                      "rounded-full border px-3 py-1 text-xs transition-colors",
                      isActive
                        ? "border-zinc-900 bg-zinc-900 text-white"
                        : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400",
                    ].join(" ")}
                  >
                    {monthLabel(code)}
                  </button>
                );
              })}
            </div>
            <div className="text-xs text-zinc-500">
              {selectedMonth && (
                <>
                  Selected month:{" "}
                  <span className="font-medium text-zinc-800">
                    {monthLabel(selectedMonth)} {selectedYear}
                  </span>
                </>
              )}
            </div>
          </div>
        </section>

        <section className="mb-6 grid gap-4 md:grid-cols-4">
          <SummaryCard
            label="Total units"
            value={recordsForMonth.length.toString()}
          />
          <SummaryCard
            label="Total month arrears"
            value={
              "€ " +
              recordsForMonth
                .reduce((acc, r) => acc + r.monthArrearsAmount, 0)
                .toFixed(2)
            }
          />
          <SummaryCard
            label="Total year arrears"
            value={
              "€ " +
              recordsForMonth
                .reduce((acc, r) => acc + r.yearArrearsAmount, 0)
                .toFixed(2)
            }
          />
          <SummaryCard
            label="Total month paid"
            value={
              "€ " +
              recordsForMonth
                .reduce((acc, r) => acc + r.monthTotalPaidAmount, 0)
                .toFixed(2)
            }
          />
        </section>

        <section className="rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
            <h2 className="text-sm font-medium text-zinc-800">
              Monthly arrears by room
            </h2>
            <p className="text-xs text-zinc-500">
              Data generated from weekly payments reports ({numberYears.join(", ")}
              )
            </p>
          </div>
          <div className="overflow-x-auto md:overflow-visible">
            <table className="min-w-full border-t border-zinc-200 text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <Th>Room</Th>
                  <Th>SAGE ID</Th>
                  <Th>Staff</Th>
                  <Th>Tenant</Th>
                  <Th className="text-right">Weekly rent</Th>
                  <Th className="text-right">Week 01</Th>
                  <Th className="text-right">Week 02</Th>
                  <Th className="text-right">Week 03</Th>
                  <Th className="text-right">Week 04</Th>
                  <Th className="text-right">Total paid (month)</Th>
                  <Th className="text-right">Month arrears</Th>
                  <Th className="text-right">Year arrears</Th>
                  <Th className="text-right">Audit</Th>
                </tr>
              </thead>
              <tbody>
                {recordsForMonth.length === 0 ? (
                  <tr className="border-t border-zinc-200">
                    <Td colSpan={11} className="text-center text-zinc-500">
                      No data for this month yet.
                    </Td>
                  </tr>
                ) : (
                  recordsForMonth.map((r) => (
                    <tr
                      key={r.roomCode}
                      className="border-t border-zinc-200 hover:bg-zinc-50"
                    >
                      <Td>{r.roomCode}</Td>
                      <Td>{r.sageAccountId}</Td>
                      <Td>{r.staffName}</Td>
                      <Td>{r.tenantName}</Td>
                      <Td className="text-right">
                        € {r.weeklyRentAmount.toFixed(2)}
                      </Td>
                      <Td className="text-right">
                        {r.week1PaidAmount
                          ? r.week1PaidAmount.toFixed(2)
                          : "-"}
                      </Td>
                      <Td className="text-right">
                        {r.week2PaidAmount
                          ? r.week2PaidAmount.toFixed(2)
                          : "-"}
                      </Td>
                      <Td className="text-right">
                        {r.week3PaidAmount
                          ? r.week3PaidAmount.toFixed(2)
                          : "-"}
                      </Td>
                      <Td className="text-right">
                        {r.week4PaidAmount
                          ? r.week4PaidAmount.toFixed(2)
                          : "-"}
                      </Td>
                      <Td className="text-right">
                        € {r.monthTotalPaidAmount.toFixed(2)}
                      </Td>
                      <Td
                        className={`text-right ${
                          r.monthArrearsAmount > 0
                            ? "text-amber-600"
                            : "text-emerald-600"
                        }`}
                      >
                        € {r.monthArrearsAmount.toFixed(2)}
                      </Td>
                      <Td className="text-right">
                        € {r.yearArrearsAmount.toFixed(2)}
                      </Td>
                      <Td className="text-right">
                        <button
                          type="button"
                          onClick={() => setAuditTarget(r)}
                          className="rounded border border-zinc-300 px-2 py-1 text-xs hover:border-zinc-400"
                        >
                          Ver
                        </button>
                      </Td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {auditTarget && auditTarget.audit && (
          <section className="mt-4 rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
              <h2 className="text-sm font-medium text-zinc-800">
                Auditoria: {auditTarget.roomCode} • {auditTarget.tenantName}
              </h2>
              <button
                type="button"
                onClick={() => setAuditTarget(null)}
                className="rounded border border-zinc-300 px-2 py-1 text-xs hover:border-zinc-400"
              >
                Fechar
              </button>
            </div>
            <div className="grid gap-4 p-4 md:grid-cols-3">
              <div className="rounded-lg border border-zinc-200 p-3">
                <p className="text-xs uppercase tracking-wide text-zinc-500">
                  Weekly Rent
                </p>
                <p className="mt-1 text-lg font-semibold text-zinc-900">
                  € {auditTarget.weeklyRentAmount.toFixed(2)}
                </p>
                <p className="mt-1 text-xs text-zinc-600">
                  Método: {auditTarget.audit.weeklyRent.method}
                </p>
                <div className="mt-2 text-xs text-zinc-700">
                  {auditTarget.audit.weeklyRent.candidates.map((c, i) => (
                    <div key={i} className="flex justify-between">
                      <span>€ {c.amount.toFixed(2)}</span>
                      <span className="text-zinc-500">{c.count}x</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="md:col-span-2">
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-xs uppercase text-zinc-500">
                        <Th>Week</Th>
                        <Th className="text-right">Pago</Th>
                        <Th>Fontes</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditTarget.audit.weeks.map((w, i) => (
                        <tr
                          key={`${auditTarget.roomCode}-${auditTarget.periodMonth}-W${w.weekNumber}-${i}`}
                          className="border-t border-zinc-200"
                        >
                          <Td>W{w.weekNumber.toString().padStart(2, "0")}</Td>
                          <Td
                            className={
                              "text-right " +
                              (w.amount > 0
                                ? "text-emerald-700"
                                : "text-red-600 font-semibold")
                            }
                          >
                            {w.amount > 0 ? `€ ${w.amount.toFixed(2)}` : "0.00"}
                          </Td>
                          <Td>
                            {w.sources.length === 0 ? (
                              <span className="text-zinc-500">—</span>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {w.sources.map((s, idx) => (
                                  <span
                                    key={idx}
                                    className="rounded border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-[11px] text-zinc-700"
                                  >
                                    {s.file} • {s.date} • {s.reference} • €
                                    {s.amount.toFixed(2)}
                                  </span>
                                ))}
                              </div>
                            )}
                          </Td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </section>
        )}

        <section className="mt-8 rounded-xl border border-zinc-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
            <h2 className="text-sm font-medium text-zinc-800">
              Transactions (SA + CASH)
            </h2>
            <p className="text-xs text-zinc-500">
              Showing all SA/CASH entries for the selected month
            </p>
          </div>
          <div className="overflow-x-auto md:overflow-visible">
            <table className="min-w-full border-t border-zinc-200 text-sm">
              <thead className="bg-zinc-50">
                <tr>
                  <Th>A/C</Th>
                  <Th>Name</Th>
                  <Th>No</Th>
                  <Th>Date</Th>
                  <Th>Ref</Th>
                  <Th>Details</Th>
                  <Th className="text-right">Amount</Th>
                </tr>
              </thead>
              <tbody>
                {transactionsForMonth.length === 0 ? (
                  <tr className="border-t border-zinc-200">
                    <Td colSpan={7} className="text-center text-zinc-500">
                      No SA/CASH transactions for this month.
                    </Td>
                  </tr>
                ) : (
                  transactionsForMonth.map((t, idx) => (
                    <tr
                      key={`${t.roomCode}-${t.transactionNo}-${idx}`}
                      className="border-t border-zinc-200 hover:bg-zinc-50"
                    >
                      <Td>{t.roomCode}</Td>
                      <Td>{t.tenantName}</Td>
                      <Td>{t.transactionNo}</Td>
                      <Td>{t.date}</Td>
                      <Td>{t.reference}</Td>
                      <Td>{t.details}</Td>
                      <Td className="text-right">€ {t.amount.toFixed(2)}</Td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        {weekNumbersForMonth.length > 0 && (
          <section className="mt-8 rounded-xl border border-zinc-200 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-3">
              <h2 className="text-sm font-medium text-zinc-800">
                Weekly summary (SA + CASH)
              </h2>
              <p className="text-xs text-zinc-500">
                Amounts per week (weeks start Monday and end Sunday)
              </p>
            </div>
            <div className="overflow-x-auto md:overflow-visible">
              <table className="min-w-full border-t border-zinc-200 text-sm">
                <thead className="bg-zinc-50">
                  <tr>
                    <Th>A/C</Th>
                    <Th>Name</Th>
                    {weekNumbersForMonth.map((w) => (
                      <Th key={w} className="text-right">
                        W{w.toString().padStart(2, "0")}
                      </Th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {weeklyByResident.size === 0 ? (
                    <tr className="border-t border-zinc-200">
                      <Td colSpan={2 + weekNumbersForMonth.length} className="text-center text-zinc-500">
                        No weekly data for this month.
                      </Td>
                    </tr>
                  ) : (
                    Array.from(weeklyByResident.values()).map((row) => (
                      <tr
                        key={`${row.roomCode}|${row.tenantName}`}
                        className="border-t border-zinc-200 hover:bg-zinc-50"
                      >
                        <Td>{row.roomCode}</Td>
                        <Td>{row.tenantName}</Td>
                        {weekNumbersForMonth.map((w) => {
                          const amount = row.byWeek[w] ?? 0;
                          const isPaid = amount > 0;
                          return (
                            <Td
                              key={w}
                              className={
                                "text-right " +
                                (isPaid
                                  ? "text-emerald-700"
                                  : "text-red-600 font-semibold")
                              }
                            >
                              {isPaid ? `€ ${amount.toFixed(2)}` : "0.00"}
                            </Td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

function SummaryCard(props: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3">
      <p className="text-xs text-zinc-500">{props.label}</p>
      <p className="mt-1 text-lg font-semibold text-zinc-900">
        {props.value}
      </p>
    </div>
  );
}

function Th({ className, ...props }: React.ComponentProps<"th">) {
  return (
    <th
      className={
        "whitespace-nowrap px-3 py-2 text-left text-xs font-medium uppercase tracking-wide text-zinc-500 " +
        (className ?? "")
      }
      {...props}
    />
  );
}

function Td({ className, ...props }: React.ComponentProps<"td">) {
  return (
    <td
      className={
        "whitespace-nowrap px-3 py-2 text-xs text-zinc-800 " +
        (className ?? "")
      }
      {...props}
    />
  );
}
