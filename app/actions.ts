import { supabase } from '../lib/supabaseClient';
import { MonthlyArrearsRecord, MonthlyAudit, TransactionSaCash, Tenant, AbsentPeriod, RentHistory } from './rent-model';

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

// Helper to get the date of the Monday of the given ISO week
function getDateOfISOWeek(w: number, y: number): Date {
    const simple = new Date(y, 0, 1 + (w - 1) * 7);
    const dow = simple.getDay();
    const ISOweekStart = simple;
    if (dow <= 4)
        ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
    else
        ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
    return ISOweekStart;
}

function getEffectiveRent(rentHistory: RentHistory[] | undefined, targetDate: string, defaultRent: number): number {
    if (!rentHistory || rentHistory.length === 0) return defaultRent;
    
    // Sort history by effectiveDate descending (newest first)
    const sorted = [...rentHistory].sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate));
    
    // Find the first entry that started on or before the target date
    const match = sorted.find(h => h.effectiveDate <= targetDate);
    
    return match ? Number(match.weeklyRent) : defaultRent;
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

// Simple normalization for name matching
function normalizeName(name: string): string {
    return name.toLowerCase().trim().replace(/\s+/g, ' ');
}

// Map tenants by normalized name for quick lookup
// We will initialize this strictly from the DB
const tenantsMap = new Map<string, { sageId: string; weeklyRent: number; staff: string; roomCode: string; rentHistory?: RentHistory[] }>();

// JSON dependency removed to ensure DB is the source of truth

