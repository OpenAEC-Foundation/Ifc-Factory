/**
 * Pure-TypeScript DWG binary file parser.
 *
 * Parses Autodesk DWG files from raw bytes without external libraries.
 * Currently supports R2000 (AC1015) with graceful degradation for other versions.
 *
 * References:
 *   - Open Design Alliance DWG specification
 *   - LibreDWG reverse-engineering documentation
 */

import { DwgBitReader } from './dwg-bitreader.js';

// ---------------------------------------------------------------------------
// Version constants
// ---------------------------------------------------------------------------

const VERSION_MAP: Record<string, string> = {
  'AC1012': 'R13',
  'AC1014': 'R14',
  'AC1015': 'R2000',
  'AC1018': 'R2004',
  'AC1021': 'R2007',
  'AC1024': 'R2010',
  'AC1027': 'R2013',
  'AC1032': 'R2018',
};

const SECTION_HEADER = 0;
const SECTION_CLASSES = 1;
const SECTION_OBJECT_MAP = 2;

/** Object type constants */
const OBJ_TYPE_NAMES: Record<number, string> = {
  0x01: 'TEXT', 0x02: 'ATTRIB', 0x03: 'ATTDEF',
  0x04: 'BLOCK', 0x05: 'ENDBLK', 0x06: 'SEQEND',
  0x07: 'INSERT', 0x08: 'MINSERT',
  0x0A: 'VERTEX_2D', 0x0B: 'VERTEX_3D',
  0x0C: 'VERTEX_MESH', 0x0D: 'VERTEX_PFACE',
  0x0E: 'VERTEX_PFACE_FACE', 0x0F: 'POLYLINE_2D',
  0x10: 'POLYLINE_3D', 0x11: 'ARC', 0x12: 'CIRCLE',
  0x13: 'LINE', 0x14: 'DIMENSION_ORDINATE',
  0x15: 'DIMENSION_LINEAR', 0x16: 'DIMENSION_ALIGNED',
  0x17: 'DIMENSION_ANG3PT', 0x18: 'DIMENSION_ANG2LN',
  0x19: 'DIMENSION_RADIUS', 0x1A: 'DIMENSION_DIAMETER',
  0x1B: 'POINT', 0x1C: '3DFACE',
  0x1D: 'POLYLINE_PFACE', 0x1E: 'POLYLINE_MESH',
  0x1F: 'SOLID', 0x20: 'TRACE', 0x21: 'SHAPE',
  0x22: 'VIEWPORT', 0x23: 'ELLIPSE', 0x24: 'SPLINE',
  0x25: 'REGION', 0x26: '3DSOLID', 0x27: 'BODY',
  0x28: 'RAY', 0x29: 'XLINE', 0x2A: 'DICTIONARY',
  0x2B: 'OLEFRAME', 0x2C: 'MTEXT', 0x2D: 'LEADER',
  0x2E: 'TOLERANCE', 0x2F: 'MLINE',
  0x30: 'BLOCK_CONTROL', 0x31: 'BLOCK_HEADER',
  0x32: 'LAYER_CONTROL', 0x33: 'LAYER',
  0x34: 'STYLE_CONTROL', 0x35: 'STYLE',
  0x38: 'LTYPE_CONTROL', 0x39: 'LTYPE',
  0x3C: 'VIEW_CONTROL', 0x3D: 'VIEW',
  0x3E: 'UCS_CONTROL', 0x3F: 'UCS',
  0x40: 'VPORT_CONTROL', 0x41: 'VPORT',
  0x42: 'APPID_CONTROL', 0x43: 'APPID',
  0x44: 'DIMSTYLE_CONTROL', 0x45: 'DIMSTYLE',
  0x46: 'VP_ENT_HDR_CONTROL', 0x47: 'VP_ENT_HDR',
  0x48: 'GROUP', 0x49: 'MLINESTYLE',
  0x4A: 'OLE2FRAME', 0x4C: 'LONG_TRANSACTION',
  0x4D: 'LWPOLYLINE', 0x4E: 'HATCH', 0x4F: 'XRECORD',
  0x50: 'PLACEHOLDER', 0x51: 'VBA_PROJECT', 0x52: 'LAYOUT',
};

