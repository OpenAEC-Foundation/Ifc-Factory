import {
  StepDerived,
  StepEntityRef,
  StepEnum,
  StepTypedValue,
  type StepFile,
  type StepHeader,
  type StepValue,
} from './types.js';
import { encodeStepString } from './unicode.js';

export function writeStep(file: StepFile): string {
  const lines: string[] = [];

  lines.push('ISO-10303-21;');
  lines.push('HEADER;');
  lines.push(writeFileDescription(file.header));
  lines.push(writeFileName(file.header));
  lines.push(writeFileSchema(file.header));
  lines.push('ENDSEC;');
  lines.push('DATA;');

  // Sort entities by ID for deterministic output
  const sorted = [...file.entities.entries()].sort((a, b) => a[0] - b[0]);
  for (const [id, entity] of sorted) {
    const attrs = entity.attributes.map(writeValue).join(',');
    lines.push(`#${id}=${entity.typeName}(${attrs});`);
  }

  lines.push('ENDSEC;');
  lines.push('END-ISO-10303-21;');

  return lines.join('\n');
}

function writeFileDescription(header: StepHeader): string {
  const desc = header.description.map((s) => `'${encodeStepString(s)}'`).join(',');
  return `FILE_DESCRIPTION((${desc}),'${encodeStepString(header.implementationLevel)}');`;
}

function writeFileName(header: StepHeader): string {
  const author = header.author.map((s) => `'${encodeStepString(s)}'`).join(',');
  const org = header.organization.map((s) => `'${encodeStepString(s)}'`).join(',');
  return [
    "FILE_NAME('",
    encodeStepString(header.name),
    "','",
    encodeStepString(header.timeStamp),
    "',(", author, "),(", org, "),'",
    encodeStepString(header.preprocessorVersion),
    "','",
    encodeStepString(header.originatingSystem),
    "','",
    encodeStepString(header.authorization),
    "');",
  ].join('');
}

function writeFileSchema(header: StepHeader): string {
  const schemas = header.schemas.map((s) => `'${encodeStepString(s)}'`).join(',');
  return `FILE_SCHEMA((${schemas}));`;
}

function writeValue(value: StepValue): string {
  if (value === null) return '$';
  if (typeof value === 'boolean') return value ? '.T.' : '.F.';
  if (typeof value === 'number') {
    if (Number.isInteger(value)) return value.toString();
    // Ensure real numbers have a decimal point and proper formatting
    let s = value.toString();
    if (!s.includes('.') && !s.includes('e') && !s.includes('E')) {
      s += '.';
    }
    return s;
  }
  if (typeof value === 'string') return `'${encodeStepString(value)}'`;
  if (value instanceof StepDerived) return '*';
  if (value instanceof StepEntityRef) return `#${value.id}`;
  if (value instanceof StepEnum) return `.${value.value}.`;
  if (value instanceof StepTypedValue) {
    return `${value.typeName}(${writeValue(value.value)})`;
  }
  if (Array.isArray(value)) {
    return `(${value.map(writeValue).join(',')})`;
  }
  return '$';
}