export async function fetchMonthlyArrearsFromSupabase(year?: number): Promise<MonthlyArrearsRecord[]> {
  // 1. Fetch real tenants from DB to get Rent History
  const dbTenants = await fetchTenants();
  
  // 2. Clear and Populate tenantsMap strictly from DB
  tenantsMap.clear();
  dbTenants.forEach(t => {
      const normName = normalizeName(t.tenantName);
      tenantsMap.set(normName, {
          sageId: t.sageId,
          weeklyRent: t.weeklyRent,
          staff: t.staffName,
          roomCode: t.roomCode,
          rentHistory: t.rentHistory
      });
  });

  const rows = await fetchAllPayments(year);
  if (rows.length === 0) return [];

  // Filter out Week 10 of 2024
  const validRows = rows.filter(r => !(r.year === 2024 && r.week_number === 10));

  // Agrupar por ano para processar
  const rowsByYear = new Map<number, PaymentRow[]>();
  for (const row of validRows) {
    if (!rowsByYear.has(row.year)) rowsByYear.set(row.year, []);
    rowsByYear.get(row.year)!.push(row);
  }

  const result: MonthlyArrearsRecord[] = [];
  
  for (const year of Array.from(rowsByYear.keys()).sort()) {
    const yearRows = rowsByYear.get(year)!;
    
    // Structure: Month -> TenantID -> Data
    const monthMap = new Map<string, Map<string, {
        rows: PaymentRow[];
        weekAmounts: Map<number, number>;
        sageId: string;
        tenantName: string; 
        roomCode: string;   
        staffName: string;
        rentHistory?: RentHistory[];
        currentWeeklyRent: number; // Current DB value (default)
    }>>();

    // Helper to get Tenant Info
    const getTenantInfo = (name: string, room: string, sageIdFromRow?: string) => {
        const mapDbTenant = (t: Tenant) => ({
            sageId: t.sageId,
            weeklyRent: t.weeklyRent,
            staff: t.staffName,
            roomCode: t.roomCode,
            name: t.tenantName,
            rentHistory: t.rentHistory
        });

        // Priority 1: Lookup by SageID in DB tenants (if provided explicitly)
        if (sageIdFromRow) {
            const dbTenant = dbTenants.find(t => String(t.sageId).trim() === sageIdFromRow);
            if (dbTenant) return mapDbTenant(dbTenant);
        }

        // Priority 2: Check if room matches a SageID in DB tenants (Fix for legacy data where room_code stored sage_id)
        const potentialSageId = room?.toString().trim();
        if (potentialSageId) {
            const dbTenantByRoom = dbTenants.find(t => String(t.sageId).trim() === potentialSageId);
            if (dbTenantByRoom) return mapDbTenant(dbTenantByRoom);
        }

        // Priority 3: Lookup by Name in map
        const norm = normalizeName(name);
        const info = tenantsMap.get(norm);
        if (info) return { ...info, name: name }; 
        
        // Fallback
        return { 
            sageId: `UNKNOWN-${norm}`, 
            weeklyRent: 0, 
            staff: '', 
            roomCode: room,
            name: name,
            rentHistory: [] as RentHistory[]
        };
    };

    // Pre-process rows into months
    for (const row of yearRows) {
        const monthCode = weekToMonthCode(row.year, row.week_number);
        if (!monthMap.has(monthCode)) monthMap.set(monthCode, new Map());
        
        // Try to identify tenant
        // We don't have sage_id in payment row directly? The interface says 'room_code', 'tenant_name', etc.
        // Wait, where does 'sage_id' come from in the payment row? 
        // It's not in PaymentRow interface I defined above.
        // But the previous code used `tInfo.sageId`.
        // The PaymentRow interface is just what we fetch from 'payments' table.
        // Let's assume 'payments' table DOES NOT have sage_id unless we added it.
        // So we must rely on name/room matching.
        
        const tInfo = getTenantInfo(row.tenant_name, row.room_code);
        const tKey = tInfo.sageId; 

        const mResidents = monthMap.get(monthCode)!;
        
        if (!mResidents.has(tKey)) {
            mResidents.set(tKey, {
                rows: [],
                weekAmounts: new Map(),
                sageId: tKey,
                tenantName: tInfo.name, 
                roomCode: tInfo.roomCode || row.room_code,
                staffName: tInfo.staff || row.staff_name,
                rentHistory: tInfo.rentHistory,
                currentWeeklyRent: tInfo.weeklyRent
            });
        }
        
        const entry = mResidents.get(tKey)!;
        entry.rows.push(row);
        const currentWeekAmount = entry.weekAmounts.get(row.week_number) ?? 0;
        entry.weekAmounts.set(row.week_number, currentWeekAmount + row.amount);
    }

    const months = Array.from(monthMap.keys()).sort();
    const tenantBalances = new Map<string, number>(); 

    for (const month of months) {
        const residentsInMonth = monthMap.get(month)!;
        const allTenantKeys = new Set([...residentsInMonth.keys(), ...tenantBalances.keys()]);
        
        const weeksInMonth = new Set<number>();
        validRows.filter(r => weekToMonthCode(r.year, r.week_number) === month).forEach(r => weeksInMonth.add(r.week_number));
        const sortedWeeks = Array.from(weeksInMonth).sort((a,b) => a-b);

        for (const tKey of allTenantKeys) {
            const data = residentsInMonth.get(tKey);
            
            // Resolve info
            let tInfo = dbTenants.find(t => t.sageId === tKey);
            if (!tInfo) {
                // Try map
                const mapEntry = Array.from(tenantsMap.entries()).find(([k,v]) => v.sageId === tKey);
                if (mapEntry) {
                     tInfo = {
                         sageId: mapEntry[1].sageId,
                         tenantName: mapEntry[1].sageId, // fallback
                         weeklyRent: mapEntry[1].weeklyRent,
                         staffName: mapEntry[1].staff,
                         roomCode: mapEntry[1].roomCode,
                         rentHistory: mapEntry[1].rentHistory,
                         status: 'active'
                     };
                }
            }

            const tenantName = data?.tenantName || tInfo?.tenantName || tKey;
            const roomCode = tInfo?.roomCode || data?.roomCode || 'Unknown';
            const staffName = tInfo?.staffName || data?.staffName || '';
            const rentHistory = tInfo?.rentHistory || data?.rentHistory;
            const currentRent = tInfo?.weeklyRent ?? data?.currentWeeklyRent ?? 0;

            const previousBalance = tenantBalances.get(tKey) ?? 0;
            
            // Calculate Due per week
            let totalDue = 0;
            const dueAudit: any[] = [];
            
            for (const weekNum of sortedWeeks) {
                // Determine date for this week
                const weekDate = getDateOfISOWeek(weekNum, year);
                const dateStr = weekDate.toISOString().split('T')[0];
                
                // Get effective rent for this date
                const effectiveRent = getEffectiveRent(rentHistory, dateStr, currentRent);
                totalDue += effectiveRent;
                dueAudit.push({ week: weekNum, date: dateStr, rent: effectiveRent });
            }
            
            // Calculate Paid
            let monthTotalPaidAmount = 0;
            const amountsByWeek: number[] = [];
            
            if (data) {
                sortedWeeks.forEach(w => {
                    const amt = data.weekAmounts.get(w) ?? 0;
                    amountsByWeek.push(amt);
                    monthTotalPaidAmount += amt;
                });
            } else {
                sortedWeeks.forEach(() => amountsByWeek.push(0));
            }

            const netMonth = monthTotalPaidAmount - totalDue;
            const newBalance = previousBalance + netMonth;
            tenantBalances.set(tKey, newBalance);

            const carriedOver = previousBalance; 
            
            const weeksAudit = sortedWeeks.map(wn => {
                const weekRows = data?.rows.filter(r => r.week_number === wn) || [];
                return {
                    year: year,
                    weekNumber: wn,
                    amount: data?.weekAmounts.get(wn) ?? 0,
                    sources: weekRows.map(r => ({
                        file: 'Supabase',
                        transactionNo: r.transaction_no,
                        date: r.transaction_date,
                        reference: r.reference,
                        amount: r.amount
                    }))
                };
            });

            // Use the rent from the LAST week of the month for display
            const lastWeekRent = dueAudit.length > 0 ? dueAudit[dueAudit.length - 1].rent : currentRent;

            const record: MonthlyArrearsRecord = {
                roomCode: roomCode,
                sageAccountId: tKey,
                staffName: staffName,
                tenantName: String(tenantName).toUpperCase(), 
                weeklyRentAmount: lastWeekRent, // Display value
                currency: "EUR",
                week1PaidAmount: amountsByWeek[0] ?? 0,
                week2PaidAmount: amountsByWeek[1] ?? 0,
                week3PaidAmount: amountsByWeek[2] ?? 0,
                week4PaidAmount: amountsByWeek[3] ?? 0,
                carriedOverFromPreviousMonthAmount: -carriedOver, 
                previousBalanceAmount: carriedOver, 
                monthTotalPaidAmount,
                monthArrearsAmount: Math.max(0, totalDue - monthTotalPaidAmount),
                monthSurplusAmount: Math.max(0, monthTotalPaidAmount - totalDue),
                yearArrearsAmount: 0, 
                currentArrearsAmount: newBalance < 0 ? -newBalance : 0, 
                currentSurplusAmount: newBalance > 0 ? newBalance : 0,
                periodMonth: month,
                snapshotDate: `${month}-01`,
                audit: {
                    weeklyRent: {
                        method: 'history-aware',
                        chosen: lastWeekRent,
                        candidates: dueAudit.map(d => ({ amount: d.rent, count: d.week }))
                    },
                    weeks: weeksAudit
                }
            };
            
            result.push(record);
        }
    }
  }

  return result;
}