const ENTITY_TYPES = new Set<number>();
for (let i = 0x01; i < 0x2A; i++) ENTITY_TYPES.add(i);
ENTITY_TYPES.add(0x2C); ENTITY_TYPES.add(0x2D);
ENTITY_TYPES.add(0x2E); ENTITY_TYPES.add(0x2F);
ENTITY_TYPES.add(0x4D); ENTITY_TYPES.add(0x4E);

const TABLE_CONTROL_TYPES = new Set([
  0x30, 0x32, 0x34, 0x38, 0x3C, 0x3E, 0x40, 0x42, 0x44, 0x46,
]);
const TABLE_ENTRY_TYPES = new Set([
  0x31, 0x33, 0x35, 0x39, 0x3D, 0x3F, 0x41, 0x43, 0x45, 0x47,
]);
const NON_ENTITY_TYPES = new Set([
  0x2A, 0x48, 0x49, 0x4F, 0x50, 0x51, 0x52,
]);

const HEADER_SENTINEL_START = new Uint8Array([
  0xCF, 0x7B, 0x1F, 0x23, 0xFD, 0xDE, 0x38, 0xA9,
  0x5F, 0x7C, 0x68, 0xB8, 0x4E, 0x6D, 0x33, 0x5F,
]);
const CLASSES_SENTINEL_START = new Uint8Array([
  0x8D, 0xA1, 0xC4, 0xB8, 0xC4, 0xA9, 0xF8, 0xC5,
  0xC0, 0xDC, 0xF4, 0x5F, 0xE7, 0xCF, 0xB6, 0x8A,
]);

// ---------------------------------------------------------------------------
// Data model
// ---------------------------------------------------------------------------

export interface DwgClass {
  classNumber: number;
  proxyFlags: number;
  appName: string;
  cppClassName: string;
  dxfName: string;
  wasZombie: boolean;
  itemClassId: number;
}

export interface DwgObject {
  handle: number;
  typeNum: number;
  typeName: string;
  data: Record<string, unknown>;
  isEntity: boolean;
}

export interface DwgFile {
  version: string;
  versionCode: string;
  codepage: number;
  headerVars: Record<string, unknown>;
  classes: DwgClass[];
  objects: DwgObject[];
  objectMap: Map<number, number>;
  layers: Map<number, Record<string, unknown>>;
  blocks: Map<number, Record<string, unknown>>;
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

export class DwgParser {
  private classMap = new Map<number, DwgClass>();

  parse(data: Uint8Array): DwgFile {
    if (data.length < 25) throw new Error('Data too short to be a valid DWG file');

    const dwg: DwgFile = {
      version: '',
      versionCode: '',
      codepage: 0,
      headerVars: {},
      classes: [],
      objects: [],
      objectMap: new Map(),
      layers: new Map(),
      blocks: new Map(),
    };

    dwg.versionCode = this.detectVersion(data);
    dwg.version = VERSION_MAP[dwg.versionCode] ?? dwg.versionCode;

    if (dwg.versionCode === 'AC1015') {
      this.parseR2000(data, dwg);
    } else if (dwg.versionCode === 'AC1018') {
      throw new Error('R2004 (AC1018) DWG parsing is not yet implemented. Save as R2000.');
    } else if (['AC1021', 'AC1024', 'AC1027', 'AC1032'].includes(dwg.versionCode)) {
      throw new Error(`${dwg.version} DWG parsing is not yet implemented. Save as R2000.`);
    } else {
      throw new Error(`Unsupported DWG version: ${dwg.versionCode}`);
    }

    return dwg;
  }

  private detectVersion(data: Uint8Array): string {
    const bytes = data.slice(0, 6);
    return Array.from(bytes).map(b => String.fromCharCode(b)).join('');
  }

  // ------------------------------------------------------------------
  // R2000 (AC1015) parsing
  // ------------------------------------------------------------------

