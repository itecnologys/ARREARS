import { supabase } from '../lib/supabaseClient';
import { MonthlyArrearsRecord, MonthlyAudit, TransactionSaCash } from './rent-model';

// Definição dos tipos do banco de dados (aproximado)
interface PaymentRow {
  id: string;
  room_code: string;
  tenant_name: string;
  amount: number;
  transaction_no: string;
  transaction_date: string;
  reference: string;
  transaction_type: string;
  details: string;
  staff_name: string;
  week_number: number;
  year: number;
  created_at: string;
}

function weekToMonthCode(year: number, week: number): string {
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

const PAGE_SIZE = 1000;

async function fetchAllPayments(year?: number): Promise<PaymentRow[]> {
  let allRows: PaymentRow[] = [];
  let from = 0;
  
  while (true) {
    let query = supabase
      .from('payments')
      .select('*')
      .range(from, from + PAGE_SIZE - 1)
      .order('year', { ascending: true })
      .order('week_number', { ascending: true });

    if (year) {
      query = query.eq('year', year);
    }

    const { data, error } = await query;
    
    if (error) {
      console.error('Error fetching payments page:', error);
      break;
    }
    
    if (!data || data.length === 0) break;
    
    allRows = allRows.concat(data as PaymentRow[]);
    
    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }
  
  return allRows;
}

export async function getAvailableYears(): Promise<number[]> {
  let allYears: number[] = [];
  let from = 0;
  
  while (true) {
    const { data, error } = await supabase
      .from('payments')
      .select('year')
      .range(from, from + PAGE_SIZE - 1);
      
    if (error) {
      console.error('Error fetching years:', error);
      break;
    }

    if (!data || data.length === 0) break;
    
    data.forEach((row: any) => {
      if (row.year) allYears.push(row.year);
    });

    if (data.length < PAGE_SIZE) break;
    from += PAGE_SIZE;
  }

  const uniqueYears = Array.from(new Set(allYears)).sort();
  return uniqueYears.length > 0 ? uniqueYears : [2024];
}

export async function fetchMonthlyArrearsFromSupabase(year?: number): Promise<MonthlyArrearsRecord[]> {
  const rows = await fetchAllPayments(year);
  if (rows.length === 0) return [];

  // Reconstruir a lógica de agregação (similar ao build-yearly-data.ts)
  // Mas agora rodando em tempo de execução (ou build time se for chamado no build)
  
  // Agrupar por ano para processar
  const rowsByYear = new Map<number, PaymentRow[]>();
  for (const row of rows) {
    if (!rowsByYear.has(row.year)) rowsByYear.set(row.year, []);
    rowsByYear.get(row.year)!.push(row);
  }

  const result: MonthlyArrearsRecord[] = [];
  
  // Mapa para acumular arrears do ano
  const byResident = new Map<string, MonthlyArrearsRecord[]>();

  for (const year of Array.from(rowsByYear.keys()).sort()) {
    const yearRows = rowsByYear.get(year)!;
    
    // Gerar registros mensais
    // Agrupar semanas por mês e residente
    // Chave: monthCode|roomCode|tenantName
    const acc = new Map<string, {
      rows: PaymentRow[];
      weekAmounts: Map<number, number>;
      staffName: string;
      tenantName: string;
      roomCode: string;
      monthCode: string;
    }>();

    // 1. Coletar semanas esperadas por mês
    const expectedWeeksByMonth = new Map<string, Set<number>>();
    // 2. Coletar candidatos a valor de aluguel (moda) por residente
    const rentCandidates = new Map<string, Map<number, number>>(); // residentKey -> amount -> count

    for (const row of yearRows) {
      const monthCode = weekToMonthCode(row.year, row.week_number);
      if (!expectedWeeksByMonth.has(monthCode)) expectedWeeksByMonth.set(monthCode, new Set());
      expectedWeeksByMonth.get(monthCode)!.add(row.week_number);

      const residentKey = `${row.room_code}|${row.tenant_name}`;
      
      // Coletar aluguel
      if (!rentCandidates.has(residentKey)) rentCandidates.set(residentKey, new Map());
      const rmap = rentCandidates.get(residentKey)!;
      const amt = Math.round(row.amount * 100) / 100;
      rmap.set(amt, (rmap.get(amt) ?? 0) + 1);

      // Agrupar dados
      const accKey = `${monthCode}|${residentKey}`;
      if (!acc.has(accKey)) {
        acc.set(accKey, { 
            rows: [], 
            weekAmounts: new Map(),
            staffName: row.staff_name,
            tenantName: row.tenant_name,
            roomCode: row.room_code,
            monthCode: monthCode
        });
      }
      const entry = acc.get(accKey)!;
      entry.rows.push(row);
      const currentWeekAmount = entry.weekAmounts.get(row.week_number) ?? 0;
      entry.weekAmounts.set(row.week_number, currentWeekAmount + row.amount);
    }

    // Processar cada grupo (mês/residente)
    for (const data of acc.values()) {
        const expectedWeeks = Array.from(expectedWeeksByMonth.get(data.monthCode) ?? []).sort((a, b) => a - b);
        
        // Calcular aluguel semanal (moda)
        const residentKey = `${data.roomCode}|${data.tenantName}`;
        const candMap = rentCandidates.get(residentKey) ?? new Map();
        const candidatesArr = Array.from(candMap.entries())
            .map(([amount, count]) => ({ amount, count }))
            .sort((a, b) => (b.count - a.count) || (b.amount - a.amount)); // Ordem: contagem desc, valor desc
        
        const weeklyRentAmount = candidatesArr.length > 0 ? candidatesArr[0].amount : 0;

        const amountsByWeek = expectedWeeks.map(wn => data.weekAmounts.get(wn) ?? 0);
        const monthTotalPaidAmount = amountsByWeek.reduce((a, b) => a + b, 0);
        
        // Regra de negócio: Total devido = aluguel * semanas no mês
        const totalDue = weeklyRentAmount * expectedWeeks.length;
        
        // Arrears do mês = Devido - Pago (se positivo)
        const monthArrearsAmount = Math.max(0, totalDue - monthTotalPaidAmount);

        // Auditoria
        const weeksAudit = expectedWeeks.map(wn => {
            const weekRows = data.rows.filter(r => r.week_number === wn);
            return {
                year: year,
                weekNumber: wn,
                amount: data.weekAmounts.get(wn) ?? 0,
                sources: weekRows.map(r => ({
                    file: 'Supabase',
                    transactionNo: r.transaction_no,
                    date: r.transaction_date,
                    reference: r.reference,
                    amount: r.amount
                }))
            };
        });

        const record: MonthlyArrearsRecord = {
            roomCode: data.roomCode,
            sageAccountId: data.roomCode,
            staffName: data.staffName || '',
            tenantName: data.tenantName,
            weeklyRentAmount,
            currency: "EUR",
            week1PaidAmount: amountsByWeek[0] ?? 0,
            week2PaidAmount: amountsByWeek[1] ?? 0,
            week3PaidAmount: amountsByWeek[2] ?? 0,
            week4PaidAmount: amountsByWeek[3] ?? 0,
            carriedOverFromPreviousMonthAmount: 0,
            monthTotalPaidAmount,
            monthArrearsAmount,
            yearArrearsAmount: 0, // calculado no passo 2
            currentArrearsAmount: monthArrearsAmount,
            periodMonth: data.monthCode,
            snapshotDate: `${data.monthCode}-01`,
            audit: {
                weeklyRent: {
                    method: 'mode',
                    chosen: weeklyRentAmount,
                    candidates: candidatesArr.slice(0, 5)
                },
                weeks: weeksAudit
            }
        };
        result.push(record);
    }
  }

  // Passo 2: Calcular Year Arrears (acumulado anual)
  const recordsByResidentYear = new Map<string, MonthlyArrearsRecord[]>();
  for (const r of result) {
    const k = `${r.periodMonth.slice(0, 4)}|${r.roomCode}|${r.tenantName}`;
    if (!recordsByResidentYear.has(k)) recordsByResidentYear.set(k, []);
    recordsByResidentYear.get(k)!.push(r);
  }

  for (const list of recordsByResidentYear.values()) {
    list.sort((a, b) => a.periodMonth.localeCompare(b.periodMonth));
    let cum = 0;
    for (const item of list) {
      item.yearArrearsAmount = cum;
      cum += item.monthArrearsAmount;
      // Atualizar currentArrearsAmount? No modelo original era monthArrearsAmount, mas talvez devesse ser cum + month?
      // O modelo original tinha: currentArrearsAmount = monthArrearsAmount.
      // E yearArrearsAmount era a soma dos arrears dos meses anteriores.
      // Manteremos como no original.
    }
  }

  return result;
}

export async function fetchTransactionsFromSupabase(year?: number): Promise<TransactionSaCash[]> {
    const rows = await fetchAllPayments(year);
    
    return rows.map((r: PaymentRow) => ({
        year: r.year,
        weekNumber: r.week_number,
        periodMonth: weekToMonthCode(r.year, r.week_number),
        roomCode: r.room_code,
        tenantName: r.tenant_name,
        transactionNo: r.transaction_no,
        date: r.transaction_date,
        reference: r.reference,
        type: r.transaction_type,
        details: r.details,
        amount: r.amount
    }));
}
