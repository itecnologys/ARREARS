import path from "node:path";
import fs from "node:fs";
import * as XLSX from "xlsx";
import { MonthlyArrearsRecord, TransactionSaCash } from "../app/rent-model";

type YearMonthCode = `${number}-${string}`;

const rootDir = path.resolve(__dirname, "..", "..");
const dataDir = path.join(rootDir, "RENTARREARS");
const weeksDir = path.join(dataDir, "PAYMENTS-REPORTS-BY-WEEK");

interface WeekFileInfo {
  year: number;
  weekNumber: number;
  fullPath: string;
}

function findWeekFiles(year: number): WeekFileInfo[] {
  const yearDir = path.join(weeksDir, String(year));
  if (!fs.existsSync(yearDir)) return [];
  const files = fs.readdirSync(yearDir);
  const result: WeekFileInfo[] = [];
  for (const file of files) {
    const match = file.match(/Payments_week_(\d+)_([0-9]{4})\.xlsx$/i);
    if (!match) continue;
    const week = Number(match[1]);
    const fileYear = Number(match[2]);
    if (fileYear !== year) continue;
    result.push({
      year,
      weekNumber: week,
      fullPath: path.join(yearDir, file),
    });
  }
  return result.sort((a, b) => a.weekNumber - b.weekNumber);
}

function weekToMonthCode(year: number, week: number): YearMonthCode {
  if (week <= 5) return `${year}-01`;
  if (week <= 9) return `${year}-02`;
  if (week <= 13) return `${year}-03`;
  if (week <= 17) return `${year}-04`;
  if (week <= 22) return `${year}-05`;
  if (week <= 26) return `${year}-06`;
  if (week <= 30) return `${year}-07`;
  if (week <= 35) return `${year}-08`;
  if (week <= 39) return `${year}-09`;
  if (week <= 44) return `${year}-10`;
  if (week <= 48) return `${year}-11`;
  return `${year}-12`;
}

interface RawWeeklyRow {
  roomCode: string;
  tenantName: string;
  amount: number;
  transactionNo?: string;
  date?: string;
  reference?: string;
  type?: string;
  details?: string;
  staffName?: string;
  weekNumber: number;
}

