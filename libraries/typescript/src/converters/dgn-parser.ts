/**
 * DGN V7 (ISFF) parser -- pure TypeScript, no external dependencies.
 *
 * Parses MicroStation DGN V7 binary files based on the Intergraph Standard
 * File Format. Implements middle-endian 32-bit integers, VAX D-Float to
 * IEEE 754 conversion, and element-type-specific decoding.
 *
 * Reference implementation: DGNLib by Frank Warmerdam (GDAL/OGR).
 */

// ---------------------------------------------------------------------------
// Data structures
// ---------------------------------------------------------------------------

export interface DgnElement {
  type: number;
  typeName: string;
  level: number;
  deleted: boolean;
  complex: boolean;
  offset: number;
  size: number;
  graphicGroup: number;
  properties: number;
  color: number;
  weight: number;
  style: number;
  data: Record<string, unknown>;
}

export interface DgnFile {
  version: string;
  elements: DgnElement[];
  is3d: boolean;
  uorPerSub: number;
  subPerMaster: number;
  masterUnitName: string;
  subUnitName: string;
  globalOrigin: [number, number, number];
  colorTable: ([number, number, number] | null)[];
}

// ---------------------------------------------------------------------------
// Element type constants
// ---------------------------------------------------------------------------

const ELEMENT_TYPES: Record<number, string> = {
  1: 'CELL_LIBRARY', 2: 'CELL_HEADER', 3: 'LINE',
  4: 'LINE_STRING', 5: 'GROUP_DATA', 6: 'SHAPE',
  7: 'TEXT_NODE', 8: 'DIGITIZER_SETUP', 9: 'TCB',
  10: 'LEVEL_SYMBOLOGY', 11: 'CURVE',
  12: 'COMPLEX_CHAIN_HEADER', 14: 'COMPLEX_SHAPE_HEADER',
  15: 'ELLIPSE', 16: 'ARC', 17: 'TEXT',
  18: '3DSURFACE_HEADER', 19: '3DSOLID_HEADER',
  21: 'BSPLINE_POLE', 22: 'POINT_STRING',
  23: 'CONE', 24: 'BSPLINE_SURFACE_HEADER',
  25: 'BSPLINE_SURFACE_BOUNDARY', 26: 'BSPLINE_KNOT',
  27: 'BSPLINE_CURVE_HEADER', 28: 'BSPLINE_WEIGHT_FACTOR',
  33: 'DIMENSION', 34: 'SHARED_CELL_DEFN',
  35: 'SHARED_CELL', 37: 'TAG_VALUE',
  66: 'APPLICATION',
};

const NO_DISPHDR = new Set([0, 1, 9, 10, 32, 44, 48, 49, 50, 51, 57, 60, 61, 62, 63]);

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

export class DgnParser {
  private dimension = 2;
  private scale = 1.0;
  private originX = 0.0;
  private originY = 0.0;
  private originZ = 0.0;
  private gotTcb = false;

  parse(data: Uint8Array): DgnFile {
    const dgn: DgnFile = {
      version: 'V7',
      elements: [],
      is3d: false,
      uorPerSub: 1,
      subPerMaster: 1,
      masterUnitName: '',
      subUnitName: '',
      globalOrigin: [0, 0, 0],
      colorTable: [],
    };

    if (data.length < 4) return dgn;

    // Quick 2D/3D check from first byte
    if (data[0] === 0xC8) {
      this.dimension = 3;
      dgn.is3d = true;
    } else {
      this.dimension = 2;
    }

    let offset = 0;
    while (offset < data.length - 3) {
      if (data[offset] === 0xFF && data[offset + 1] === 0xFF) break;

      const elem = this.readElement(data, offset, dgn);
      if (!elem) break;
      dgn.elements.push(elem);
      offset += elem.size;
    }

    return dgn;
  }

  // ------------------------------------------------------------------
  // Low-level binary helpers
  // ------------------------------------------------------------------

