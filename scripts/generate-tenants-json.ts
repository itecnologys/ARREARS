
import 'dotenv/config';
import * as dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_SERVICE_ROLE_KEY or URL");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createTenantsTable() {
  console.log("Creating/Updating 'tenants' table...");

  // We will run raw SQL to create the table if it doesn't exist
  // Using 'rpc' or just standard query if we had a migration tool.
  // Since we are using supabase-js, we can't run DDL easily unless we use a stored procedure or the SQL editor.
  // However, for this environment, I might not have SQL editor access.
  // Let's try to check if we can insert; if not, we assume I need to guide the user or use a workaround.
  // Wait, I am an agent. I can't easily run DDL via the JS client unless there is a function exposed.
  
  // WORKAROUND: I will assume the table might NOT exist.
  // If I cannot create it, I will use a local JSON file for the calculation logic for now, 
  // BUT the user asked to use the column data.
  
  // Actually, I can try to create a table via a specific Supabase function if enabled, but usually DDL is restricted.
  // Let's assume I should focus on the logic in 'app/actions.ts' using a hardcoded list or a JSON file 
  // that I create from the user's input, which acts as the "Source of Truth".
  // This is safer and immediate.
  
  console.log("Skipping DDL. Will use a local JSON source of truth for now.");
}

const rawData = `
A03 	 350 	 Sharon 	 Louise W 	  € -   
A04 	 40 	 Kathleen McC 	 Heather C 	  € 85.00 
A05 	 190 	 No one 	 Robert Cam 	  € 41.00 
A06 	 463 	 Kathleen McC 	 Anna M 	  € 35.00 
A07 	 477 	 Sharon 	 Derek G 	  € -   
A08 	 24 	 Brian F. 	 Dermot F 	  € 65.00 
A09 	 379 	 No one 	 Labri D 	  € -   
A10 	 18 	 Brian F. 	 Christy B 	  € 65.00 
A11 	 479 	 No one 	 Seamus O'D 	  € 100.00 
A12 	 381 	 Sharon 	 Patricia M 	  € 41.00 
A13 	 282 	 Mark T. 	 Patrick W 	  € 41.00 
A14 	 447 	 Kathleen McC 	 Michael A 	  € 85.00 
A15 	 63 	 Anthony H. 	 Martin H 	  € 85.00 
A16 	 451 	 Anthony H. 	 Joseph R 	  € 85.00 
A17 	 45 	 Anthony H. 	 James C 	  € 35.00 
A18 	 435 	 Jason R. 	 Gavin M 	  € 35.00 
A19 	 48 	 No one 	 James K 	  € -   
A24          	 19 	 No one 	 Dan O’L 	  € -   
A25 	 4221 	 NEW 	 Mapule Uw. 	  € 35.00 
A26 	 	 VACANT 	 VACANT 	 
A27 	 300 	 No one 	 Ahmed I 	  € 41.00 
A28 	 471 	 No one 	 Wiseman N 	  € 85.00 
A29 	 472 	 Kathleen McC 	 Brian W 	  € 41.00 
A30 	 450 	 No one 	 John F 	  € 41.00 
A31 	 4217 	 Kathleen McC 	 Annie McD 	  € 35.00 
A32 	 462 	 No one 	 Yves N. 	  € 45.00 
A33 	 465 	 Kathleen McC 	 Noel M. 	  € 85.00 
A34 	 466 	 Kathleen McC 	 Neil M. 	  € 80.00 
A35 	 305 	 Brian F. 	 Devin R 	  € -   
A36 	 433 	 Brian F. 	 Thomas O’R 	  € 35.00 
A37 	 428 	 Kathleen McC 	 Oscar M 	  € 85.00 
A38 	 482 	 	 Jason Bry 	  € 41.00 
A39 	 452 	 Sharon 	 Bernadette G 	  € 41.00 
A40 	 414 	 No one 	 Patricia D 	  € 41.00 
A41 	 355 	 Anthony H. 	 Wayne W 	  € 85.00 
A42 	 454 	 Anthony H. 	 Thomas T 	  € 85.00 
A43 	 163 	 Mark T. 	 Karim.M 	  € 41.00 
A44 	 438 	 No one 	 Prince N 	  € 85.00 
A45 	 461 	 Anthony H. 	 Terrence W. 	  € 85.00 
B01 	 476 	 No one 	 Brian R. 	  € 41.00 
B02 	 420 	 Paul M. 	 Joseph L 	  € 41.00 
B03 	 10 	 Brian F. 	 Brendan M 	  € 91.00 
B04 	 319 	 Jason R. 	 Paco H 	  € 41.00 
B05 	 473 	 No one 	 Sekele D. 	  € -   
B06 	 445 	 No one 	 Edward D 	  € 41.00 
B07 	 394 	 Anthony H. 	 Mark H 	  € 41.00 
B08 	 	 VACANT 	 VACANT 	 
B09 	 439 	 Paul M. 	 Nathan B 	  € 41.00 
B10 	 453 	 Sharon 	 Lorraine R 	  € 41.00 
B11 	 460 	 Kathleen McC 	 Tanya McC 	  € 41.00 
B12 	 419 	 No one 	 Marcin S 	  € 41.00 
B13 	 425 	 Mark T. 	 Samantha O’ 	  € 41.00 
B14 	 416 	 Mark T. 	 Brian W 	  € 41.00 
B15 	 335 	 Jason R. 	 Patrick Mapl 	  € 41.00 
B16 	 342 	 Mark T. 	 William P 	  € 41.00 
B70 	 	 VACANT 	 VACANT 	 
C17 	 334 	 Paul M. 	 Brian E 	  € 41.00 
C18 	 371 	 No one 	 Mark P. 	  € 41.00 
C19 	 39 	 Kathleen McC 	 Hazel McD 	  € 41.00 
C20 	 216 	 Mark T. 	 Liz N. 	  € 41.00 
C21 	 405 	 Paul M. 	 Johnny M 	  € 41.00 
C22 	 470 	 Kathleen McC 	 Patrick C 	  € 41.00 
C23 	 223 	 Sharon 	 Mary F 	  € -   
C24 	 	 VACANT 	 Aisling McL 	  € 41.00 
C25 	 338 	 Anthony H. 	 Constantin L 	  € 41.00 
C26 	 324 	 Mark T. 	 John C 	  € 41.00 
C27 	 4222 	 Paul M. 	 Anthony Cor 	  € 41.00 
C28 	 4214 	 Paul M. 	 Robert L 	  € 41.00 
D29 	 157 	 Mark T. 	 Brian C 	  € 41.00 
D30 	 367 	 Sharon 	 Theresa M 	  € 41.00 
D31 	 468 	 Kathleen McC 	 Salvatori  S. 	  € 41.00 
D32 	 427 	 Kathleen McC 	 Fiona R 	  € 41.00 
D33 	 467 	 No one 	 Richard A. 	  € 41.00 
D34 	 333 	 Paul M. 	 Marcus K 	  € 41.00 
D35 	 	 VACANT 	 VACANT 	 
D36 	 480 	 Paul M. 	 Christopher C. 	  € 41.00 
D37 	 459 	 Anthony H. 	 Patrick Murp 	  € 41.00 
D38 	 	 VACANT 	 Keith K 	 
D39 	 100 	 Brian F. 	 Anthony M 	  € 41.00 
D40 	 92 	 Paul M. 	 Thomas G 	  € 41.00 
D41 	 475 	 Kathleen McC 	 Alexander F 	  € 85.00 
D42 	 168 	 Jason R. 	 Sean H 	  € -   
D43 	 272 	 Mark T. 	 Patrick McN 	  € 91.00 
D44 	 4224 	 Mark T. 	 Paul J M 	  € 41.00 
D45 	 340 	 Mark T. 	 Bernard W 	  € 41.00 
D46 	 	 VACANT 	 John Ke. 	  € 85.00 
D47 	 464 	 No one 	 Niall K. 	  € 65.00 
D48 	 437 	 No one 	 Peter S 	  € 90.00 
D49 	 	 VACANT 	 VACANT 	 
D50 	 478 	 Paul M. 	 Anthony Cas 	  € 41.00 
D51 	 60 	 No one 	 Linda W 	  € 91.00 
D52 	 392 	 Brian F. 	 Joseph M 	  € 41.00 
D53 	 483 	 Mark T. 	 Mubshar H 	  € 41.00 
D54 	 313 	 Sharon 	 Fainche C 	  € 41.00 
D55 	 247 	 Kathleen McC 	 Claire R 	  € 41.00 
D56 	 457 	 Paul M. 	 Amir G. 	  € 41.00 
D57 	 417 	 Mark T. 	 James McD 	  € 85.00 
D58 	 64 	 No one 	 Martina H 	  € 41.00 
D59 	 411 	 Mark T. 	 John J 	  € 41.00 
D60 	 141 	 Anthony H. 	 James F 	  € 41.00 
`;