export async function fetchTransactionsFromSupabase(year?: number): Promise<TransactionSaCash[]> {
    console.log("Fetching transactions and tenants...");
    const rows = await fetchAllPayments(year);
    const dbTenants = await fetchTenants();
    console.log(`Loaded ${rows.length} transactions and ${dbTenants.length} tenants.`);

    if (dbTenants.length > 0) {
        console.log("Sample tenant Sage ID:", dbTenants[0].sageId, typeof dbTenants[0].sageId);
    }
    if (rows.length > 0) {
        console.log("Sample payment Room Code:", rows[0].room_code, typeof rows[0].room_code);
    }

    const getTenantInfo = (name: string, room: string) => {
        // Priority: Check if room matches a SageID in DB tenants (since Payments use RoomCode field for SageID)
        const potentialSageId = room?.toString().trim();
        if (potentialSageId) {
            // Force string comparison and trim on both sides to be safe
            const dbTenantBySage = dbTenants.find(t => String(t.sageId).trim() === potentialSageId);
            if (dbTenantBySage) return dbTenantBySage;
        }

        // Secondary: Lookup by Name
        const norm = normalizeName(name);
        const dbTenantByName = dbTenants.find(t => normalizeName(t.tenantName) === norm);
        if (dbTenantByName) return dbTenantByName;
        
        return null;
    };
    
    return rows.map((r: PaymentRow) => {
        const tenant = getTenantInfo(r.tenant_name, r.room_code);

        // Debug log for a specific case if needed
        if (r.room_code === '190' && !tenant) {
            console.warn("Failed to find tenant for Sage ID 190 (Robert Cam)");
        }

        return {
            year: r.year,
            weekNumber: r.week_number,
            periodMonth: weekToMonthCode(r.year, r.week_number),
            sageId: tenant?.sageId || r.room_code,
            roomCode: tenant?.roomCode || r.room_code, 
            tenantName: tenant?.tenantName || r.tenant_name,
            transactionNo: r.transaction_no,
            date: r.transaction_date,
            reference: r.reference,
            type: r.transaction_type,
            details: r.details,
            amount: r.amount
        };
    });
}