  private static readUint16LE(data: Uint8Array, offset: number): number {
    return data[offset] + data[offset + 1] * 256;
  }

  private static readInt32ME(data: Uint8Array, offset: number): number {
    return (data[offset + 2]
      + data[offset + 3] * 256
      + data[offset + 1] * 256 * 65536
      + data[offset] * 65536);
  }

  private static readInt32MESigned(data: Uint8Array, offset: number): number {
    let v = DgnParser.readInt32ME(data, offset);
    if (v >= 0x80000000) v -= 0x100000000;
    return v;
  }

  /**
   * Convert 8-byte VAX D-Float to IEEE 754 double.
   * Replicates DGN2IEEEDouble() from DGNLib.
   */
  private static vaxToIeee(data: Uint8Array, offset: number): number {
    if (offset + 8 > data.length) return 0.0;

    const src = data.subarray(offset, offset + 8);
    const dest = new Uint8Array(8);
    dest[2] = src[0]; dest[3] = src[1];
    dest[0] = src[2]; dest[1] = src[3];
    dest[6] = src[4]; dest[7] = src[5];
    dest[4] = src[6]; dest[5] = src[7];

    const dv = new DataView(dest.buffer);
    let dtHi = dv.getUint32(0, true);
    let dtLo = dv.getUint32(4, true);

    const sign = dtHi & 0x80000000;
    let exponent = (dtHi >>> 23) & 0xFF;
    if (exponent !== 0) exponent = exponent - 129 + 1023;

    const rndbits = dtLo & 0x00000007;
    dtLo = dtLo >>> 3;
    dtLo = (dtLo & 0x1FFFFFFF) | ((dtHi << 29) >>> 0);
    if (rndbits) dtLo = dtLo | 0x00000001;

    dtHi = dtHi >>> 3;
    dtHi = dtHi & 0x000FFFFF;
    dtHi = (dtHi | ((exponent << 20) >>> 0) | sign) >>> 0;

    // Pack as IEEE double LE: lo first, then hi
    const ieee = new Uint8Array(8);
    const ieeeView = new DataView(ieee.buffer);
    ieeeView.setUint32(0, dtLo, true);
    ieeeView.setUint32(4, dtHi, true);
    return ieeeView.getFloat64(0, true);
  }

  // ------------------------------------------------------------------
  // Element reading
  // ------------------------------------------------------------------

  private readElement(data: Uint8Array, offset: number, dgn: DgnFile): DgnElement | null {
    if (offset + 4 > data.length) return null;

    const b0 = data[offset];
    const b1 = data[offset + 1];
    const level = b0 & 0x3F;
    const complexFlag = !!(b0 & 0x80);
    const etype = b1 & 0x7F;
    const deleted = !!(b1 & 0x80);
    const nWords = DgnParser.readUint16LE(data, offset + 2);
    const elemSize = nWords * 2 + 4;

    if (elemSize < 4 || offset + elemSize > data.length) return null;

    const typeName = ELEMENT_TYPES[etype] ?? `UNKNOWN_${etype}`;

    const elem: DgnElement = {
      type: etype, typeName, level, deleted,
      complex: complexFlag, offset, size: elemSize,
      graphicGroup: 0, properties: 0,
      color: 0, weight: 0, style: 0,
      data: {},
    };

    // Parse display header for graphic types
    if (!NO_DISPHDR.has(etype) && elemSize >= 36) {
      elem.graphicGroup = DgnParser.readUint16LE(data, offset + 28);
      elem.properties = DgnParser.readUint16LE(data, offset + 32);
      elem.style = data[offset + 34] & 0x07;
      elem.weight = (data[offset + 34] & 0xF8) >> 3;
      elem.color = data[offset + 35];
    }

    const raw = data.subarray(offset, offset + elemSize);
    try {
      if (etype === 9) this.parseTcb(raw, dgn);
      else if (etype === 5 && level === 1) this.parseColorTable(raw, dgn);
      else if (etype === 3) elem.data = this.parseLine(raw);
      else if (etype === 4 || etype === 6 || etype === 11 || etype === 21) elem.data = this.parseMultipoint(raw, etype);
      else if (etype === 15) elem.data = this.parseEllipse(raw);
      else if (etype === 16) elem.data = this.parseArc(raw);
      else if (etype === 17) elem.data = this.parseTextElement(raw);
      else if (etype === 7) elem.data = this.parseTextNode(raw);
      else if (etype === 2) elem.data = this.parseCellHeader(raw);
      else if (etype === 12 || etype === 14 || etype === 18 || etype === 19) elem.data = this.parseComplexHeader(raw);
      else if (etype === 37) elem.data = this.parseTagValue(raw);
    } catch { /* skip element parse error */ }

    return elem;
  }