  private parseR2000(data: Uint8Array, dwg: DwgFile): void {
    const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
    dwg.codepage = dv.getUint16(19, true);

    const sections = this.parseSectionLocatorsR2000(data, dv);

    if (sections.has(SECTION_CLASSES)) {
      const sec = sections.get(SECTION_CLASSES)!;
      dwg.classes = this.parseClassesR2000(data, sec.offset, sec.size);
      for (const cls of dwg.classes) this.classMap.set(cls.classNumber, cls);
    }

    if (sections.has(SECTION_HEADER)) {
      const sec = sections.get(SECTION_HEADER)!;
      dwg.headerVars = this.parseHeaderVarsR2000(data, sec.offset, sec.size);
    }

    if (sections.has(SECTION_OBJECT_MAP)) {
      const sec = sections.get(SECTION_OBJECT_MAP)!;
      dwg.objectMap = this.parseObjectMapR2000(data, sec.offset, sec.size);
    }

    if (dwg.objectMap.size > 0) {
      dwg.objects = this.parseObjectsR2000(data, dwg.objectMap, dwg.classes);
    }

    for (const obj of dwg.objects) {
      if (obj.typeName === 'LAYER') dwg.layers.set(obj.handle, obj.data);
      else if (obj.typeName === 'BLOCK_HEADER') dwg.blocks.set(obj.handle, obj.data);
    }
  }

  private parseSectionLocatorsR2000(data: Uint8Array, dv: DataView): Map<number, { offset: number; size: number }> {
    const numRecords = dv.getInt32(21, true);
    const sections = new Map<number, { offset: number; size: number }>();

    for (let i = 0; i < numRecords; i++) {
      const off = 25 + i * 9;
      if (off + 9 > data.length) break;
      const recNum = data[off];
      const seeker = dv.getUint32(off + 1, true);
      const size = dv.getUint32(off + 5, true);
      if (seeker > 0 || recNum === 0) {
        sections.set(recNum, { offset: seeker, size });
      }
    }
    return sections;
  }

  // ------------------------------------------------------------------
  // Header variables (R2000)
  // ------------------------------------------------------------------

  private parseHeaderVarsR2000(data: Uint8Array, offset: number, size: number): Record<string, unknown> {
    const header: Record<string, unknown> = { '$ACADVER': 'AC1015' };

    const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const hdrDataSize = dv.getUint32(offset + 16, true);
    const reader = new DwgBitReader(data, offset + 20);

    try {
      // Skip unknown values
      reader.readBD(); reader.readBD(); reader.readBD(); reader.readBD();
      reader.readT(); reader.readT(); reader.readT(); reader.readT();
      reader.readBL(); reader.readBL();

      header['$DIMASO'] = reader.readBit();
      header['$DIMSHO'] = reader.readBit();
      header['$PLINEGEN'] = reader.readBit();
      header['$ORTHOMODE'] = reader.readBit();
      header['$REGENMODE'] = reader.readBit();
      header['$FILLMODE'] = reader.readBit();
      header['$QTEXTMODE'] = reader.readBit();
      header['$PSLTSCALE'] = reader.readBit();
      header['$LIMCHECK'] = reader.readBit();
      header['$USRTIMER'] = reader.readBit();
      header['$SKPOLY'] = reader.readBit();
      header['$ANGDIR'] = reader.readBit();
      header['$SPLFRAME'] = reader.readBit();
      header['$MIRRTEXT'] = reader.readBit();
      header['$WORLDVIEW'] = reader.readBit();
      header['$TILEMODE'] = reader.readBit();
      header['$PLIMCHECK'] = reader.readBit();
      header['$VISRETAIN'] = reader.readBit();
      header['$DISPSILH'] = reader.readBit();
      header['$PELLIPSE'] = reader.readBit();
      header['$PROXYGRAPHICS'] = reader.readBS();
      header['$TREEDEPTH'] = reader.readBS();
      header['$LUNITS'] = reader.readBS();
      header['$LUPREC'] = reader.readBS();
      header['$AUNITS'] = reader.readBS();
      header['$AUPREC'] = reader.readBS();
      header['$OSMODE'] = reader.readBS();
      header['$ATTMODE'] = reader.readBS();
      header['$COORDS'] = reader.readBS();
      header['$PDMODE'] = reader.readBS();
      header['$PICKSTYLE'] = reader.readBS();
      header['$USERI1'] = reader.readBS();
      header['$USERI2'] = reader.readBS();
      header['$USERI3'] = reader.readBS();
      header['$USERI4'] = reader.readBS();
      header['$USERI5'] = reader.readBS();
      header['$SPLINESEGS'] = reader.readBS();
      header['$SURFU'] = reader.readBS();
      header['$SURFV'] = reader.readBS();
      header['$SURFTYPE'] = reader.readBS();
      header['$SURFTAB1'] = reader.readBS();
      header['$SURFTAB2'] = reader.readBS();
      header['$SPLINETYPE'] = reader.readBS();
      header['$SHADEDGE'] = reader.readBS();
      header['$SHADEDIF'] = reader.readBS();
      header['$UNITMODE'] = reader.readBS();
      header['$MAXACTVP'] = reader.readBS();
      header['$ISOLINES'] = reader.readBS();
      header['$CMLJUST'] = reader.readBS();
      header['$TEXTQLTY'] = reader.readBS();
      header['$LTSCALE'] = reader.readBD();
      header['$TEXTSIZE'] = reader.readBD();
      header['$TRACEWID'] = reader.readBD();
      header['$SKETCHINC'] = reader.readBD();
      header['$FILLETRAD'] = reader.readBD();
      header['$THICKNESS'] = reader.readBD();
      header['$ANGBASE'] = reader.readBD();
      header['$PDSIZE'] = reader.readBD();
      header['$PLINEWID'] = reader.readBD();
      header['$USERR1'] = reader.readBD();
      header['$USERR2'] = reader.readBD();
      header['$USERR3'] = reader.readBD();
      header['$USERR4'] = reader.readBD();
      header['$USERR5'] = reader.readBD();
      header['$CMLSCALE'] = reader.readBD();
      header['$CEPSNTYPE'] = reader.readBS();
    } catch {
      // Stop parsing gracefully
    }
    return header;
  }

