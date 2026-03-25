/**
 * Bit-level reader for DWG binary format.
 *
 * Reads individual bits and DWG-specific compressed data types from a byte
 * buffer. Built from scratch using only standard TypeScript/JavaScript.
 *
 * References:
 *   - Open Design Alliance DWG File Format Specification
 *   - LibreDWG documentation and bit-level encoding notes
 */

export class DwgBitReader {
  data: Uint8Array;
  bitPosition: number;

  constructor(data: Uint8Array, byteOffset = 0) {
    this.data = data;
    this.bitPosition = byteOffset * 8;
  }

  // ------------------------------------------------------------------
  // Low-level bit reading
  // ------------------------------------------------------------------

  /** Read a single bit (B). */
  readBit(): number {
    const byteIdx = this.bitPosition >> 3;
    const bitIdx = 7 - (this.bitPosition & 7);
    if (byteIdx >= this.data.length) throw new Error('DwgBitReader: read past end of data');
    const val = (this.data[byteIdx] >> bitIdx) & 1;
    this.bitPosition++;
    return val;
  }

  /** Read count bits and return as an unsigned integer (MSB first). */
  readBits(count: number): number {
    let result = 0;
    for (let i = 0; i < count; i++) {
      result = (result << 1) | this.readBit();
    }
    return result;
  }

  // ------------------------------------------------------------------
  // Raw fixed-size types
  // ------------------------------------------------------------------

  /** Read an unsigned byte (RC) -- 8 bits, not byte-aligned. */
  readByte(): number {
    return this.readBits(8);
  }

  /** Read a signed 16-bit little-endian short (RS). */
  readShort(): number {
    const lo = this.readBits(8);
    const hi = this.readBits(8);
    let val = lo | (hi << 8);
    if (val >= 0x8000) val -= 0x10000;
    return val;
  }

  /** Read an unsigned 16-bit LE short (RS). */
  readRawShort(): number {
    const lo = this.readBits(8);
    const hi = this.readBits(8);
    return lo | (hi << 8);
  }

  /** Read a signed 32-bit LE long (RL). */
  readLong(): number {
    const b0 = this.readBits(8);
    const b1 = this.readBits(8);
    const b2 = this.readBits(8);
    const b3 = this.readBits(8);
    let val = b0 | (b1 << 8) | (b2 << 16) | (b3 << 24);
    // JavaScript bitwise ops produce signed 32-bit, so this is already correct
    return val;
  }

  /** Read an unsigned 32-bit LE long (RL). */
  readRawLong(): number {
    const b0 = this.readBits(8);
    const b1 = this.readBits(8);
    const b2 = this.readBits(8);
    const b3 = this.readBits(8);
    return (b0 | (b1 << 8) | (b2 << 16) | (b3 << 24)) >>> 0;
  }

  /** Read a 64-bit IEEE double (RD). */
  readDouble(): number {
    const buf = new Uint8Array(8);
    for (let i = 0; i < 8; i++) buf[i] = this.readBits(8);
    const dv = new DataView(buf.buffer);
    return dv.getFloat64(0, true);
  }

  // ------------------------------------------------------------------
  // DWG compressed types
  // ------------------------------------------------------------------

  /** Read a 2-bit value (BB). */
  readBB(): number {
    return this.readBits(2);
  }

  /**
   * Bit Short (BS) -- 2-bit prefix + variable payload.
   *   00 -> raw 16-bit signed short
   *   01 -> raw 8-bit unsigned
   *   10 -> value is 0
   *   11 -> value is 256
   */
  readBS(): number {
    const prefix = this.readBits(2);
    if (prefix === 0) return this.readShort();
    if (prefix === 1) return this.readByte();
    if (prefix === 2) return 0;
    return 256;
  }

  /**
   * Bit Long (BL) -- 2-bit prefix + variable payload.
   *   00 -> raw 32-bit signed long
   *   01 -> raw 8-bit unsigned
   *   10 -> value is 0
   *   11 -> raw 32-bit long
   */
  readBL(): number {
    const prefix = this.readBits(2);
    if (prefix === 0) return this.readLong();
    if (prefix === 1) return this.readByte();
    if (prefix === 2) return 0;
    return this.readLong();
  }

  /**
   * Bit Double (BD) -- 2-bit prefix + variable payload.
   *   00 -> raw 64-bit IEEE double
   *   01 -> value is 1.0
   *   10 -> value is 0.0
   */
  readBD(): number {
    const prefix = this.readBits(2);
    if (prefix === 0) return this.readDouble();
    if (prefix === 1) return 1.0;
    return 0.0;
  }

  /**
   * Default Double (DD) -- 2-bit prefix + variable payload.
   *   00 -> value == default
   *   01 -> read 4 bytes, replace low 4 bytes of default's LE repr
   *   10 -> read 6 bytes, replace bytes [4,5,0,1,2,3]
   *   11 -> read full 8-byte double
   */
  readDD(defaultVal: number): number {
    const prefix = this.readBits(2);
    if (prefix === 0) return defaultVal;
    if (prefix === 3) return this.readDouble();

    const buf = new Uint8Array(8);
    const dv = new DataView(buf.buffer);
    dv.setFloat64(0, defaultVal, true);

    if (prefix === 1) {
      buf[0] = this.readByte();
      buf[1] = this.readByte();
      buf[2] = this.readByte();
      buf[3] = this.readByte();
    } else { // prefix === 2
      buf[4] = this.readByte();
      buf[5] = this.readByte();
      buf[0] = this.readByte();
      buf[1] = this.readByte();
      buf[2] = this.readByte();
      buf[3] = this.readByte();
    }
    return dv.getFloat64(0, true);
  }