  // ------------------------------------------------------------------
  // TCB (Type Control Block, type 9)
  // ------------------------------------------------------------------

  private parseTcb(raw: Uint8Array, dgn: DgnFile): void {
    if (raw.length < 1264) return;
    if (this.gotTcb) return;

    if (raw[1214] & 0x40) {
      this.dimension = 3;
      dgn.is3d = true;
    } else {
      this.dimension = 2;
      dgn.is3d = false;
    }

    const subPerMaster = DgnParser.readInt32ME(raw, 1112);
    const uorPerSub = DgnParser.readInt32ME(raw, 1116);

    dgn.subPerMaster = subPerMaster || 1;
    dgn.uorPerSub = uorPerSub || 1;

    dgn.masterUnitName = (
      String.fromCharCode(raw[1120]) + String.fromCharCode(raw[1121])
    ).replace(/\0/g, '').trim();
    dgn.subUnitName = (
      String.fromCharCode(raw[1122]) + String.fromCharCode(raw[1123])
    ).replace(/\0/g, '').trim();

    if (uorPerSub && subPerMaster) {
      this.scale = 1.0 / (uorPerSub * subPerMaster);
    } else {
      this.scale = 1.0;
    }

    let originX = DgnParser.vaxToIeee(raw, 1240);
    let originY = DgnParser.vaxToIeee(raw, 1248);
    let originZ = DgnParser.vaxToIeee(raw, 1256);

    if (uorPerSub && subPerMaster) {
      const s = uorPerSub * subPerMaster;
      originX /= s; originY /= s; originZ /= s;
    }

    this.originX = originX;
    this.originY = originY;
    this.originZ = originZ;
    this.gotTcb = true;

    dgn.globalOrigin = [originX, originY, originZ];
  }

  // ------------------------------------------------------------------
  // Color table
  // ------------------------------------------------------------------

  private parseColorTable(raw: Uint8Array, dgn: DgnFile): void {
    if (raw.length < 806) return;
    const colors: ([number, number, number] | null)[] = new Array(256).fill(null);
    colors[255] = [raw[38], raw[39], raw[40]];
    for (let i = 0; i < 255; i++) {
      const base = 41 + i * 3;
      colors[i] = [raw[base], raw[base + 1], raw[base + 2]];
    }
    dgn.colorTable = colors;
  }

  // ------------------------------------------------------------------
  // Coordinate helpers
  // ------------------------------------------------------------------

  private transformPoint(x: number, y: number, z = 0): [number, number, number] {
    return [
      x * this.scale - this.originX,
      y * this.scale - this.originY,
      z * this.scale - this.originZ,
    ];
  }

  private readPointInt(raw: Uint8Array, offset: number): [number, number, number] {
    const x = DgnParser.readInt32MESigned(raw, offset);
    const y = DgnParser.readInt32MESigned(raw, offset + 4);
    const z = this.dimension === 3 ? DgnParser.readInt32MESigned(raw, offset + 8) : 0;
    return this.transformPoint(x, y, z);
  }

  // ------------------------------------------------------------------
  // LINE (type 3)
  // ------------------------------------------------------------------