function readWeeklyFile(info: WeekFileInfo): RawWeeklyRow[] {
  const wb = XLSX.readFile(info.fullPath);
  const sheetName = wb.SheetNames[0];
  const sheet = wb.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    header: 1,
    raw: false,
  }) as unknown as (string | number)[][];
  const result: RawWeeklyRow[] = [];
  if (!rows || rows.length === 0) return result;

  // Find the real header row, e.g. ["", "Type", "T/C", "No.", "Date", "Reference", "A/C", "N/C", "", "Details", "", "Net", "", "Vat", "", "Gross", ...]
  let headerIndex = -1;
  for (let i = 0; i < rows.length; i += 1) {
    const r = rows[i].map((v) => String(v || "").trim().toLowerCase());
    if (r.includes("type") && r.includes("a/c") && r.includes("gross")) {
      headerIndex = i;
      break;
    }
  }
  // Format A: T9 Transaction Listing (2024)
  if (headerIndex === -1) {
    // Try Format B: Customer transaction blocks (2025)
    let currentAc = "";
    let currentName = "";
    let currentContact = "";
    let transHeaderFound = false;
    let amountLabelIdx = -1;
    let paidLabelIdx = -1;
    let outstandingLabelIdx = -1;
    let typeIdx = -1;
    let detailsIdx = -1;
    let noIdx = -1;
    let dateIdx = -1;
    let refIdx = -1;
    for (let i = 0; i < rows.length; i += 1) {
      const line = rows[i].map((v) => String(v || "").trim());
      const lower = line.map((v) => v.toLowerCase());
      if (lower.includes("a/c:") && lower.includes("name:")) {
        const acPos = lower.indexOf("a/c:");
        const namePos = lower.indexOf("name:");
        currentAc = String(line[acPos + 1] || "").trim();
        currentName = String(line[namePos + 1] || "").trim();
        const contactPos = lower.indexOf("contact:");
        currentContact = contactPos !== -1 ? String(line[contactPos + 1] || "").trim() : "";
        transHeaderFound = false;
        amountLabelIdx = -1;
        typeIdx = -1;
        detailsIdx = -1;
        noIdx = -1;
        dateIdx = -1;
        refIdx = -1;
        continue;
      }
      if (!transHeaderFound) {
        if (lower.includes("type")) typeIdx = lower.indexOf("type");
        if (lower.includes("details")) detailsIdx = lower.indexOf("details");
        if (lower.includes("no")) noIdx = lower.indexOf("no");
        if (lower.includes("date")) dateIdx = lower.indexOf("date");
        if (lower.includes("ref")) refIdx = lower.indexOf("ref");
        if (lower.includes("amount")) {
          amountLabelIdx = lower.indexOf("amount");
          transHeaderFound = true;
        }
        if (lower.includes("paid")) paidLabelIdx = lower.indexOf("paid");
        if (lower.includes("outstanding"))
          outstandingLabelIdx = lower.indexOf("outstanding");
        continue;
      }
      if (transHeaderFound) {
        if (lower.includes("total:")) {
          transHeaderFound = false;
          amountLabelIdx = -1;
          paidLabelIdx = -1;
          outstandingLabelIdx = -1;
          typeIdx = -1;
          detailsIdx = -1;
          noIdx = -1;
          dateIdx = -1;
          refIdx = -1;
          continue;
        }
        // Skip empty or separator rows
        const hasAny = line.some((v) => v.length > 0);
        if (!hasAny) continue;
        // Determine amount:
        // 1) Prefer "Amount" column if non-zero
        // 2) Else use "Outstanding" if non-zero
        // 3) Else scan to the right of "Details" for the first non-zero numeric
        const toNum = (s: string) =>
          Number(String(s ?? "").replace(/[^\d\.\-]/g, ""));
        const getAt = (idx: number) =>
          idx !== -1 ? toNum(line[idx] as string) : NaN;
        let amt = NaN;
        const amtCol = getAt(amountLabelIdx);
        if (Number.isFinite(amtCol) && Math.abs(amtCol) > 0) {
          amt = amtCol;
        } else {
          const outCol = getAt(outstandingLabelIdx);
          if (Number.isFinite(outCol) && Math.abs(outCol) > 0) {
            amt = outCol;
          } else {
            // scan after Details
            const startScan = detailsIdx !== -1 ? detailsIdx + 1 : 0;
            for (let j = startScan; j < line.length; j += 1) {
              const n = toNum(line[j] as string);
              if (Number.isFinite(n) && Math.abs(n) > 0) {
                amt = n;
                break;
              }
            }
            if (!Number.isFinite(amt)) {
              // final fallback: last numeric
              for (let j = line.length - 1; j >= 0; j -= 1) {
                const n = toNum(line[j] as string);
                if (Number.isFinite(n)) {
                  amt = n;
                  break;
                }
              }
            }
          }
        }
        if (!Number.isFinite(amt)) continue;
        const amount = Math.abs(amt);
        const typeVal = typeIdx !== -1 ? String(line[typeIdx] || "").trim() : "";
        const detailsVal = detailsIdx !== -1 ? String(line[detailsIdx] || "").trim() : "";
        if (typeVal.toUpperCase() !== "SA" || detailsVal.toUpperCase() !== "CASH") continue;
        const roomCode = currentAc || "";
        const tenantName = currentName || (currentAc ? `AC:${currentAc}` : "");
        const transactionNo = noIdx !== -1 ? String(line[noIdx] || "").trim() : "";
        const date = dateIdx !== -1 ? String(line[dateIdx] || "").trim() : "";
        const reference = refIdx !== -1 ? String(line[refIdx] || "").trim() : "";
        if (!roomCode && !tenantName) continue;
        result.push({
          roomCode,
          tenantName,
          amount,
          type: typeVal,
          details: detailsVal,
          transactionNo,
          date,
          reference,
          staffName: currentContact,
          weekNumber: info.weekNumber,
        });
      }
    }
    return result;
  }
  const header = rows[headerIndex].map((v) => String(v || "").trim());
  const labeledCols = header
    .map((h, idx) => ({
      label: String(h || "").trim().toLowerCase(),
      idx,
    }))
    .filter((c) => c.label.length > 0);
  const getVal = (row: (string | number)[], label: string): string => {
    const col = labeledCols.find((c) => c.label === label);
    if (!col) return "";
    return String(row[col.idx] ?? "").trim();
  };
  if (info.year === 2024 && info.weekNumber === 10) {
    // eslint-disable-next-line no-console
    console.log(
      `Debug 2024-W10: headerIndex=${headerIndex}, labels=${labeledCols
        .map((l) => l.label)
        .join(",")}`,
    );
  }

  // Read data rows beneath the header
  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    // Prefer explicit columns; fallback to last numeric entry in the row
    let rawGross = getVal(row, "gross");
    if (!rawGross) rawGross = getVal(row, "net");
    let gross = Number(String(rawGross ?? "").replace(/[^\d\.\-]/g, ""));
    if (!Number.isFinite(gross)) {
      for (let j = row.length - 1; j >= 0; j -= 1) {
        const v = String(row[j] ?? "");
        const cleaned = v.replace(/[^\d\.\-]/g, "");
        if (!cleaned) continue;
        const n = Number(cleaned);
        if (Number.isFinite(n)) {
          gross = n;
          break;
        }
      }
    }
    if (!Number.isFinite(gross)) continue;
    // Amount treated as positive paid value
    const amount = Math.abs(gross);
    const ac = getVal(row, "a/c");
    const reference = getVal(row, "reference");
    const typeVal = getVal(row, "type").toUpperCase();
    const detailsVal = getVal(row, "details").toUpperCase();
    if (typeVal !== "SA" || detailsVal !== "CASH") continue;
    const noVal = getVal(row, "no.");
    const dateVal = getVal(row, "date");
    // Use A/C as a stable identifier in "roomCode" for now; keep Reference as "tenantName" placeholder
    const roomCode = ac || "";
    const tenantName = reference || (ac ? `AC:${ac}` : "");
    if (!roomCode && !tenantName) continue;
    result.push({
      roomCode,
      tenantName,
      amount,
      type: typeVal,
      details: detailsVal,
      transactionNo: noVal,
      date: dateVal,
      reference,
      staffName: "",
      weekNumber: info.weekNumber,
    });
  }
  if (info.year === 2024 && info.weekNumber === 10) {
    // eslint-disable-next-line no-console
    console.log(`Debug 2024-W10: rows parsed=${result.length}`);
  }
  for (let i = 1; i < rows.length; i += 1) {
    // no-op; we already processed in the loop above; this leftover is intentionally kept minimal
  }
  return result;
}

