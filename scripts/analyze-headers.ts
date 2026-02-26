
import * as XLSX from 'xlsx';
import * as path from 'path';

const files = [
  path.join(__dirname, '../PAYMENTS-REPORTS-BY-WEEK/2025/complet_2025.xlsx'),
  path.join(__dirname, '../PAYMENTS-REPORTS-BY-WEEK/2026/Payments_week_01_to_52_from_2025.xlsx')
];

files.forEach(file => {
  console.log(`\n--- Analisando arquivo: ${file} ---`);
  try {
    const wb = XLSX.readFile(file);
    const sheetName = wb.SheetNames[0];
    const sheet = wb.Sheets[sheetName];
    const json = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0, defval: '' });
    
    if (json.length > 0) {
      // Tentar encontrar a linha de cabeçalho (procurando por "Date" ou "Reference" ou "Amount")
      let headerRow = json[0] as any[];
      let headerIndex = 0;
      
      // Heurística simples para achar o cabeçalho se não for a primeira linha
      for(let i=0; i<Math.min(20, json.length); i++) {
        const row = (json[i] as any[]).map(c => String(c).toLowerCase());
        if (row.includes('date') || row.includes('reference') || row.includes('amount') || row.includes('gross')) {
           headerRow = json[i] as any[];
           headerIndex = i;
           break;
        }
      }

      console.log(`Cabeçalho encontrado na linha ${headerIndex + 1}:`);
      console.log(headerRow.filter(c => c !== '').join(' | '));
      
      console.log(`\nExemplo de dados (linha ${headerIndex + 2}):`);
      if (json.length > headerIndex + 1) {
          console.log((json[headerIndex + 1] as any[]).join(' | '));
      }
    } else {
      console.log('Arquivo vazio ou ilegível.');
    }
  } catch (e: any) {
    console.error(`Erro ao ler arquivo: ${e.message}`);
  }
});