  /**
   * Bit Thickness (BT) -- for R2000+.
   * If leading bit is 1, value is 0.0. Otherwise read BD.
   */
  readBT(): number {
    if (this.readBit()) return 0.0;
    return this.readBD();
  }

  /**
   * Bit Extrusion (BE) -- for R2000+.
   * If leading bit is 1, value is [0, 0, 1]. Otherwise read 3 BD values.
   */
  readBE(): [number, number, number] {
    if (this.readBit()) return [0.0, 0.0, 1.0];
    const x = this.readBD();
    const y = this.readBD();
    let z = this.readBD();
    if (x === 0.0 && y === 0.0) z = z <= 0.0 ? -1.0 : 1.0;
    return [x, y, z];
  }

  // ------------------------------------------------------------------
  // Handle references
  // ------------------------------------------------------------------

  /** Handle reference. Returns [code, handleValue]. */
  readH(): [number, number] {
    const code = this.readBits(4);
    const counter = this.readBits(4);
    let handle = 0;
    for (let i = 0; i < counter; i++) {
      handle = (handle << 8) | this.readByte();
    }
    return [code, handle];
  }

  // ------------------------------------------------------------------
  // Text strings
  // ------------------------------------------------------------------

  /**
   * Text string (T).
   * For R2000-R2004: BS length + length raw bytes (code-page encoded).
   * For R2007+: BS length + length*2 bytes (UTF-16LE).
   */
  readT(isUnicode = false): string {
    const length = this.readBS();
    if (length <= 0) return '';
    if (isUnicode) {
      const raw = new Uint8Array(length * 2);
      for (let i = 0; i < length * 2; i++) raw[i] = this.readByte();
      // Decode UTF-16LE
      const decoder = new TextDecoder('utf-16le');
      return decoder.decode(raw).replace(/\0+$/, '');
    } else {
      const bytes: number[] = [];
      for (let i = 0; i < length; i++) bytes.push(this.readByte());
      // Decode as latin-1
      return bytes.map(b => String.fromCharCode(b)).join('').replace(/\0+$/, '');
    }
  }

  // ------------------------------------------------------------------
  // Point helpers
  // ------------------------------------------------------------------

  /** Two raw doubles (2D point). */
  read2RD(): [number, number] {
    return [this.readDouble(), this.readDouble()];
  }

  /** Three raw doubles (3D point). */
  read3RD(): [number, number, number] {
    return [this.readDouble(), this.readDouble(), this.readDouble()];
  }

  /** Two bit doubles (2D point, compressed). */
  read2BD(): [number, number] {
    return [this.readBD(), this.readBD()];
  }

  /** Three bit doubles (3D point, compressed). */
  read3BD(): [number, number, number] {
    return [this.readBD(), this.readBD(), this.readBD()];
  }

  // ------------------------------------------------------------------
  // Color
  // ------------------------------------------------------------------

  /** Read a color value (CMC) -- for R2000 this is just a BS index. */
  readCMC(): number {
    return this.readBS();
  }

  // ------------------------------------------------------------------
  // Modular char / modular short
  // ------------------------------------------------------------------

  /**
   * Read a modular char (MC) from raw bytes at pos.
   * Returns [value, newPos].
   */
  static readModularChar(data: Uint8Array, pos: number): [number, number] {
    let result = 0;
    let shift = 0;
    let negative = false;
    let b: number;

    do {
      if (pos >= data.length) throw new Error('modular_char: unexpected end of data');
      b = data[pos]; pos++;
      const cont = b & 0x80;
      result |= (b & 0x7F) << shift;
      shift += 7;
      if (!cont) {
        if (b & 0x40) {
          negative = true;
          result &= ~(0x40 << (shift - 7));
        }
        break;
      }
    } while (true);

    return [negative ? -result : result, pos];
  }

  /**
   * Read a modular short (MS) from raw bytes at pos.
   * Returns [value, newPos].
   */
  static readModularShort(data: Uint8Array, pos: number): [number, number] {
    let result = 0;
    let shift = 0;

    do {
      if (pos + 1 >= data.length) throw new Error('modular_short: unexpected end of data');
      const lo = data[pos];
      const hi = data[pos + 1];
      pos += 2;
      const word = lo | ((hi & 0x7F) << 8);
      result |= word << shift;
      shift += 15;
      if (!(hi & 0x80)) break;
    } while (true);

    return [result, pos];
  }

  // ------------------------------------------------------------------
  // Positioning
  // ------------------------------------------------------------------

  /** Set position to byte offset. */
  seekByte(offset: number): void {
    this.bitPosition = offset * 8;
  }

  /** Set position to absolute bit offset. */
  seekBit(bitOffset: number): void {
    this.bitPosition = bitOffset;
  }

  /** Return current byte offset (truncated). */
  tellByte(): number {
    return this.bitPosition >> 3;
  }

  /** Return current bit position. */
  tellBit(): number {
    return this.bitPosition;
  }

  /** Advance to the next byte boundary. */
  alignByte(): void {
    const rem = this.bitPosition & 7;
    if (rem) this.bitPosition += 8 - rem;
  }

  /** Approximate number of bytes remaining. */
  remainingBytes(): number {
    return Math.max(0, this.data.length - this.tellByte());
  }

  /** Read count raw bytes from the bit stream. */
  readRawBytes(count: number): Uint8Array {
    const result = new Uint8Array(count);
    for (let i = 0; i < count; i++) result[i] = this.readByte();
    return result;
  }
}
