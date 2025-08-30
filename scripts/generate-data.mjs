import { writeFileSync } from "fs";
import { join } from "path";

const CUSTOMERS = Array.from({ length: 16 }, (_, i) => `C${String(i+1).padStart(3,"0")}`);
const YEARS = [2021, 2022, 2023, 2024, 2025];

function randomTxForCustomer(cid) {
  const count = 10 + Math.floor(Math.random()*10);
  const txs = [];
  for (let i=0; i<count; i++) {
    const year = YEARS[Math.floor(Math.random()*YEARS.length)];
    const month = 1 + Math.floor(Math.random()*12);
    const day = 1 + Math.floor(Math.random()*28);
    const base = [40, 55, 75, 95, 120, 150, 200][Math.floor(Math.random()*7)];
    const jitter = Math.random()*20 - 10;
    const amount = Math.max(1, +(base + jitter).toFixed(2));
    const txId = `T${cid.slice(1)}${String(i+1).padStart(4,"0")}`;
    const date = `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    txs.push({ customerId: cid, transactionId: txId, amount, date });
  }
  return txs;
}

const all = CUSTOMERS.flatMap(randomTxForCustomer);
const file = join(process.cwd(), "public", "data", "transactions.json");
writeFileSync(file, JSON.stringify(all, null, 2));
console.log(`Wrote ${all.length} transactions for ${CUSTOMERS.length} customers → ${file}`);
