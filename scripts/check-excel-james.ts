import * as XLSX from 'xlsx';
import * as path from 'path';
import * as fs from 'fs';

const baseDir = path.join(process.cwd(), 'PAYMENTS-REPORTS-BY-WEEK', '2026');
const files = [
    'Payments_week_1_2026.xlsx',
    'Payments_week_2_2026.xlsx',
    'Payments_week_3_2026.xlsx',
    'Payments_week_4_2026.xlsx',
    'Payments_week_5_2026.xlsx',
    'Payments_week_01_to_52_from_2025.xlsx'
];

function checkFile(filename: string) {
    const filePath = path.join(baseDir, filename);
    if (!fs.existsSync(filePath)) {
        console.log(`File not found: ${filename}`);
        return;
    }

    console.log(`\nChecking ${filename}...`);
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet, { header: 1 }); // Array of arrays

    // Find row index where James appears
    const jamesRowIndex = data.findIndex((row: any) => {
        return JSON.stringify(row).toLowerCase().includes('james fitzgerald');
    });

    if (jamesRowIndex === -1) {
        console.log("  James not found.");
    } else {
        console.log(`  James found at row ${jamesRowIndex}. Context:`);
        // Print 2 rows before and 5 rows after
        const start = Math.max(0, jamesRowIndex - 2);
        const end = Math.min(data.length, jamesRowIndex + 8);
        
        for (let i = start; i < end; i++) {
            console.log(`  Row ${i}:`, JSON.stringify(data[i]));
        }
    }
}

files.forEach(checkFile);