  private parseLine(raw: Uint8Array): Record<string, unknown> {
    const pntsize = this.dimension * 4;
    const p0 = this.readPointInt(raw, 36);
    const p1 = this.readPointInt(raw, 36 + pntsize);
    return { vertices: [p0, p1] };
  }

  // ------------------------------------------------------------------
  // Multipoint (types 4, 6, 11, 21)
  // ------------------------------------------------------------------

  private parseMultipoint(raw: Uint8Array, etype: number): Record<string, unknown> {
    const pntsize = this.dimension * 4;
    let count = DgnParser.readUint16LE(raw, 36);
    const maxCount = Math.floor((raw.length - 38) / pntsize);
    if (count > maxCount) count = maxCount;

    const vertices: [number, number, number][] = [];
    for (let i = 0; i < count; i++) {
      vertices.push(this.readPointInt(raw, 38 + i * pntsize));
    }

    const result: Record<string, unknown> = { vertices };
    if (etype === 6) result['closed'] = true;
    return result;
  }

  // ------------------------------------------------------------------
  // ELLIPSE (type 15)
  // ------------------------------------------------------------------

  private parseEllipse(raw: Uint8Array): Record<string, unknown> {
    const primary = DgnParser.vaxToIeee(raw, 36) * this.scale;
    const secondary = DgnParser.vaxToIeee(raw, 44) * this.scale;
    let rotation: number;
    let origin: [number, number, number];

    if (this.dimension === 2) {
      rotation = DgnParser.readInt32MESigned(raw, 52) / 360000.0;
      const ox = DgnParser.vaxToIeee(raw, 56);
      const oy = DgnParser.vaxToIeee(raw, 64);
      origin = this.transformPoint(ox, oy);
    } else {
      const ox = DgnParser.vaxToIeee(raw, 68);
      const oy = DgnParser.vaxToIeee(raw, 76);
      const oz = DgnParser.vaxToIeee(raw, 84);
      origin = this.transformPoint(ox, oy, oz);
      rotation = 0;
    }

    return {
      primary_axis: primary, secondary_axis: secondary,
      rotation, origin,
      start_angle: 0, sweep_angle: 360,
    };
  }

  // ------------------------------------------------------------------
  // ARC (type 16)
  // ------------------------------------------------------------------

  private parseArc(raw: Uint8Array): Record<string, unknown> {
    const startAng = DgnParser.readInt32MESigned(raw, 36) / 360000.0;

    const sweepNegative = !!(raw[41] & 0x80);
    const rawMut = new Uint8Array(raw);
    rawMut[41] = raw[41] & 0x7F;
    let sweepVal = DgnParser.readInt32MESigned(rawMut, 40);
    if (sweepNegative) sweepVal = -sweepVal;

    const sweepAng = sweepVal === 0 ? 360 : sweepVal / 360000.0;

    const primary = DgnParser.vaxToIeee(raw, 44) * this.scale;
    const secondary = DgnParser.vaxToIeee(raw, 52) * this.scale;
    let rotation: number;
    let origin: [number, number, number];

    if (this.dimension === 2) {
      rotation = DgnParser.readInt32MESigned(raw, 60) / 360000.0;
      const ox = DgnParser.vaxToIeee(raw, 64);
      const oy = DgnParser.vaxToIeee(raw, 72);
      origin = this.transformPoint(ox, oy);
    } else {
      const ox = DgnParser.vaxToIeee(raw, 76);
      const oy = DgnParser.vaxToIeee(raw, 84);
      const oz = DgnParser.vaxToIeee(raw, 92);
      origin = this.transformPoint(ox, oy, oz);
      rotation = 0;
    }

    return {
      primary_axis: primary, secondary_axis: secondary,
      rotation, origin,
      start_angle: startAng, sweep_angle: sweepAng,
    };
  }

  // ------------------------------------------------------------------
  // TEXT (type 17)
  // ------------------------------------------------------------------