export async function fetchTenants(): Promise<Tenant[]> {
  const { data: tenants, error } = await supabase
    .from('tenants')
    .select(`
      *,
      absentPeriods:tenant_absences(*)
      
    `)
    .order('tenant_name');

  if (error) {
    console.error('Error fetching tenants from DB:', error);
    return [];
  }

  return tenants.map((t: any) => ({
    id: t.id,
    sageId: t.sage_id,
    tenantName: t.tenant_name,
    roomCode: t.room_code,
    staffName: t.staff_name,
    weeklyRent: t.weekly_rent,
    startDate: t.start_date,
    endDate: t.end_date,
    status: t.status as 'active' | 'inactive',
    absentPeriods: t.absentPeriods?.map((a: any) => ({
      id: a.id,
      tenantId: a.tenant_id,
      startDate: a.start_date,
      endDate: a.end_date,
      reason: a.reason,
      notes: a.notes
    })) || [],
    rentHistory: t.rentHistory?.map((h: any) => ({
      id: h.id,
      tenantId: h.tenant_id,
      weeklyRent: h.weekly_rent,
      effectiveDate: h.effective_date
    })) || []
  }));
}

export async function createTenant(tenant: Omit<Tenant, 'id'>) {
  const { data, error } = await supabase
    .from('tenants')
    .insert({
      sage_id: tenant.sageId,
      tenant_name: tenant.tenantName,
      room_code: tenant.roomCode,
      staff_name: tenant.staffName,
      weekly_rent: tenant.weeklyRent,
      start_date: tenant.startDate,
      end_date: tenant.endDate,
      status: tenant.status
    })
    .select()
    .single();

  if (error) throw error;
  
  // Initial Rent History
  const historyToInsert: any[] = [];

  // Base entry from main fields
  if (tenant.weeklyRent !== undefined) {
      historyToInsert.push({
          tenant_id: data.id,
          weekly_rent: tenant.weeklyRent,
          effective_date: tenant.startDate || new Date().toISOString().split('T')[0]
      });
  }

  // Additional entries
  if (tenant.rentHistory && tenant.rentHistory.length > 0) {
      tenant.rentHistory.forEach(h => {
          historyToInsert.push({
              tenant_id: data.id,
              weekly_rent: h.weeklyRent,
              effective_date: h.effectiveDate
          });
      });
  }

  if (historyToInsert.length > 0) {
      const { error: histError } = await supabase.from('tenant_rent_history').insert(historyToInsert);
      if (histError) console.error('Error inserting rent history (table may be missing):', histError);
  }

  if (tenant.absentPeriods && tenant.absentPeriods.length > 0) {
    const absences = tenant.absentPeriods.map(a => ({
      tenant_id: data.id,
      start_date: a.startDate,
      end_date: a.endDate,
      reason: a.reason,
      notes: a.notes
    }));
    
    const { error: absError } = await supabase
      .from('tenant_absences')
      .insert(absences);
      
    if (absError) console.error('Error inserting absences:', absError);
  }
  
  return data;
}