interface MonthAccumulatorKey {
  year: number;
  monthCode: YearMonthCode;
  roomCode: string;
  tenantName: string;
}

function buildYearData(year: number): MonthlyArrearsRecord[] {
  const weeks = findWeekFiles(year);
  let weeksWithRows = 0;
  const expectedWeeksByMonth = new Map<YearMonthCode, Set<number>>();
  for (const w of weeks) {
    const m = weekToMonthCode(year, w.weekNumber);
    if (!expectedWeeksByMonth.has(m)) expectedWeeksByMonth.set(m, new Set());
    expectedWeeksByMonth.get(m)!.add(w.weekNumber);
  }
  const rentCandidates = new Map<
    string,
    Map<number, { count: number; sources: Set<string> }>
  >();
  const acc = new Map<
    string,
    {
      key: MonthAccumulatorKey;
      weekAmounts: Map<number, number>;
      weekDetails: Map<
        number,
        Array<{
          file: string;
          amount: number;
          transactionNo: string;
          date: string;
          reference: string;
        }>
      >;
      staffName?: string;
    }
  >();
  for (const info of weeks) {
    const monthCode = weekToMonthCode(info.year, info.weekNumber);
    const rows = readWeeklyFile(info);
    if (rows.length > 0) weeksWithRows += 1;
    for (const row of rows) {
      const key: MonthAccumulatorKey = {
        year,
        monthCode,
        roomCode: row.roomCode,
        tenantName: row.tenantName,
      };
      const accKey = `${key.year}|${key.monthCode}|${key.roomCode}|${key.tenantName}`;
      if (!acc.has(accKey)) {
        acc.set(accKey, {
          key,
          weekAmounts: new Map(),
          weekDetails: new Map(),
          staffName: row.staffName || "",
        });
      }
      const entry = acc.get(accKey)!;
      entry.staffName = entry.staffName || row.staffName || "";
      const prev = entry.weekAmounts.get(info.weekNumber) ?? 0;
      entry.weekAmounts.set(info.weekNumber, prev + row.amount);
      const detailArr = entry.weekDetails.get(info.weekNumber) ?? [];
      detailArr.push({
        file: info.fullPath,
        amount: row.amount,
        transactionNo: row.transactionNo ?? "",
        date: row.date ?? "",
        reference: row.reference ?? "",
      });
      entry.weekDetails.set(info.weekNumber, detailArr);
      const residentKey = `${row.roomCode}|${row.tenantName}`;
      if (!rentCandidates.has(residentKey)) {
        rentCandidates.set(
          residentKey,
          new Map<number, { count: number; sources: Set<string> }>(),
        );
      }
      const rmap = rentCandidates.get(residentKey)!;
      const amt = Math.round(row.amount * 100) / 100;
      if (!rmap.has(amt)) {
        rmap.set(amt, { count: 0, sources: new Set<string>() });
      }
      const slot = rmap.get(amt)!;
      slot.count += 1;
      slot.sources.add(info.fullPath);
    }
  }
  // eslint-disable-next-line no-console
  console.log(`Year ${year} weeks with rows: ${weeksWithRows}`);
  const result: MonthlyArrearsRecord[] = [];
  for (const { key, weekAmounts, weekDetails, staffName } of acc.values()) {
    const expectedWeeksSet =
      expectedWeeksByMonth.get(key.monthCode) ?? new Set<number>();
    const expectedWeeks = Array.from(expectedWeeksSet).sort(
      (a, b) => a - b,
    );
    const amountsByWeek = expectedWeeks.map((wn) => weekAmounts.get(wn) ?? 0);
    const residentKey = `${key.roomCode}|${key.tenantName}`;
    const candMap = rentCandidates.get(residentKey) ?? new Map();
    const candidatesArr = Array.from(candMap.entries())
      .filter(([a]) => a > 0)
      .map(([amount, info]) => ({ amount, count: info.count }))
      .sort((a, b) => (b.count - a.count) || b.amount - a.amount);
    const weeklyRentAmount =
      candidatesArr.length > 0 ? candidatesArr[0].amount : 0;
    const monthTotalPaidAmount = amountsByWeek.reduce((s, v) => s + v, 0);
    const totalDue = weeklyRentAmount * expectedWeeks.length;
    const monthArrearsAmount = Math.max(0, totalDue - monthTotalPaidAmount);
    const currentArrearsAmount = monthArrearsAmount;
    const firstFour = amountsByWeek.slice(0, 4);
    const [w1, w2, w3, w4] = [
      firstFour[0] ?? 0,
      firstFour[1] ?? 0,
      firstFour[2] ?? 0,
      firstFour[3] ?? 0,
    ];
    const weeksAudit = expectedWeeks.map((wn) => {
      const details = weekDetails.get(wn) ?? [];
      return {
        year: key.year,
        weekNumber: wn,
        amount: weekAmounts.get(wn) ?? 0,
        sources: details.map((d) => ({
          file: path.basename(d.file),
          transactionNo: d.transactionNo,
          date: d.date,
          reference: d.reference,
          amount: d.amount,
        })),
      };
    });
    result.push({
      roomCode: key.roomCode,
      sageAccountId: key.roomCode, // SAGE-ID = A/C
      staffName: staffName || "",
      tenantName: key.tenantName,
      weeklyRentAmount,
      currency: "EUR",
      week1PaidAmount: w1,
      week2PaidAmount: w2,
      week3PaidAmount: w3,
      week4PaidAmount: w4,
      carriedOverFromPreviousMonthAmount: 0,
      monthTotalPaidAmount,
      monthArrearsAmount,
      yearArrearsAmount: 0, // will fill in a second pass
      currentArrearsAmount,
      periodMonth: key.monthCode,
      snapshotDate: `${key.monthCode}-01`,
      audit: {
        weeklyRent: {
          method: "mode",
          chosen: weeklyRentAmount,
          candidates: candidatesArr.slice(0, 5),
        },
        weeks: weeksAudit,
      },
    });
  }
  // Second pass: compute yearArrearsAmount as sum of prior months in the same year per resident
  const byResident = new Map<string, MonthlyArrearsRecord[]>();
  for (const rec of result) {
    const k = `${rec.periodMonth.slice(0, 4)}|${rec.roomCode}|${rec.tenantName}`;
    if (!byResident.has(k)) byResident.set(k, []);
    byResident.get(k)!.push(rec);
  }
  for (const group of byResident.values()) {
    group.sort((a, b) => a.periodMonth.localeCompare(b.periodMonth));
    let cum = 0;
    for (let i = 0; i < group.length; i += 1) {
      group[i].yearArrearsAmount = cum;
      cum += group[i].monthArrearsAmount;
    }
  }
  return result;
}

