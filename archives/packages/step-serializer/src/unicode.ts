export function decodeStepString(raw: string): string {
  let result = '';
  let i = 0;

  while (i < raw.length) {
    if (raw[i] === '\\' && i + 1 < raw.length) {
      if (raw[i + 1] === 'S' && raw[i + 2] === '\\') {
        // \S\c — ISO 8859-1 high character
        const charCode = (raw.charCodeAt(i + 3) ?? 0) + 128;
        result += String.fromCharCode(charCode);
        i += 4;
        continue;
      }

      if (raw[i + 1] === 'X' && raw[i + 2] === '\\') {
        // \X\HH — single hex byte
        const hex = raw.slice(i + 3, i + 5);
        result += String.fromCharCode(Number.parseInt(hex, 16));
        i += 5;
        continue;
      }

      if (raw[i + 1] === 'X' && raw[i + 2] === '2' && raw[i + 3] === '\\') {
        // \X2\HHHH...\X0\ — UTF-16 encoded
        i += 4;
        let hex = '';
        while (i < raw.length) {
          if (
            raw[i] === '\\' &&
            raw[i + 1] === 'X' &&
            raw[i + 2] === '0' &&
            raw[i + 3] === '\\'
          ) {
            i += 4;
            break;
          }
          hex += raw[i];
          i++;
        }
        for (let j = 0; j < hex.length; j += 4) {
          result += String.fromCharCode(Number.parseInt(hex.slice(j, j + 4), 16));
        }
        continue;
      }

      if (
        raw[i + 1] === 'X' &&
        raw[i + 2] === '4' &&
        raw[i + 3] === '\\'
      ) {
        // \X4\HHHHHHHH...\X0\ — UTF-32 encoded
        i += 4;
        let hex = '';
        while (i < raw.length) {
          if (
            raw[i] === '\\' &&
            raw[i + 1] === 'X' &&
            raw[i + 2] === '0' &&
            raw[i + 3] === '\\'
          ) {
            i += 4;
            break;
          }
          hex += raw[i];
          i++;
        }
        for (let j = 0; j < hex.length; j += 8) {
          result += String.fromCodePoint(
            Number.parseInt(hex.slice(j, j + 8), 16),
          );
        }
        continue;
      }

      // \\ → \
      if (raw[i + 1] === '\\') {
        result += '\\';
        i += 2;
        continue;
      }
    }

    // '' → ' (escaped single quote in STEP)
    if (raw[i] === "'" && raw[i + 1] === "'") {
      result += "'";
      i += 2;
      continue;
    }

    result += raw[i];
    i++;
  }

  return result;
}

export function encodeStepString(str: string): string {
  let result = '';

  for (let i = 0; i < str.length; i++) {
    const ch = str[i]!;
    const code = ch.codePointAt(0)!;

    if (ch === "'") {
      result += "''";
    } else if (ch === '\\') {
      result += '\\\\';
    } else if (code >= 0x20 && code <= 0x7e) {
      result += ch;
    } else if (code > 0xffff) {
      // UTF-32
      result += `\\X4\\${code.toString(16).toUpperCase().padStart(8, '0')}\\X0\\`;
      if (str.codePointAt(i)! > 0xffff) i++; // skip surrogate pair
    } else if (code > 0x7e) {
      // UTF-16
      result += `\\X2\\${code.toString(16).toUpperCase().padStart(4, '0')}\\X0\\`;
    }
  }

  return result;
}