  // ------------------------------------------------------------------
  // Classes (R2000)
  // ------------------------------------------------------------------

  private parseClassesR2000(data: Uint8Array, offset: number, size: number): DwgClass[] {
    const classes: DwgClass[] = [];
    const dv = new DataView(data.buffer, data.byteOffset, data.byteLength);
    const clsDataSize = dv.getUint32(offset + 16, true);
    const reader = new DwgBitReader(data, offset + 20);
    const endByte = offset + 20 + clsDataSize;

    while (reader.tellByte() < endByte) {
      try {
        classes.push({
          classNumber: reader.readBS(),
          proxyFlags: reader.readBS(),
          appName: reader.readT(),
          cppClassName: reader.readT(),
          dxfName: reader.readT(),
          wasZombie: !!reader.readBit(),
          itemClassId: reader.readBS(),
        });
      } catch {
        break;
      }
    }
    return classes;
  }

  // ------------------------------------------------------------------
  // Object map (R2000)
  // ------------------------------------------------------------------

  private parseObjectMapR2000(data: Uint8Array, offset: number, size: number): Map<number, number> {
    const objectMap = new Map<number, number>();
    let pos = offset;
    const end = offset + size;
    let lastHandle = 0;
    let lastLoc = 0;

    while (pos < end) {
      if (pos + 2 > data.length) break;
      const sectionSize = (data[pos] << 8) | data[pos + 1]; // BE uint16
      if (sectionSize <= 2) break;

      const bodyStart = pos + 2;
      const bodyEnd = bodyStart + sectionSize - 2;
      let rpos = bodyStart;

      while (rpos < bodyEnd) {
        try {
          const [handleDelta, rpos1] = DwgBitReader.readModularChar(data, rpos);
          const [locDelta, rpos2] = DwgBitReader.readModularChar(data, rpos1);
          rpos = rpos2;
          lastHandle += handleDelta;
          lastLoc += locDelta;
          if (lastHandle > 0) objectMap.set(lastHandle, lastLoc);
        } catch {
          break;
        }
      }

      pos += 2 + sectionSize;
    }
    return objectMap;
  }

  // ------------------------------------------------------------------
  // Object/entity parsing (R2000)
  // ------------------------------------------------------------------

  private parseObjectsR2000(
    data: Uint8Array,
    objectMap: Map<number, number>,
    classes: DwgClass[],
  ): DwgObject[] {
    const objects: DwgObject[] = [];
    const sorted = Array.from(objectMap.entries()).sort((a, b) => a[0] - b[0]);

    for (const [handle, fileOffset] of sorted) {
      try {
        const obj = this.parseSingleObjectR2000(data, handle, fileOffset);
        if (obj) objects.push(obj);
      } catch {
        // Skip failed objects
      }
    }
    return objects;
  }