export async function updateTenant(tenant: Tenant) {
  if (!tenant.id) throw new Error("Tenant ID required for update");
  
  // 1. Update basic info
  const { error: updateError } = await supabase
    .from('tenants')
    .update({
      sage_id: tenant.sageId,
      tenant_name: tenant.tenantName,
      room_code: tenant.roomCode,
      staff_name: tenant.staffName,
      weekly_rent: tenant.weeklyRent,
      start_date: tenant.startDate,
      end_date: tenant.endDate,
      status: tenant.status
    })
    .eq('id', tenant.id);

  if (updateError) throw updateError;

  // 2. Handle Absences
  const { data: existingAbsences } = await supabase
      .from('tenant_absences')
      .select('id')
      .eq('tenant_id', tenant.id);
  
  const incomingAbsenceIds = tenant.absentPeriods?.map(a => a.id).filter(Boolean) || [];
  const absencesToDelete = existingAbsences?.filter(a => !incomingAbsenceIds.includes(a.id)).map(a => a.id) || [];

  if (absencesToDelete.length > 0) {
      await supabase.from('tenant_absences').delete().in('id', absencesToDelete);
  }

  if (tenant.absentPeriods && tenant.absentPeriods.length > 0) {
      const absencesToUpsert = tenant.absentPeriods.map(a => ({
          id: a.id,
          tenant_id: tenant.id,
          start_date: a.startDate,
          end_date: a.endDate,
          reason: a.reason,
          notes: a.notes
      }));
      
      const newAbsences = absencesToUpsert.filter(a => !a.id);
      const existingAbsencesToUpdate = absencesToUpsert.filter(a => a.id);

      if (newAbsences.length > 0) await supabase.from('tenant_absences').insert(newAbsences);
      if (existingAbsencesToUpdate.length > 0) await supabase.from('tenant_absences').upsert(existingAbsencesToUpdate);
  }

  // 3. Handle Rent History
  const { data: existingHistory, error: historyError } = await supabase
      .from('tenant_rent_history')
      .select('id')
      .eq('tenant_id', tenant.id);
  
  if (historyError) {
      console.error('Error fetching rent history (table may be missing):', historyError);
  } else {
      const incomingHistoryIds = tenant.rentHistory?.map(h => h.id).filter(Boolean) || [];
      const historyToDelete = existingHistory?.filter(h => !incomingHistoryIds.includes(h.id)).map(h => h.id) || [];

      if (historyToDelete.length > 0) {
          await supabase.from('tenant_rent_history').delete().in('id', historyToDelete);
      }

      if (tenant.rentHistory && tenant.rentHistory.length > 0) {
          const historyToUpsert = tenant.rentHistory.map(h => ({
              id: h.id,
              tenant_id: tenant.id,
              weekly_rent: h.weeklyRent,
              effective_date: h.effectiveDate
          }));

          const newHistory = historyToUpsert.filter(h => !h.id);
          const existingHistoryToUpdate = historyToUpsert.filter(h => h.id);

          if (newHistory.length > 0) await supabase.from('tenant_rent_history').insert(newHistory);
          if (existingHistoryToUpdate.length > 0) await supabase.from('tenant_rent_history').upsert(existingHistoryToUpdate);
      }
  }
}

export async function addRentChange(history: RentHistory) {
    const { data, error } = await supabase
        .from('tenant_rent_history')
        .insert({
            tenant_id: history.tenantId,
            weekly_rent: history.weeklyRent,
            effective_date: history.effectiveDate
        })
        .select()
        .single();
        
    if (error) throw error;
    return data;
}

export async function deleteRentChange(id: string) {
    const { error } = await supabase
        .from('tenant_rent_history')
        .delete()
        .eq('id', id);
    if (error) throw error;
}

export async function addAbsentPeriod(absence: AbsentPeriod) {
   const { data, error } = await supabase
     .from('tenant_absences')
     .insert({
       tenant_id: absence.tenantId,
       start_date: absence.startDate,
       end_date: absence.endDate,
       reason: absence.reason,
       notes: absence.notes
     })
     .select()
     .single();
     
   if (error) throw error;
   return data;
}

export async function deleteAbsentPeriod(id: string) {
  const { error } = await supabase
    .from('tenant_absences')
    .delete()
    .eq('id', id);
    
  if (error) throw error;
}
