import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseExpress } from '@ifc-factory/express-parser';
import { generate } from './generator.js';

const args = process.argv.slice(2);

if (args.length < 2) {
  console.error('Usage: ifc-codegen <schema.exp> <output-dir>');
  process.exit(1);
}

const schemaPath = path.resolve(args[0]!);
const outputDir = path.resolve(args[1]!);

console.log(`Reading schema: ${schemaPath}`);
const source = fs.readFileSync(schemaPath, 'utf-8');

console.log('Parsing EXPRESS schema...');
const ast = parseExpress(source);

console.log(`Schema: ${ast.name}, ${ast.declarations.length} declarations`);

// Clean output dir
if (fs.existsSync(outputDir)) {
  fs.rmSync(outputDir, { recursive: true });
}
fs.mkdirSync(outputDir, { recursive: true });

console.log(`Generating TypeScript to: ${outputDir}`);
generate(ast, { outputDir });

console.log('Done!');