function main() {
  const years = [2024, 2025];
  const all: MonthlyArrearsRecord[] = [];
  const transactionsAll: TransactionSaCash[] = [];
  // Quick debug dump for the first 2024 file (first 8 rows)
  try {
    const sampleWeeks = findWeekFiles(2024);
    if (sampleWeeks.length > 0) {
      const wb = XLSX.readFile(sampleWeeks[0].fullPath);
      const sheetName = wb.SheetNames[0];
      const sheet = wb.Sheets[sheetName];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false }) as unknown as (string | number)[][];
      // eslint-disable-next-line no-console
      console.log("Sample file:", sampleWeeks[0].fullPath);
      // eslint-disable-next-line no-console
      console.log("First 8 rows:", JSON.stringify(rows.slice(0, 8)));
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log("Debug dump error:", e);
  }
  for (const year of years) {
    const weeks = findWeekFiles(year);
    // eslint-disable-next-line no-console
    console.log(`Year ${year} weeks: ${weeks.length}`);
    const yearData = buildYearData(year);
    // eslint-disable-next-line no-console
    console.log(`Year ${year} records: ${yearData.length}`);
    all.push(...yearData);
    // Also collect transaction-level SA CASH rows
    for (const info of weeks) {
      const rows = readWeeklyFile(info);
      const periodMonth = weekToMonthCode(info.year, info.weekNumber);
      for (const r of rows) {
        transactionsAll.push({
          year: info.year,
          weekNumber: info.weekNumber,
          periodMonth,
          roomCode: r.roomCode,
          tenantName: r.tenantName,
          transactionNo: r.transactionNo ?? "",
          date: r.date ?? "",
          reference: r.reference ?? "",
          type: r.type ?? "SA",
          details: r.details ?? "CASH",
          amount: Math.abs(r.amount),
        });
      }
    }
  }
  const outDir = path.join(rootDir, "rentarrears-app", "data");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outPath = path.join(outDir, "monthly-arrears.json");
  fs.writeFileSync(outPath, JSON.stringify(all, null, 2), "utf8");
  // eslint-disable-next-line no-console
  console.log(`Wrote ${all.length} records to ${outPath}`);
  const outPath2 = path.join(outDir, "transactions-sa-cash.json");
  fs.writeFileSync(outPath2, JSON.stringify(transactionsAll, null, 2), "utf8");
  // Aggregate by (year, weekNumber, roomCode, tenantName)
  const aggMap = new Map<
    string,
    {
      year: number;
      weekNumber: number;
      periodMonth: string;
      roomCode: string;
      tenantName: string;
      amount: number;
      transactionNo: string;
      date: string;
      reference: string;
    }
  >();
  for (const t of transactionsAll) {
    const key = `${t.year}|${t.weekNumber}|${t.roomCode}|${t.tenantName}`;
    const current = aggMap.get(key);
    if (!current) {
      aggMap.set(key, {
        year: t.year,
        weekNumber: t.weekNumber,
        periodMonth: t.periodMonth,
        roomCode: t.roomCode,
        tenantName: t.tenantName,
        amount: t.amount,
        transactionNo: t.transactionNo,
        date: t.date,
        reference: t.reference,
      });
    } else {
      current.amount += t.amount;
      // Keep the highest transaction number for display
      const currNo = Number(current.transactionNo || "0");
      const nextNo = Number(t.transactionNo || "0");
      if (nextNo >= currNo) {
        current.transactionNo = t.transactionNo;
        current.date = t.date || current.date;
        current.reference = t.reference || current.reference;
      }
    }
  }
  const aggList = Array.from(aggMap.values());
  const outPath3 = path.join(outDir, "transactions-sa-cash-agg.json");
  fs.writeFileSync(outPath3, JSON.stringify(aggList, null, 2), "utf8");
  // eslint-disable-next-line no-console
  console.log(
    `Wrote ${transactionsAll.length} SA CASH transactions and ${aggList.length} aggregated to ${outPath2} and ${outPath3}`,
  );
}

main();
