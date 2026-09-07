const fs = require('fs');
const { parse } = require('csv-parse/sync');

const files = fs.readdirSync('.').filter(f => f.endsWith('.csv'));
if (files.length === 0) {
  console.log('No .csv file found in current folder. Move your downloaded CSV into this folder to inspect.');
  process.exit(0);
}

const csvFile = files[0];
console.log(`Reading CSV File: ${csvFile}\n`);
const content = fs.readFileSync(csvFile, 'utf-8');
const records = parse(content, { columns: true, skip_empty_lines: true, trim: true });

if (records.length > 0) {
  console.log('Detected CSV Headers:');
  console.log(Object.keys(records[0]));
  console.log('\nSample First Row:');
  console.log(records[0]);
}
