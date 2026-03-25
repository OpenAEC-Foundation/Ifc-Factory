/**
 * DXF ASCII tokenizer -- pure TypeScript, no external dependencies.
 *
 * Reads a DXF text (ASCII) file and yields [groupCode, typedValue] pairs.
 */

/** Type alias for a parsed DXF value. */
export type DxfValue = string | number | boolean;

/** A single DXF token: [groupCode, typedValue]. */
export type DxfToken = [number, DxfValue];

/**
 * Return the expected value type key for a DXF group code.
 */
function valueTypeForCode(code: number): 'str' | 'float' | 'int' | 'bool' {
  if (code >= 0 && code <= 9) return 'str';
  if (code >= 10 && code <= 39) return 'float';
  if (code >= 40 && code <= 59) return 'float';
  if (code >= 60 && code <= 79) return 'int';
  if (code >= 90 && code <= 99) return 'int';
  if (code === 100) return 'str';
  if (code === 102) return 'str';
  if (code === 105) return 'str';
  if (code >= 110 && code <= 149) return 'float';
  if (code >= 160 && code <= 169) return 'int';
  if (code >= 170 && code <= 179) return 'int';
  if (code >= 210 && code <= 239) return 'float';
  if (code >= 270 && code <= 289) return 'int';
  if (code >= 290 && code <= 299) return 'bool';
  if (code >= 300 && code <= 309) return 'str';
  if (code >= 310 && code <= 319) return 'str';
  if (code >= 320 && code <= 369) return 'str';
  if (code >= 370 && code <= 379) return 'int';
  if (code >= 380 && code <= 389) return 'int';
  if (code >= 390 && code <= 399) return 'str';
  if (code >= 410 && code <= 419) return 'str';
  if (code >= 420 && code <= 429) return 'int';
  if (code >= 430 && code <= 439) return 'str';
  if (code >= 440 && code <= 449) return 'int';
  if (code === 999) return 'str';
  if (code >= 1000 && code <= 1009) return 'str';
  if (code >= 1010 && code <= 1059) return 'float';
  if (code >= 1060 && code <= 1071) return 'int';
  return 'str';
}

/**
 * Convert a raw string value to the appropriate typed value.
 */
function castValue(code: number, raw: string): DxfValue {
  const vtype = valueTypeForCode(code);
  if (vtype === 'float') {
    const v = parseFloat(raw);
    return isNaN(v) ? 0.0 : v;
  }
  if (vtype === 'int') {
    const v = parseInt(raw, 10);
    return isNaN(v) ? 0 : v;
  }
  if (vtype === 'bool') {
    const v = parseInt(raw, 10);
    return isNaN(v) ? false : v !== 0;
  }
  return raw;
}

/**
 * Yield [groupCode, typedValue] pairs from DXF ASCII text.
 * Handles both DOS (CRLF) and Unix (LF) line endings.
 */
export function* tokenize(content: string): Generator<DxfToken, void, undefined> {
  // Normalize line endings to LF, then split.
  const lines = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
  let idx = 0;
  const length = lines.length;

  while (idx + 1 < length) {
    const codeStr = lines[idx].trim();
    const valStr = lines[idx + 1].trim();
    idx += 2;

    if (codeStr === '') continue;

    const code = parseInt(codeStr, 10);
    if (isNaN(code)) continue;

    yield [code, castValue(code, valStr)];
  }
}