  private parseSingleObjectR2000(data: Uint8Array, handle: number, fileOffset: number): DwgObject | null {
    if (fileOffset >= data.length || fileOffset < 0) return null;

    const [objSize, bitStart] = DwgBitReader.readModularShort(data, fileOffset);
    if (objSize <= 0) return null;

    const reader = new DwgBitReader(data, bitStart);
    const typeNum = reader.readBS();

    let typeName = OBJ_TYPE_NAMES[typeNum] ?? '';
    if (!typeName && typeNum >= 500) {
      const cls = this.classMap.get(typeNum);
      if (cls) typeName = cls.dxfName || cls.cppClassName;
    }
    if (!typeName) typeName = `UNKNOWN_${typeNum}`;

    let isEntity = ENTITY_TYPES.has(typeNum) &&
      !TABLE_CONTROL_TYPES.has(typeNum) &&
      !TABLE_ENTRY_TYPES.has(typeNum) &&
      !NON_ENTITY_TYPES.has(typeNum);
    if (typeNum >= 500 && !isEntity) {
      const cls = this.classMap.get(typeNum);
      if (cls && cls.itemClassId === 0x1F2) isEntity = true;
    }

    const obj: DwgObject = { handle, typeNum, typeName, data: {}, isEntity };

    let bitsize: number;
    try {
      bitsize = reader.readRawLong();
    } catch {
      obj.data = { type: typeName, handle };
      return obj;
    }

    try { reader.readH(); } catch { /* skip handle */ }
    try { this.skipEed(reader); } catch { /* skip EED */ }

    try {
      if (isEntity) {
        obj.data = this.parseEntityData(reader, typeNum, typeName);
      } else {
        obj.data = this.parseTableObject(reader, typeNum, typeName);
      }
    } catch {
      if (!obj.data || Object.keys(obj.data).length === 0) obj.data = {};
    }

    obj.data['type'] = typeName;
    obj.data['handle'] = handle;
    return obj;
  }

  private skipEed(reader: DwgBitReader): void {
    while (true) {
      const eedSize = reader.readBS();
      if (eedSize === 0) break;
      reader.readH();
      for (let i = 0; i < eedSize; i++) reader.readByte();
    }
  }

  // ------------------------------------------------------------------
  // Entity common data (R2000)
  // ------------------------------------------------------------------

  private parseEntityCommon(reader: DwgBitReader): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    const previewExists = reader.readBit();
    if (previewExists) {
      const previewSize = reader.readRawLong();
      if (previewSize > 0 && previewSize < 5_000_000) {
        for (let i = 0; i < previewSize; i++) reader.readByte();
      }
    }

    result['entity_mode'] = reader.readBB();
    result['_num_reactors'] = reader.readBL();
    reader.readBit(); // nolinks
    result['color'] = reader.readCMC();
    result['linetype_scale'] = reader.readBD();
    reader.readBB(); // ltype_flags
    reader.readBB(); // plotstyle_flags
    result['invisible'] = !!reader.readBS();
    result['lineweight'] = reader.readByte();

    return result;
  }

  // ------------------------------------------------------------------
  // Entity data dispatch
  // ------------------------------------------------------------------

  private parseEntityData(reader: DwgBitReader, typeNum: number, typeName: string): Record<string, unknown> {
    let common: Record<string, unknown> = {};
    try { common = this.parseEntityCommon(reader); } catch { /* skip */ }

    let specific: Record<string, unknown> = {};
    try {
      if (typeNum === 0x13) specific = this.parseLine(reader);
      else if (typeNum === 0x12) specific = this.parseCircle(reader);
      else if (typeNum === 0x11) specific = this.parseArc(reader);
      else if (typeNum === 0x1B) specific = this.parsePoint(reader);
      else if (typeNum === 0x4D) specific = this.parseLWPolyline(reader);
      else if (typeNum === 0x01) specific = this.parseText(reader);
      else if (typeNum === 0x2C) specific = this.parseMText(reader);
      else if (typeNum === 0x07) specific = this.parseInsert(reader);
      else if (typeNum === 0x23) specific = this.parseEllipse(reader);
      else if (typeNum === 0x24) specific = this.parseSpline(reader);
      else if (typeNum === 0x1F) specific = this.parseSolid(reader);
      else if (typeNum === 0x28) specific = this.parseRay(reader);
      else if (typeNum === 0x29) specific = this.parseXline(reader);
    } catch { /* partial parse */ }

    return { ...common, ...specific };
  }