  private parseTextElement(raw: Uint8Array): Record<string, unknown> {
    const fontId = raw[36];
    const justification = raw[37];
    const lengthMult = DgnParser.readInt32MESigned(raw, 38) * this.scale * 6 / 1000;
    const heightMult = DgnParser.readInt32MESigned(raw, 42) * this.scale * 6 / 1000;

    let rotation: number;
    let origin: [number, number, number];
    let numChars: number;
    let textOff: number;

    if (this.dimension === 2) {
      rotation = DgnParser.readInt32MESigned(raw, 46) / 360000.0;
      const ox = DgnParser.readInt32MESigned(raw, 50);
      const oy = DgnParser.readInt32MESigned(raw, 54);
      origin = this.transformPoint(ox, oy);
      numChars = raw.length > 58 ? raw[58] : 0;
      textOff = 60;
    } else {
      rotation = 0;
      const ox = DgnParser.readInt32MESigned(raw, 62);
      const oy = DgnParser.readInt32MESigned(raw, 66);
      const oz = DgnParser.readInt32MESigned(raw, 70);
      origin = this.transformPoint(ox, oy, oz);
      numChars = raw.length > 74 ? raw[74] : 0;
      textOff = 76;
    }

    let text = '';
    if (textOff + numChars <= raw.length) {
      const textBytes = raw.subarray(textOff, textOff + numChars);
      if (textBytes.length >= 2 && textBytes[0] === 0xFF && textBytes[1] === 0xFD) {
        // Multibyte
        const chars: string[] = [];
        for (let i = 0; i < textBytes.length - 2; i += 2) {
          const w = DgnParser.readUint16LE(textBytes, 2 + i);
          chars.push(String.fromCharCode(w));
        }
        text = chars.join('');
      } else {
        text = Array.from(textBytes).map(b => String.fromCharCode(b)).join('').replace(/\0+$/, '');
      }
    }

    return {
      text, font_id: fontId, justification,
      height: heightMult, width: lengthMult,
      rotation, origin,
    };
  }

  // ------------------------------------------------------------------
  // TEXT_NODE (type 7)
  // ------------------------------------------------------------------

  private parseTextNode(raw: Uint8Array): Record<string, unknown> {
    const totlength = DgnParser.readUint16LE(raw, 36);
    const numelems = DgnParser.readUint16LE(raw, 38);
    const fontId = raw[44];
    const justification = raw[45];
    const lengthMult = DgnParser.readInt32MESigned(raw, 50) * this.scale * 6 / 1000;
    const heightMult = DgnParser.readInt32MESigned(raw, 54) * this.scale * 6 / 1000;

    let rotation: number;
    let origin: [number, number, number];

    if (this.dimension === 2) {
      rotation = DgnParser.readInt32MESigned(raw, 58) / 360000.0;
      const ox = DgnParser.readInt32MESigned(raw, 62);
      const oy = DgnParser.readInt32MESigned(raw, 66);
      origin = this.transformPoint(ox, oy);
    } else {
      const ox = DgnParser.readInt32MESigned(raw, 74);
      const oy = DgnParser.readInt32MESigned(raw, 78);
      const oz = DgnParser.readInt32MESigned(raw, 82);
      origin = this.transformPoint(ox, oy, oz);
      rotation = 0;
    }

    return {
      totlength, numelems,
      font_id: fontId, justification,
      height: heightMult, width: lengthMult,
      rotation, origin,
    };
  }

  // ------------------------------------------------------------------
  // CELL_HEADER (type 2)
  // ------------------------------------------------------------------