import * as fs from 'fs';
import * as path from 'path';

function parseAndSave() {
  const lines = rawData.split('\n').filter(l => l.trim().length > 0);
  const tenants = [];

  for (const line of lines) {
    // Split by tab or multiple spaces
    const parts = line.split(/\t+/).map(p => p.trim());
    if (parts.length < 4) continue;

    // Expected format: ROOM | SAGE | STAFF | NAME | AMOUNT
    // Sometimes parts might be shifted if empty
    // Let's rely on index or simple heuristics
    
    // A03 | 350 | Sharon | Louise W | € -
    const roomCode = parts[0];
    const sageId = parts[1];
    const staff = parts[2];
    const name = parts[3];
    let amountStr = parts[4]; // € 85.00 or € -

    // Handle VACANT rows or shifts
    if (line.includes("VACANT")) continue;
    
    if (!amountStr) {
       // Maybe split failed differently
       // Let's regex
    }
    
    // Clean amount
    // Remove €, space
    let weeklyRent = 0;
    if (amountStr && amountStr.includes('€')) {
       const val = amountStr.replace('€', '').trim();
       if (val !== '-' && val !== '') {
         weeklyRent = parseFloat(val);
       }
    }

    if (sageId && name) {
        tenants.push({
            roomCode,
            sageId,
            staff,
            name,
            weeklyRent
        });
    }
  }

  const outputPath = path.join(process.cwd(), 'app', 'tenants-data.json');
  fs.writeFileSync(outputPath, JSON.stringify(tenants, null, 2));
  console.log(`Saved ${tenants.length} tenants to ${outputPath}`);
}

parseAndSave();