  // ------------------------------------------------------------------
  // Geometric entity parsers (R2000)
  // ------------------------------------------------------------------

  private parseLine(reader: DwgBitReader): Record<string, unknown> {
    const zIsZero = reader.readBit();
    const startX = reader.readDouble();
    const endX = reader.readDD(startX);
    const startY = reader.readDouble();
    const endY = reader.readDD(startY);
    let startZ = 0, endZ = 0;
    if (!zIsZero) {
      startZ = reader.readDouble();
      endZ = reader.readDD(startZ);
    }
    const thickness = reader.readBT();
    const extrusion = reader.readBE();
    return {
      type: 'LINE',
      start: [startX, startY, startZ],
      end: [endX, endY, endZ],
      thickness,
      extrusion: [...extrusion],
    };
  }

  private parseCircle(reader: DwgBitReader): Record<string, unknown> {
    const center = reader.read3BD();
    const radius = reader.readBD();
    const thickness = reader.readBT();
    const extrusion = reader.readBE();
    return { type: 'CIRCLE', center: [...center], radius, thickness, extrusion: [...extrusion] };
  }

  private parseArc(reader: DwgBitReader): Record<string, unknown> {
    const center = reader.read3BD();
    const radius = reader.readBD();
    const thickness = reader.readBT();
    const extrusion = reader.readBE();
    const startAngle = reader.readBD();
    const endAngle = reader.readBD();
    return {
      type: 'ARC', center: [...center], radius, thickness,
      extrusion: [...extrusion], startAngle, endAngle,
    };
  }

  private parsePoint(reader: DwgBitReader): Record<string, unknown> {
    const x = reader.readBD(), y = reader.readBD(), z = reader.readBD();
    const thickness = reader.readBT();
    const extrusion = reader.readBE();
    const xAng = reader.readBD();
    return {
      type: 'POINT', position: [x, y, z], thickness,
      extrusion: [...extrusion], xAxisAngle: xAng,
    };
  }

  private parseEllipse(reader: DwgBitReader): Record<string, unknown> {
    const center = reader.read3BD();
    const smAxis = reader.read3BD();
    const extrusion = reader.read3BD();
    const axisRatio = reader.readBD();
    const startAngle = reader.readBD();
    const endAngle = reader.readBD();
    return {
      type: 'ELLIPSE', center: [...center], majorAxis: [...smAxis],
      extrusion: [...extrusion], axisRatio, startAngle, endAngle,
    };
  }

  private parseText(reader: DwgBitReader): Record<string, unknown> {
    const dataflags = reader.readByte();
    let elevation = 0;
    if (!(dataflags & 0x01)) elevation = reader.readDouble();
    const insertion = reader.read2RD();
    let alignment: [number, number] = [0, 0];
    if (!(dataflags & 0x02)) {
      alignment = [reader.readDD(insertion[0]), reader.readDD(insertion[1])];
    }
    const extrusion = reader.readBE();
    const thickness = reader.readBT();
    let oblique = 0;
    if (!(dataflags & 0x04)) oblique = reader.readDouble();
    let rotation = 0;
    if (!(dataflags & 0x08)) rotation = reader.readDouble();
    const height = reader.readDouble();
    let widthFactor = 1;
    if (!(dataflags & 0x10)) widthFactor = reader.readDouble();
    const textValue = reader.readT();
    let generation = 0;
    if (!(dataflags & 0x20)) generation = reader.readBS();
    let halign = 0;
    if (!(dataflags & 0x40)) halign = reader.readBS();
    let valign = 0;
    if (!(dataflags & 0x80)) valign = reader.readBS();

    return {
      type: 'TEXT', elevation, insertion: [...insertion],
      alignment: [...alignment], extrusion: [...extrusion],
      thickness, oblique, rotation, height, widthFactor,
      text: textValue, generation, horizontalAlignment: halign,
      verticalAlignment: valign,
    };
  }

