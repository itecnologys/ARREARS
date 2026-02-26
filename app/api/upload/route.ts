
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import * as XLSX from 'xlsx';
import * as crypto from 'crypto';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Helper to clean numeric values
const cleanNumber = (val: any) => {
  if (typeof val === 'number') return val;
  if (!val) return 0;
  const cleaned = String(val).replace(/[^\d\.\-]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
};

// Helper to parse date (DD/MM/YYYY to YYYY-MM-DD)
const parseDate = (val: any) => {
  if (!val) return null;
  if (val instanceof Date) return val.toISOString().split('T')[0];
  
  const str = String(val).trim();
  // Check if already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  
  // Try DD/MM/YYYY
  const parts = str.split('/');
  if (parts.length === 3) {
    return `${parts[2]}-${parts[1]}-${parts[0]}`;
  }
  
  // Try Excel serial date
  if (!isNaN(Number(str))) {
    const date = new Date((Number(str) - (25567 + 2)) * 86400 * 1000);
    return date.toISOString().split('T')[0];
  }

  return null; // Invalid or unknown format
};

// ISO Week logic
function getWeekNumber(d: Date): [number, number] {
    d = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    d.setUTCDate(d.getUTCDate() + 4 - (d.getUTCDay() || 7));
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    return [d.getUTCFullYear(), weekNo];
}

function generateHash(row: any): string {
    const str = JSON.stringify(row);
    return crypto.createHash('sha256').update(str).digest('hex');
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const buffer = await file.arrayBuffer();
    const wb = XLSX.read(buffer, { type: 'array' });
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' }) as any[][];

    if (!rawData || rawData.length === 0) {
      return NextResponse.json({ error: 'Empty file' }, { status: 400 });
    }

    const processedRows: any[] = [];
    let importType = 'unknown';

    // --- Detection Logic ---
    // Check for "Block Format" (A/C: ... Name: ...)
    const isBlockFormat = rawData.some(row => 
      row.some((cell: any) => String(cell).toLowerCase().includes('a/c:')) &&
      row.some((cell: any) => String(cell).toLowerCase().includes('name:'))
    );

    if (isBlockFormat) {
      importType = 'sage_report_blocks';
      console.log('Detected Sage Report (Block Format)');
      
      let currentAc = '';
      let currentName = '';
      let headerFound = false;
      
      // Column indices
      let idxDate = -1;
      let idxAmount = -1;
      let idxRef = -1;
      let idxType = -1;
      let idxDetails = -1;
      let idxNo = -1;

      for (let i = 0; i < rawData.length; i++) {
        const row = rawData[i].map(c => String(c).trim());
        const lowerRow = row.map(c => c.toLowerCase());

        // 1. Detect Customer Block
        if (lowerRow.includes('a/c:') && lowerRow.includes('name:')) {
          const acIndex = lowerRow.indexOf('a/c:');
          const nameIndex = lowerRow.indexOf('name:');
          currentAc = row[acIndex + 1] || '';
          currentName = row[nameIndex + 1] || '';
          headerFound = false; // Reset header for new block
          continue;
        }

        // 2. Detect Header within Block
        if (!headerFound && lowerRow.includes('date') && (lowerRow.includes('amount') || lowerRow.includes('gross') || lowerRow.includes('outstanding'))) {
          idxDate = lowerRow.indexOf('date');
          idxAmount = lowerRow.indexOf('amount');
          if (idxAmount === -1) idxAmount = lowerRow.indexOf('gross'); // Fallback
          if (idxAmount === -1) idxAmount = lowerRow.indexOf('outstanding'); // Fallback 2
          
          idxRef = lowerRow.indexOf('ref');
          idxType = lowerRow.indexOf('type');
          idxDetails = lowerRow.indexOf('details');
          idxNo = lowerRow.indexOf('no');
          
          headerFound = true;
          continue;
        }

        // 3. Process Data Rows
        if (headerFound && currentAc) {
          if (lowerRow.includes('total:')) {
            headerFound = false; // End of block transactions
            continue;
          }

          // Skip empty rows or rows without date
          if (!row[idxDate] && !row[idxAmount]) continue;

          // Extract basic fields
          const date = parseDate(row[idxDate]);
          const type = idxType !== -1 ? row[idxType] : '';
          const details = idxDetails !== -1 ? row[idxDetails] : '';
          const amountStr = idxAmount !== -1 ? row[idxAmount] : '0';
          const amount = cleanNumber(amountStr);
          const ref = idxRef !== -1 ? row[idxRef] : '';
          const no = idxNo !== -1 ? row[idxNo] : '';

          // Logic to identify Sage ID
          // The user says "The room number on screens is actually the reference number used in the software that issues the files, this number is called SAGE ID. Rooms start with a letter and a number."
          // In the current block logic, 'currentAc' comes from "A/C: ...".
          // Let's assume currentAc IS the Sage ID based on user input.
          // And we should check if currentAc looks like "Letter+Number" to decide if it is a room or Sage ID?
          // Actually, the user says "Rooms start with a letter and a number".
          // And "The room number on screens ... is called SAGE ID".
          // So, SAGE ID = Room Code in the file? Or the other way around?
          // "O que temos do numero do quarto nas telas é na verdade o numero de referencia... chamado de SAGE ID"
          // It implies: What we display/import as 'room_code' currently (from A/C) is actually 'Sage ID'.
          // And 'Rooms' are something else (Letter+Number).
          
          // Let's store currentAc as sageId primarily, but our DB schema uses 'room_code' often as the join key.
          // For now, we will store currentAc in room_code column (as we did), but we acknowledge it is likely the Sage ID.
          // We will NOT change the DB schema yet, but ensure we capture this.
          
          // If the file contains a specific "Room" column, we haven't mapped it in block mode yet.
          // Usually in Sage reports, the "A/C" is the Account Code (Sage ID). The Name is the Tenant Name.
          // The Room might be part of the Name or not present in the payment file at all.
          
          if (date || amount !== 0) {
             let year = 0;
             let week = 0;
             if (date) {
                const d = new Date(date);
                if (!isNaN(d.getTime())) {
                   [year, week] = getWeekNumber(d);
                }
             }

             processedRows.push({
               room_code: currentAc,
               tenant_name: currentName,
               transaction_date: date,
               amount: Math.abs(amount), // Store absolute value usually for payments? Or keep sign? keeping sign is safer for raw.
               transaction_type: type,
               details: details,
               reference: ref,
               transaction_no: no,
               year: year,
               week_number: week,
               // Store raw row for "ALL fields" requirement
               raw_data: {
                 source: 'sage_report_blocks',
                 original_row: row,
                 block_context: { ac: currentAc, name: currentName }
               }
             });
          }
        }
      }

    } else {
      // tabular format (standard CSV/Excel)
      importType = 'tabular';
      console.log('Detected Tabular Format');
      
      // Try to find header
      let headerRowIndex = 0;
      for(let i=0; i<Math.min(20, rawData.length); i++) {
        const r = rawData[i].map(c => String(c).toLowerCase());
        if (r.includes('date') || r.includes('amount') || r.includes('tenant') || r.includes('name')) {
          headerRowIndex = i;
          break;
        }
      }
      
      const headers = rawData[headerRowIndex].map(c => String(c).trim());
      
      // Map headers to DB columns
      const colMap: Record<string, number> = {};
      headers.forEach((h, idx) => {
        const lower = h.toLowerCase();
        if (lower.includes('date')) colMap['date'] = idx;
        if (lower.includes('amount') || lower.includes('gross') || lower.includes('net')) colMap['amount'] = idx; // Prefer Gross usually
        if (lower.includes('tenant') || lower.includes('name')) colMap['name'] = idx;
        if (lower.includes('room') || lower.includes('code')) colMap['room'] = idx;
        if (lower.includes('ref')) colMap['ref'] = idx;
        if (lower.includes('type')) colMap['type'] = idx;
        if (lower.includes('detail')) colMap['details'] = idx;
        if (lower.includes('no')) colMap['no'] = idx;
      });

      // Process rows
      for (let i = headerRowIndex + 1; i < rawData.length; i++) {
        const row = rawData[i];
        if (!row || row.length === 0) continue;

        const date = colMap['date'] !== undefined ? parseDate(row[colMap['date']]) : null;
        const amount = colMap['amount'] !== undefined ? cleanNumber(row[colMap['amount']]) : 0;
        const name = colMap['name'] !== undefined ? row[colMap['name']] : '';
        const room = colMap['room'] !== undefined ? row[colMap['room']] : '';
        
        // If row has no meaningful data, skip
        if (!date && amount === 0 && !name) continue;

        let year = 0;
        let week = 0;
        if (date) {
            const d = new Date(date);
            if (!isNaN(d.getTime())) {
                [year, week] = getWeekNumber(d);
            }
        }

        processedRows.push({
          room_code: room,
          tenant_name: name,
          transaction_date: date,
          amount: amount,
          transaction_type: colMap['type'] !== undefined ? row[colMap['type']] : '',
          details: colMap['details'] !== undefined ? row[colMap['details']] : '',
          reference: colMap['ref'] !== undefined ? row[colMap['ref']] : '',
          transaction_no: colMap['no'] !== undefined ? row[colMap['no']] : '',
          year: year,
          week_number: week,
          raw_data: {
             source: 'tabular',
             headers: headers,
             original_row: row
          }
        });
      }
    }

    // Insert into Supabase with duplicate check
    let insertedCount = 0;
    let skippedCount = 0;

    if (processedRows.length > 0) {
      // Fetch existing hashes or keys to avoid duplicates
      // Since we don't have a unique constraint on DB yet, we can check by (date, amount, tenant, room, ref) or hash
      // Best approach without modifying DB schema for UNIQUE index is to query existence.
      // But querying 1 by 1 is slow. 
      // Let's generate a temporary ID/Hash for each row and check if it exists in a "dedup" way.
      // Alternatively, assume the user wants to reload data and we should avoid inserting EXACT duplicates.
      
      // We will check against existing records for the same year/week if possible to narrow down.
      const years = [...new Set(processedRows.map(r => r.year).filter((y: number) => y > 0))];
      
      // Fetch existing payments for these years to compare
      let existingSignatures = new Set<string>();
      
      if (years.length > 0) {
          const { data: existingData } = await supabase
            .from('payments')
            .select('transaction_date, amount, room_code, tenant_name, transaction_no, reference')
            .in('year', years);
            
          if (existingData) {
              existingData.forEach((r: any) => {
                  // Create a signature for comparison
                  const sig = `${r.transaction_date}|${r.amount}|${r.room_code}|${r.tenant_name}|${r.transaction_no}|${r.reference}`;
                  existingSignatures.add(sig);
              });
          }
      }

      const uniqueRowsToInsert = processedRows.filter(r => {
          const sig = `${r.transaction_date}|${r.amount}|${r.room_code}|${r.tenant_name}|${r.transaction_no}|${r.reference}`;
          if (existingSignatures.has(sig)) {
              skippedCount++;
              return false;
          }
          // Also check for duplicates within the current batch!
          const batchSig = "BATCH:" + sig;
          if (existingSignatures.has(batchSig)) {
             skippedCount++;
             return false;
          }
          existingSignatures.add(batchSig);
          return true;
      });

      // Insert in batches of 1000
      const BATCH_SIZE = 1000;
      for (let i = 0; i < uniqueRowsToInsert.length; i += BATCH_SIZE) {
        const batch = uniqueRowsToInsert.slice(i, i + BATCH_SIZE);
        const { error } = await supabase.from('payments').insert(batch);
        
        if (error) {
          console.error('Insert error:', error);
          // Fallback: Try inserting without raw_data if it fails (maybe column missing)
          if (error.message.includes('raw_data')) {
             const cleanBatch = batch.map(({ raw_data, ...rest }) => rest);
             const { error: retryError } = await supabase.from('payments').insert(cleanBatch);
             if (retryError) throw retryError;
          } else {
             throw error;
          }
        }
        insertedCount += batch.length;
      }
    }

    // Prepare preview data (first 50 rows)
    const previewData = processedRows.slice(0, 50).map(r => ({
        ...r
        // We now include raw_data in preview as requested
    }));

    return NextResponse.json({ 
      success: true, 
      count: insertedCount,
      skipped: skippedCount,
      totalProcessed: processedRows.length,
      type: importType,
      preview: previewData
    });

  } catch (error: any) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}