  private parseCellHeader(raw: Uint8Array): Record<string, unknown> {
    const totlength = DgnParser.readUint16LE(raw, 36);

    // Cell name: Radix-50 (two 16-bit words -> 6 chars)
    let name = '';
    try {
      const w1 = DgnParser.readUint16LE(raw, 38);
      const w2 = DgnParser.readUint16LE(raw, 40);
      name = (DgnParser.rad50ToAscii(w1) + DgnParser.rad50ToAscii(w2)).trimEnd();
    } catch { /* skip */ }

    const cclass = DgnParser.readUint16LE(raw, 42);
    let origin: [number, number, number];
    let xscale = 1, yscale = 1, rotation = 0;

    if (this.dimension === 2) {
      const a = DgnParser.readInt32MESigned(raw, 68);
      const c = DgnParser.readInt32MESigned(raw, 76);
      const b = DgnParser.readInt32MESigned(raw, 72);
      const d = DgnParser.readInt32MESigned(raw, 80);
      const ox = DgnParser.readInt32MESigned(raw, 84);
      const oy = DgnParser.readInt32MESigned(raw, 88);
      origin = this.transformPoint(ox, oy);

      const a2 = a * a, c2 = c * c;
      xscale = (a2 + c2) > 0 ? Math.sqrt(a2 + c2) / 214748.0 : 1.0;
      yscale = Math.sqrt(b * b + d * d) / 214748.0;

      if (a2 + c2 <= 0) {
        rotation = 0;
      } else {
        rotation = Math.acos(Math.max(-1, Math.min(1, a / Math.sqrt(a2 + c2))));
        rotation = b <= 0 ? rotation * 180 / Math.PI : 360 - rotation * 180 / Math.PI;
      }
    } else {
      const ox = DgnParser.readInt32MESigned(raw, 112);
      const oy = DgnParser.readInt32MESigned(raw, 116);
      const oz = DgnParser.readInt32MESigned(raw, 120);
      origin = this.transformPoint(ox, oy, oz);
    }

    return {
      name, totlength, class: cclass,
      origin, xscale, yscale, rotation,
    };
  }

  // ------------------------------------------------------------------
  // Complex headers (types 12, 14, 18, 19)
  // ------------------------------------------------------------------

  private parseComplexHeader(raw: Uint8Array): Record<string, unknown> {
    const totlength = DgnParser.readUint16LE(raw, 36);
    const numelems = DgnParser.readUint16LE(raw, 38);
    const result: Record<string, unknown> = { totlength, numelems };
    if (raw.length > 41) {
      result['surftype'] = raw[40];
      result['boundelms'] = raw[41] + 1;
    }
    return result;
  }

  // ------------------------------------------------------------------
  // TAG_VALUE (type 37)
  // ------------------------------------------------------------------

  private parseTagValue(raw: Uint8Array): Record<string, unknown> {
    if (raw.length < 156) return {};
    const tagType = DgnParser.readUint16LE(raw, 74);
    const tagSet = new DataView(raw.buffer, raw.byteOffset, raw.byteLength).getUint32(68, true);
    const tagIndex = DgnParser.readUint16LE(raw, 72);
    const tagLength = DgnParser.readUint16LE(raw, 150);

    const result: Record<string, unknown> = { tag_type: tagType, tag_set: tagSet, tag_index: tagIndex, tag_length: tagLength };

    if (tagType === 1 && raw.length > 154) {
      let end = raw.indexOf(0, 154);
      if (end === -1) end = raw.length;
      result['value'] = Array.from(raw.subarray(154, end)).map(b => String.fromCharCode(b)).join('');
    } else if (tagType === 3 && raw.length >= 158) {
      result['value'] = new DataView(raw.buffer, raw.byteOffset, raw.byteLength).getInt32(154, true);
    } else if (tagType === 4 && raw.length >= 162) {
      result['value'] = DgnParser.vaxToIeee(raw, 154);
    }

    return result;
  }

  // ------------------------------------------------------------------
  // Radix-50 decoding
  // ------------------------------------------------------------------

  private static rad50ToAscii(value: number): string {
    const R50 = ' ABCDEFGHIJKLMNOPQRSTUVWXYZ$.%0123456789';
    const chars: string[] = [];
    let v = value;
    for (let i = 0; i < 3; i++) {
      const idx = v % 40;
      chars.push(idx < R50.length ? R50[idx] : ' ');
      v = Math.floor(v / 40);
    }
    return chars.reverse().join('');
  }
}