  private parseMText(reader: DwgBitReader): Record<string, unknown> {
    const insertion = reader.read3BD();
    const extrusion = reader.read3BD();
    const xAxisDir = reader.read3BD();
    const rectWidth = reader.readBD();
    const textHeight = reader.readBD();
    const attachment = reader.readBS();
    const flowDir = reader.readBS();
    reader.readBD(); // extents height
    reader.readBD(); // extents width
    const text = reader.readT();
    const lineSpacingStyle = reader.readBS();
    const lineSpacingFactor = reader.readBD();
    reader.readBit(); // unknown

    return {
      type: 'MTEXT', insertion: [...insertion],
      extrusion: [...extrusion], xAxisDirection: [...xAxisDir],
      rectWidth, textHeight, attachment, flowDirection: flowDir,
      text, lineSpacingStyle, lineSpacingFactor,
    };
  }

  private parseInsert(reader: DwgBitReader): Record<string, unknown> {
    const insertion = reader.read3BD();
    const scaleFlag = reader.readBB();
    let sx = 1, sy = 1, sz = 1;
    if (scaleFlag === 3) { /* all 1.0 */ }
    else if (scaleFlag === 1) { sy = reader.readDD(1.0); sz = reader.readDD(1.0); }
    else if (scaleFlag === 2) { sx = reader.readDouble(); sy = sx; sz = sx; }
    else { sx = reader.readDouble(); sy = reader.readDD(sx); sz = reader.readDD(sx); }

    const rotation = reader.readBD();
    const extrusion = reader.read3BD();
    const hasAttribs = reader.readBit();

    return {
      type: 'INSERT', insertion: [...insertion],
      scale: [sx, sy, sz], rotation, extrusion: [...extrusion],
      hasAttribs: !!hasAttribs,
    };
  }

  private parseLWPolyline(reader: DwgBitReader): Record<string, unknown> {
    const flag = reader.readBS();
    let constWidth = 0, elevation = 0, thickness = 0;
    let normal: [number, number, number] = [0, 0, 1];
    if (flag & 4) constWidth = reader.readBD();
    if (flag & 8) elevation = reader.readBD();
    if (flag & 2) thickness = reader.readBD();
    if (flag & 1) normal = reader.read3BD();

    const numPoints = reader.readBL();
    let numBulges = 0, numWidths = 0;
    if (flag & 16) numBulges = reader.readBL();
    if (flag & 32) numWidths = reader.readBL();

    const points: number[][] = [];
    if (numPoints > 0 && numPoints < 100000) {
      const pt = reader.read2RD();
      points.push([...pt]);
      for (let i = 1; i < numPoints; i++) {
        const px = reader.readDD(points[i - 1][0]);
        const py = reader.readDD(points[i - 1][1]);
        points.push([px, py]);
      }
    }

    const bulges: number[] = [];
    for (let i = 0; i < numBulges; i++) bulges.push(reader.readBD());

    const widths: [number, number][] = [];
    for (let i = 0; i < numWidths; i++) {
      widths.push([reader.readBD(), reader.readBD()]);
    }

    return {
      type: 'LWPOLYLINE', flag, constWidth, elevation,
      thickness, normal: [...normal], points, bulges, widths,
      closed: !!(flag & 512),
    };
  }

  private parseSpline(reader: DwgBitReader): Record<string, unknown> {
    const scenario = reader.readBL();
    const result: Record<string, unknown> = { type: 'SPLINE', scenario };

    if (scenario === 2) {
      const degree = reader.readBL();
      result['degree'] = degree;
      const numKnots = reader.readBL();
      const numCtrl = reader.readBL();
      const weighted = reader.readBit();
      const knots = Array.from({ length: numKnots }, () => reader.readBD());
      const ctrlPts = Array.from({ length: numCtrl }, () => {
        const pt = reader.read3BD();
        const w = weighted ? reader.readBD() : 1.0;
        return { point: [...pt], weight: w };
      });
      result['knots'] = knots;
      result['controlPoints'] = ctrlPts;
    } else if (scenario === 1) {
      const degree = reader.readBL();
      result['degree'] = degree;
      reader.readBD(); // knot param
      const numFit = reader.readBL();
      result['fitPoints'] = Array.from({ length: numFit }, () => [...reader.read3BD()]);
    }
    return result;
  }

  private parseSolid(reader: DwgBitReader): Record<string, unknown> {
    const thickness = reader.readBT();
    const elevation = reader.readBD();
    const corners = [reader.read2RD(), reader.read2RD(), reader.read2RD(), reader.read2RD()];
    const extrusion = reader.readBE();
    return {
      type: 'SOLID', thickness, elevation,
      corners: corners.map(c => [...c]),
      extrusion: [...extrusion],
    };
  }

