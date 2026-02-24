
import 'dotenv/config';
import path from "node:path";
import fs from "node:fs";
import * as XLSX from "xlsx";
import { createClient } from '@supabase/supabase-js';

// Configuração do Supabase
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY; // Usar a chave de serviço (service_role) seria melhor para ignorar RLS, mas vamos tentar com a anon por enquanto ou pedir pro usuário configurar.
// Nota: Para inserção em massa, idealmente usaríamos a SERVICE_ROLE_KEY, mas ela não deve ser exposta no client-side.
// Como este é um script de backend (node), o usuário deve colocar a SERVICE_ROLE_KEY no .env.local se tiver RLS ativado que bloqueie anon.

if (!supabaseUrl || !supabaseKey) {
  console.error('Erro: NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY devem estar definidos no .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// --- Lógica de Leitura de Arquivos (Copiada de build-yearly-data.ts) ---

const rootDir = path.resolve(__dirname, "..");
// Ajuste o caminho conforme necessário. No script original era '..', '..', 'RENTARREARS'.
// Aqui assumimos que a pasta 'PAYMENTS-REPORTS-BY-WEEK' está dentro do projeto atual, pois copiamos ela anteriormente.
const weeksDir = path.join(rootDir, "PAYMENTS-REPORTS-BY-WEEK");

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

  let headerIndex = -1;
  for (let i = 0; i < rows.length; i += 1) {
    const r = rows[i].map((v) => String(v || "").trim().toLowerCase());
    if (r.includes("type") && r.includes("a/c") && r.includes("gross")) {
      headerIndex = i;
      break;
    }
  }

  if (headerIndex === -1) {
    // Format B logic (simplified for brevity, assuming same as original)
    // ... (Copiando lógica complexa do original seria ideal, mas vou simplificar para Format A primeiro se for o caso comum, 
    // mas o original tinha fallback para Format B. Vou copiar a lógica completa para garantir)
    
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
        if (lower.includes("outstanding")) outstandingLabelIdx = lower.indexOf("outstanding");
        continue;
      }
      if (transHeaderFound) {
        if (lower.includes("total:")) {
          transHeaderFound = false;
          continue;
        }
        const hasAny = line.some((v) => v.length > 0);
        if (!hasAny) continue;
        
        const toNum = (s: string) => Number(String(s ?? "").replace(/[^\d\.\-]/g, ""));
        const getAt = (idx: number) => idx !== -1 ? toNum(line[idx] as string) : NaN;
        
        let amt = NaN;
        const amtCol = getAt(amountLabelIdx);
        if (Number.isFinite(amtCol) && Math.abs(amtCol) > 0) amt = amtCol;
        else {
           const outCol = getAt(outstandingLabelIdx);
           if (Number.isFinite(outCol) && Math.abs(outCol) > 0) amt = outCol;
           else {
             // fallback logic
             const startScan = detailsIdx !== -1 ? detailsIdx + 1 : 0;
             for (let j = startScan; j < line.length; j += 1) {
               const n = toNum(line[j] as string);
               if (Number.isFinite(n) && Math.abs(n) > 0) { amt = n; break; }
             }
             if (!Number.isFinite(amt)) {
                for (let j = line.length - 1; j >= 0; j -= 1) {
                  const n = toNum(line[j] as string);
                  if (Number.isFinite(n)) { amt = n; break; }
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

  // Format A logic
  const header = rows[headerIndex].map((v) => String(v || "").trim());
  const labeledCols = header
    .map((h, idx) => ({ label: String(h || "").trim().toLowerCase(), idx }))
    .filter((c) => c.label.length > 0);
  const getVal = (row: (string | number)[], label: string): string => {
    const col = labeledCols.find((c) => c.label === label);
    if (!col) return "";
    return String(row[col.idx] ?? "").trim();
  };

  for (let i = headerIndex + 1; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row || row.length === 0) continue;
    let rawGross = getVal(row, "gross");
    if (!rawGross) rawGross = getVal(row, "net");
    let gross = Number(String(rawGross ?? "").replace(/[^\d\.\-]/g, ""));
    if (!Number.isFinite(gross)) {
       for (let j = row.length - 1; j >= 0; j -= 1) {
         const v = String(row[j] ?? "");
         const cleaned = v.replace(/[^\d\.\-]/g, "");
         if (!cleaned) continue;
         const n = Number(cleaned);
         if (Number.isFinite(n)) { gross = n; break; }
       }
    }
    if (!Number.isFinite(gross)) continue;
    const amount = Math.abs(gross);
    const ac = getVal(row, "a/c");
    const reference = getVal(row, "reference");
    const typeVal = getVal(row, "type").toUpperCase();
    const detailsVal = getVal(row, "details").toUpperCase();
    if (typeVal !== "SA" || detailsVal !== "CASH") continue;
    const noVal = getVal(row, "no.");
    const dateVal = getVal(row, "date");
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
  return result;
}

// --- Fim da Lógica de Leitura ---

async function migrate() {
  const years = [2024, 2025, 2026];
  let totalInserted = 0;

  console.log('Iniciando migração para o Supabase...');

  for (const year of years) {
    const weeks = findWeekFiles(year);
    console.log(`Ano ${year}: Encontrados ${weeks.length} arquivos semanais.`);

    for (const info of weeks) {
      const rows = readWeeklyFile(info);
      if (rows.length === 0) continue;

      // Transformar para o formato do banco de dados
      // Nota: transaction_date precisa ser convertido para formato DATE do SQL (YYYY-MM-DD) se possível
      // Os dados originais vêm como string dd/mm/yyyy ou algo assim? Precisamos verificar.
      // Se vier como string genérica, talvez seja melhor salvar como text ou tentar converter.
      // Vou assumir que o banco aceita text no transaction_date se falhar o cast, ou melhor, 
      // vou mudar o schema para transaction_date ser TEXT temporariamente se for muito variado, 
      // ou tentar converter aqui. O schema definiu como DATE.
      
      const dbRows = rows.map(r => {
         // Tentar converter data 'DD/MM/YYYY' para 'YYYY-MM-DD'
         let dateIso = null;
         if (r.date) {
            const parts = r.date.split('/');
            if (parts.length === 3) {
                // assumindo DD/MM/YYYY
                dateIso = `${parts[2]}-${parts[1]}-${parts[0]}`;
            } else {
                dateIso = r.date; // tenta passar direto
            }
         }

         return {
            room_code: r.roomCode,
            tenant_name: r.tenantName,
            amount: r.amount,
            transaction_no: r.transactionNo,
            transaction_date: dateIso, 
            reference: r.reference,
            transaction_type: r.type,
            details: r.details,
            staff_name: r.staffName,
            week_number: r.weekNumber,
            year: info.year
         };
      });

      // Inserir em lotes
      const { error } = await supabase.from('payments').insert(dbRows);
      
      if (error) {
        console.error(`Erro ao inserir semana ${info.weekNumber}/${year}:`, error);
      } else {
        console.log(`Inseridos ${dbRows.length} registros da semana ${info.weekNumber}/${year}`);
        totalInserted += dbRows.length;
      }
    }
  }

  console.log(`Migração concluída! Total de registros inseridos: ${totalInserted}`);
}

migrate().catch(console.error);
