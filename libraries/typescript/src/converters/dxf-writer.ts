/**
 * Low-level DXF ASCII writer -- pure TypeScript, no external dependencies.
 *
 * Provides helpers for emitting group-code/value pairs, sections, tables,
 * entities, and 3-D points in valid DXF format.
 */

export class DxfWriter {
  lines: string[] = [];
  private handleCounter = 1;

  // ------------------------------------------------------------------
  // Primitive writers
  // ------------------------------------------------------------------

  /** Write a single group-code / value pair. */
  group(code: number, value: unknown): void {
    this.lines.push(String(code).padStart(3, ' '));
    if (typeof value === 'number' && !Number.isInteger(value)) {
      // Float formatting: up to 12 significant digits
      this.lines.push(toPrecision12(value));
    } else if (typeof value === 'boolean') {
      this.lines.push(value ? '1' : '0');
    } else {
      this.lines.push(String(value));
    }
  }

  /** Write a 3-D point using consecutive group codes. */
  point(x: number, y: number, z = 0.0, codeBase = 10): void {
    this.group(codeBase, x);
    this.group(codeBase + 10, y);
    this.group(codeBase + 20, z);
  }

  /** Write a handle (group code 5). */
  handle(h: string): void {
    this.group(5, h);
  }

  /** Allocate and return the next handle as a hex string. */
  nextHandle(): string {
    const h = this.handleCounter.toString(16).toUpperCase();
    this.handleCounter++;
    return h;
  }

  /** Write the entity-type marker (group code 0). */
  entity(entityType: string): void {
    this.group(0, entityType);
  }

  // ------------------------------------------------------------------
  // Section / table helpers (non-context-manager style for TS)
  // ------------------------------------------------------------------

  /** Begin a SECTION. */
  beginSection(name: string): void {
    this.group(0, 'SECTION');
    this.group(2, name);
  }

  /** End a SECTION. */
  endSection(): void {
    this.group(0, 'ENDSEC');
  }

  /** Begin a TABLE. */
  beginTable(name: string, handle: string, entries: number): void {
    this.group(0, 'TABLE');
    this.group(2, name);
    this.handle(handle);
    this.group(100, 'AcDbSymbolTable');
    this.group(70, entries);
  }

  /** End a TABLE. */
  endTable(): void {
    this.group(0, 'ENDTAB');
  }

  // ------------------------------------------------------------------
  // Output
  // ------------------------------------------------------------------

  /** Return the complete DXF content as a string (LF line endings). */
  toString(): string {
    return this.lines.join('\n') + '\n';
  }
}

/** Format a float with up to 12 significant digits (no trailing zeroes). */
function toPrecision12(value: number): string {
  return value.toPrecision(12).replace(/\.?0+$/, '') || '0';
}