  private parseRay(reader: DwgBitReader): Record<string, unknown> {
    const point = reader.read3BD();
    const vector = reader.read3BD();
    return { type: 'RAY', point: [...point], vector: [...vector] };
  }

  private parseXline(reader: DwgBitReader): Record<string, unknown> {
    const point = reader.read3BD();
    const vector = reader.read3BD();
    return { type: 'XLINE', point: [...point], vector: [...vector] };
  }

  // ------------------------------------------------------------------
  // Table / non-entity object parsers
  // ------------------------------------------------------------------

  private parseTableObject(reader: DwgBitReader, typeNum: number, typeName: string): Record<string, unknown> {
    const result: Record<string, unknown> = { type: typeName };
    try {
      if (typeNum === 0x33) Object.assign(result, this.parseLayer(reader));
      else if (typeNum === 0x31) Object.assign(result, this.parseBlockHeader(reader));
      else if (typeNum === 0x30 || typeNum === 0x32) Object.assign(result, this.parseControlObject(reader));
      else if (typeNum === 0x35) Object.assign(result, this.parseStyle(reader));
      else if (typeNum === 0x39) Object.assign(result, this.parseLtype(reader));
      else if (typeNum === 0x2A) Object.assign(result, this.parseDictionary(reader));
      else if (TABLE_CONTROL_TYPES.has(typeNum)) Object.assign(result, this.parseControlObject(reader));
    } catch { /* partial parse */ }
    return result;
  }

  private parseControlObject(reader: DwgBitReader): Record<string, unknown> {
    reader.readBL(); // num reactors
    const numEntries = reader.readBL();
    return { numEntries };
  }

  private parseLayer(reader: DwgBitReader): Record<string, unknown> {
    reader.readBL(); // num reactors
    const name = reader.readT();
    reader.readBit(); // bit64
    reader.readBS(); // xref_index
    reader.readBit(); // xdep
    const flags = reader.readBS();
    const color = reader.readCMC();
    return {
      name, flags, color,
      frozen: !!(flags & 1),
      off: color < 0,
      locked: !!(flags & 4),
    };
  }

  private parseBlockHeader(reader: DwgBitReader): Record<string, unknown> {
    reader.readBL(); // num reactors
    const name = reader.readT();
    reader.readBit(); reader.readBS(); reader.readBit();
    const anonymous = reader.readBit();
    const hasAttribs = reader.readBit();
    const blkIsXref = reader.readBit();
    reader.readBit(); reader.readBit();
    return {
      name, anonymous: !!anonymous,
      hasAttribs: !!hasAttribs, isXref: !!blkIsXref,
    };
  }

  private parseStyle(reader: DwgBitReader): Record<string, unknown> {
    reader.readBL();
    const name = reader.readT();
    reader.readBit(); reader.readBS(); reader.readBit();
    reader.readBit(); reader.readBit();
    const fixedHeight = reader.readBD();
    const widthFactor = reader.readBD();
    const oblique = reader.readBD();
    reader.readByte(); // generation
    reader.readBD(); // last height
    const fontName = reader.readT();
    const bigfontName = reader.readT();
    return { name, fixedHeight, widthFactor, oblique, fontName, bigfontName };
  }

  private parseLtype(reader: DwgBitReader): Record<string, unknown> {
    reader.readBL();
    const name = reader.readT();
    reader.readBit(); reader.readBS(); reader.readBit();
    const description = reader.readT();
    const patternLength = reader.readBD();
    reader.readByte(); // alignment
    const numDashes = reader.readByte();
    return { name, description, patternLength, numDashes };
  }

  private parseDictionary(reader: DwgBitReader): Record<string, unknown> {
    reader.readBL(); // num reactors
    const numItems = reader.readBL();
    const cloningFlag = reader.readBS();
    reader.readByte(); // hard owner
    const entries: Record<string, number> = {};
    for (let i = 0; i < numItems; i++) {
      try {
        const name = reader.readT();
        const [, handleVal] = reader.readH();
        entries[name] = handleVal;
      } catch { break; }
    }
    return { numItems, cloningFlag, entries };
  }
}
