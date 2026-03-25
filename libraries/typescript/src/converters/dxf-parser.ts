/**
 * DXF section-level parser -- pure TypeScript, no external dependencies.
 *
 * Parses tokenised DXF group-code/value pairs into a structured DxfFile
 * object containing header variables, tables, blocks, entities and objects.
 */

import { type DxfValue, type DxfToken, tokenize } from './dxf-tokenizer.js';

// ---------------------------------------------------------------------------
// Data model
// ---------------------------------------------------------------------------

export interface DxfFile {
  header: Record<string, unknown>;
  tables: Record<string, Record<string, unknown>[]>;
  blocks: Record<string, Record<string, unknown>>;
  entities: Record<string, unknown>[];
  objects: Record<string, unknown>[];
}

// ---------------------------------------------------------------------------
// Token stream helper
// ---------------------------------------------------------------------------

class TokenStream {
  private iter: Generator<DxfToken, void, undefined>;
  private buffer: DxfToken[] = [];
  private done = false;

  constructor(tokens: Generator<DxfToken, void, undefined>) {
    this.iter = tokens;
  }

  peek(): DxfToken | null {
    if (this.buffer.length > 0) return this.buffer[0];
    if (this.done) return null;
    const result = this.iter.next();
    if (result.done) {
      this.done = true;
      return null;
    }
    this.buffer.push(result.value);
    return result.value;
  }

  next(): DxfToken | null {
    if (this.buffer.length > 0) return this.buffer.shift()!;
    if (this.done) return null;
    const result = this.iter.next();
    if (result.done) {
      this.done = true;
      return null;
    }
    return result.value;
  }
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

export class DxfParser {
  parse(content: string): DxfFile {
    const tokens = new TokenStream(tokenize(content));
    const result: DxfFile = {
      header: {},
      tables: {},
      blocks: {},
      entities: [],
      objects: [],
    };

    while (true) {
      const tok = tokens.next();
      if (!tok) break;
      const [code, value] = tok;
      if (code === 0 && value === 'EOF') break;
      if (code === 0 && value === 'SECTION') {
        const nameTok = tokens.next();
        if (!nameTok) break;
        const sectionName = String(nameTok[1]).toUpperCase();

        if (sectionName === 'HEADER') result.header = this.parseHeader(tokens);
        else if (sectionName === 'TABLES') result.tables = this.parseTables(tokens);
        else if (sectionName === 'BLOCKS') result.blocks = this.parseBlocks(tokens);
        else if (sectionName === 'ENTITIES') result.entities = this.parseEntities(tokens);
        else if (sectionName === 'OBJECTS') result.objects = this.parseObjects(tokens);
        else this.skipSection(tokens);
      }
    }
    return result;
  }

  // -----------------------------------------------------------------
  // HEADER
  // -----------------------------------------------------------------

  private parseHeader(tokens: TokenStream): Record<string, unknown> {
    const header: Record<string, unknown> = {};
    let currentVar: string | null = null;
    let currentValues: [number, DxfValue][] = [];

    while (true) {
      const tok = tokens.next();
      if (!tok) break;
      const [code, value] = tok;
      if (code === 0 && String(value) === 'ENDSEC') break;

      if (code === 9) {
        if (currentVar !== null) {
          header[currentVar] = this.collapseHeaderVar(currentValues);
        }
        currentVar = String(value);
        currentValues = [];
      } else {
        currentValues.push([code, value]);
      }
    }
    if (currentVar !== null) {
      header[currentVar] = this.collapseHeaderVar(currentValues);
    }
    return header;
  }

  private collapseHeaderVar(pairs: [number, DxfValue][]): unknown {
    if (pairs.length === 0) return null;
    if (pairs.length === 1) return pairs[0][1];
    const codes = new Set(pairs.map(p => p[0]));
    if (codes.has(10) || codes.has(20) || codes.has(30)) {
      let x = 0, y = 0, z = 0;
      for (const [c, v] of pairs) {
        if (c === 10) x = Number(v);
        else if (c === 20) y = Number(v);
        else if (c === 30) z = Number(v);
      }
      return [x, y, z];
    }
    const obj: Record<number, DxfValue> = {};
    for (const [c, v] of pairs) obj[c] = v;
    return obj;
  }

  // -----------------------------------------------------------------
  // TABLES
  // -----------------------------------------------------------------

  private parseTables(tokens: TokenStream): Record<string, Record<string, unknown>[]> {
    const tables: Record<string, Record<string, unknown>[]> = {};

    while (true) {
      const tok = tokens.next();
      if (!tok) break;
      const [code, value] = tok;
      if (code === 0 && String(value) === 'ENDSEC') break;
      if (code === 0 && String(value) === 'TABLE') {
        const nameTok = tokens.next();
        if (!nameTok) break;
        const tableName = String(nameTok[1]).toUpperCase();
        tables[tableName] = this.parseTableEntries(tokens, tableName);
      }
    }
    return tables;
  }

  private parseTableEntries(tokens: TokenStream, tableName: string): Record<string, unknown>[] {
    const entries: Record<string, unknown>[] = [];

    while (true) {
      const tok = tokens.next();
      if (!tok) break;
      const [code, value] = tok;
      if (code === 0 && String(value) === 'ENDTAB') break;
      if (code === 0) {
        const entry = this.parseTableEntry(tokens, tableName);
        entry['_entry_type'] = String(value);
        entries.push(entry);
      }
    }
    return entries;
  }

  private parseTableEntry(tokens: TokenStream, tableName: string): Record<string, unknown> {
    const entry: Record<string, unknown> = {};
    const patternElements: number[] = [];

    while (true) {
      const tok = tokens.peek();
      if (!tok) break;
      const [code, value] = tok;
      if (code === 0) break;
      tokens.next();

      if (tableName === 'LAYER') this.applyLayerCode(entry, code, value);
      else if (tableName === 'LTYPE') this.applyLtypeCode(entry, code, value, patternElements);
      else if (tableName === 'STYLE') this.applyStyleCode(entry, code, value);
      else if (tableName === 'DIMSTYLE') this.applyDimstyleCode(entry, code, value);
      else this.applyGenericTableCode(entry, code, value);
    }
    if (patternElements.length > 0) entry['pattern'] = patternElements;
    return entry;
  }

  private applyLayerCode(entry: Record<string, unknown>, code: number, value: DxfValue): void {
    if (code === 2) entry['name'] = String(value);
    else if (code === 5) entry['handle'] = String(value);
    else if (code === 6) entry['linetype'] = String(value);
    else if (code === 62) {
      const color = Number(value);
      entry['color'] = Math.abs(color);
      if (color < 0) entry['off'] = true;
    }
    else if (code === 70) {
      const flags = Number(value);
      entry['flags'] = flags;
      entry['frozen'] = !!(flags & 1);
      entry['locked'] = !!(flags & 4);
    }
    else if (code === 290) entry['plot'] = !!value;
    else if (code === 370) entry['lineweight'] = Number(value);
    else if (code === 390) entry['plotStyleHandle'] = String(value);
    else if (code === 420) entry['trueColor'] = Number(value);
    else if (code === 330) entry['ownerHandle'] = String(value);
  }

  private applyLtypeCode(entry: Record<string, unknown>, code: number, value: DxfValue, elements: number[]): void {
    if (code === 2) entry['name'] = String(value);
    else if (code === 5) entry['handle'] = String(value);
    else if (code === 3) entry['description'] = String(value);
    else if (code === 73) entry['elementCount'] = Number(value);
    else if (code === 40) entry['totalLength'] = Number(value);
    else if (code === 49) elements.push(Number(value));
    else if (code === 70) entry['flags'] = Number(value);
  }

  private applyStyleCode(entry: Record<string, unknown>, code: number, value: DxfValue): void {
    if (code === 2) entry['name'] = String(value);
    else if (code === 5) entry['handle'] = String(value);
    else if (code === 3) entry['font'] = String(value);
    else if (code === 4) entry['bigFont'] = String(value);
    else if (code === 40) entry['height'] = Number(value);
    else if (code === 41) entry['widthFactor'] = Number(value);
    else if (code === 42) entry['lastHeight'] = Number(value);
    else if (code === 50) entry['obliqueAngle'] = Number(value);
    else if (code === 70) entry['flags'] = Number(value);
    else if (code === 71) entry['textGenerationFlags'] = Number(value);
    else if (code === 1071) entry['fontFlags'] = Number(value);
  }

  private applyDimstyleCode(entry: Record<string, unknown>, code: number, value: DxfValue): void {
    if (code === 2) entry['name'] = String(value);
    else if (code === 5) entry['handle'] = String(value);
    else if (code === 3) entry['DIMPOST'] = String(value);
    else if (code === 4) entry['DIMAPOST'] = String(value);
    else if (code === 40) entry['DIMSCALE'] = Number(value);
    else if (code === 41) entry['DIMASZ'] = Number(value);
    else if (code === 42) entry['DIMEXO'] = Number(value);
    else if (code === 43) entry['DIMDLI'] = Number(value);
    else if (code === 44) entry['DIMEXE'] = Number(value);
    else if (code === 45) entry['DIMRND'] = Number(value);
    else if (code === 46) entry['DIMDLE'] = Number(value);
    else if (code === 47) entry['DIMTP'] = Number(value);
    else if (code === 48) entry['DIMTM'] = Number(value);
    else if (code === 140) entry['DIMTXT'] = Number(value);
    else if (code === 141) entry['DIMCEN'] = Number(value);
    else if (code === 142) entry['DIMTSZ'] = Number(value);
    else if (code === 143) entry['DIMALTF'] = Number(value);
    else if (code === 144) entry['DIMLFAC'] = Number(value);
    else if (code === 145) entry['DIMTVP'] = Number(value);
    else if (code === 146) entry['DIMTFAC'] = Number(value);
    else if (code === 147) entry['DIMGAP'] = Number(value);
    else if (code === 71) entry['DIMTOL'] = Number(value);
    else if (code === 72) entry['DIMLIM'] = Number(value);
    else if (code === 73) entry['DIMTIH'] = Number(value);
    else if (code === 74) entry['DIMTOH'] = Number(value);
    else if (code === 75) entry['DIMSE1'] = Number(value);
    else if (code === 76) entry['DIMSE2'] = Number(value);
    else if (code === 77) entry['DIMTAD'] = Number(value);
    else if (code === 78) entry['DIMZIN'] = Number(value);
    else if (code === 170) entry['DIMALT'] = Number(value);
    else if (code === 171) entry['DIMALTD'] = Number(value);
    else if (code === 172) entry['DIMTOFL'] = Number(value);
    else if (code === 173) entry['DIMSAH'] = Number(value);
    else if (code === 174) entry['DIMTIX'] = Number(value);
    else if (code === 175) entry['DIMSOXD'] = Number(value);
    else if (code === 176) entry['DIMCLRD'] = Number(value);
    else if (code === 177) entry['DIMCLRE'] = Number(value);
    else if (code === 178) entry['DIMCLRT'] = Number(value);
    else if (code === 270) entry['DIMUNIT'] = Number(value);
    else if (code === 271) entry['DIMDEC'] = Number(value);
    else if (code === 272) entry['DIMTDEC'] = Number(value);
    else if (code === 273) entry['DIMALTU'] = Number(value);
    else if (code === 274) entry['DIMALTDEC'] ??= Number(value);
    else if (code === 275) entry['DIMAUNIT'] = Number(value);
    else if (code === 276) entry['DIMFRAC'] = Number(value);
    else if (code === 277) entry['DIMLUNIT'] = Number(value);
    else if (code === 278) entry['DIMDSEP'] = Number(value);
    else if (code === 279) entry['DIMTMOVE'] = Number(value);
    else if (code === 280) entry['DIMJUST'] = Number(value);
    else if (code === 281) entry['DIMSD1'] = Number(value);
    else if (code === 282) entry['DIMSD2'] = Number(value);
    else if (code === 283) entry['DIMTOLJ'] = Number(value);
    else if (code === 284) entry['DIMTZIN'] = Number(value);
    else if (code === 285) entry['DIMALTZ'] = Number(value);
    else if (code === 286) entry['DIMALTTZ'] = Number(value);
    else if (code === 288) entry['DIMUPT'] = Number(value);
    else if (code === 289) entry['DIMATFIT'] = Number(value);
    else if (code === 340) entry['DIMTXSTY'] = String(value);
    else if (code === 341) entry['DIMLDRBLK'] = String(value);
    else if (code === 342) entry['DIMBLK'] = String(value);
    else if (code === 343) entry['DIMBLK1'] = String(value);
    else if (code === 344) entry['DIMBLK2'] = String(value);
    else if (code === 371) entry['DIMLWD'] = Number(value);
    else if (code === 372) entry['DIMLWE'] = Number(value);
  }

  private applyGenericTableCode(entry: Record<string, unknown>, code: number, value: DxfValue): void {
    if (code === 2) entry['name'] = String(value);
    else if (code === 5) entry['handle'] = String(value);
    else if (code === 70) entry['flags'] = Number(value);
    else if (code !== 100) entry[code] = value;
  }

  // -----------------------------------------------------------------
  // BLOCKS
  // -----------------------------------------------------------------

  private parseBlocks(tokens: TokenStream): Record<string, Record<string, unknown>> {
    const blocks: Record<string, Record<string, unknown>> = {};

    while (true) {
      const tok = tokens.next();
      if (!tok) break;
      const [code, value] = tok;
      if (code === 0 && String(value) === 'ENDSEC') break;
      if (code === 0 && String(value) === 'BLOCK') {
        const block = this.parseBlock(tokens);
        const name = String(block['name'] ?? '');
        blocks[name] = block;
      }
    }
    return blocks;
  }

  private parseBlock(tokens: TokenStream): Record<string, unknown> {
    const block: Record<string, unknown> = {};
    let baseX = 0, baseY = 0, baseZ = 0;

    // Read block header fields
    while (true) {
      const tok = tokens.peek();
      if (!tok) break;
      const [code, value] = tok;
      if (code === 0) break;
      tokens.next();

      if (code === 2) block['name'] = String(value);
      else if (code === 3) block['name2'] = String(value);
      else if (code === 5) block['handle'] = String(value);
      else if (code === 8) block['layer'] = String(value);
      else if (code === 10) baseX = Number(value);
      else if (code === 20) baseY = Number(value);
      else if (code === 30) baseZ = Number(value);
      else if (code === 70) block['flags'] = Number(value);
    }
    block['basePoint'] = [baseX, baseY, baseZ];

    // Read entities inside block until ENDBLK
    const entities: Record<string, unknown>[] = [];
    while (true) {
      const tok = tokens.next();
      if (!tok) break;
      const [code, value] = tok;
      if (code === 0 && String(value) === 'ENDBLK') {
        this.skipToNextEntity(tokens);
        break;
      }
      if (code === 0) {
        const entityType = String(value);
        const entity = this.parseEntity(entityType, tokens);
        entities.push(entity);
      }
    }
    block['entities'] = entities;
    return block;
  }

  // -----------------------------------------------------------------
  // ENTITIES
  // -----------------------------------------------------------------

  private parseEntities(tokens: TokenStream): Record<string, unknown>[] {
    const entities: Record<string, unknown>[] = [];

    while (true) {
      const tok = tokens.next();
      if (!tok) break;
      const [code, value] = tok;
      if (code === 0 && String(value) === 'ENDSEC') break;
      if (code === 0) {
        entities.push(this.parseEntity(String(value), tokens));
      }
    }
    return entities;
  }

  // -----------------------------------------------------------------
  // OBJECTS
  // -----------------------------------------------------------------

  private parseObjects(tokens: TokenStream): Record<string, unknown>[] {
    const objects: Record<string, unknown>[] = [];

    while (true) {
      const tok = tokens.next();
      if (!tok) break;
      const [code, value] = tok;
      if (code === 0 && String(value) === 'ENDSEC') break;
      if (code === 0) {
        objects.push(this.parseGenericObject(String(value), tokens));
      }
    }
    return objects;
  }

  private parseGenericObject(objType: string, tokens: TokenStream): Record<string, unknown> {
    const obj: Record<string, unknown> = { type: objType };
    while (true) {
      const tok = tokens.peek();
      if (!tok) break;
      const [code, value] = tok;
      if (code === 0) break;
      tokens.next();

      if (code === 5) obj['handle'] = String(value);
      else if (code === 2) obj['name'] = String(value);
      else if (code === 330) obj['ownerHandle'] = String(value);
      else if (code === 100) {
        const sub = obj['subclasses'] as string[] | undefined;
        if (sub) sub.push(String(value));
        else obj['subclasses'] = [String(value)];
      }
      else if (code === 3) {
        const entries = obj['entries'] as string[] | undefined;
        if (entries) entries.push(String(value));
        else obj['entries'] = [String(value)];
      }
      else if (code === 350) {
        const handles = obj['entryHandles'] as string[] | undefined;
        if (handles) handles.push(String(value));
        else obj['entryHandles'] = [String(value)];
      }
      else obj[code] = value;
    }
    return obj;
  }

  // -----------------------------------------------------------------
  // Single entity parser
  // -----------------------------------------------------------------

  private parseEntity(entityType: string, tokens: TokenStream): Record<string, unknown> {
    const dispatch: Record<string, (etype: string, t: TokenStream) => Record<string, unknown>> = {
      'LINE': (e, t) => this.parseLine(e, t),
      'POINT': (e, t) => this.parsePoint(e, t),
      'CIRCLE': (e, t) => this.parseCircle(e, t),
      'ARC': (e, t) => this.parseArc(e, t),
      'ELLIPSE': (e, t) => this.parseEllipse(e, t),
      'SPLINE': (e, t) => this.parseSpline(e, t),
      'LWPOLYLINE': (e, t) => this.parseLWPolyline(e, t),
      'POLYLINE': (e, t) => this.parsePolyline(e, t),
      'TEXT': (e, t) => this.parseText(e, t),
      'MTEXT': (e, t) => this.parseMText(e, t),
      'DIMENSION': (e, t) => this.parseDimension(e, t),
      'LEADER': (e, t) => this.parseLeader(e, t),
      'HATCH': (e, t) => this.parseHatch(e, t),
      'INSERT': (e, t) => this.parseInsert(e, t),
      'ATTDEF': (e, t) => this.parseAttdef(e, t),
      'ATTRIB': (e, t) => this.parseAttrib(e, t),
      'SOLID': (e, t) => this.parseSolidTrace(e, t),
      'TRACE': (e, t) => this.parseSolidTrace(e, t),
      '3DFACE': (e, t) => this.parse3DFace(e, t),
      'VIEWPORT': (e, t) => this.parseViewport(e, t),
      'XLINE': (e, t) => this.parseXlineRay(e, t),
      'RAY': (e, t) => this.parseXlineRay(e, t),
      'IMAGE': (e, t) => this.parseImage(e, t),
      'WIPEOUT': (e, t) => this.parseWipeout(e, t),
      'TABLE': (e, t) => this.parseTableEntity(e, t),
      '3DSOLID': (e, t) => this.parseAcis(e, t),
      'BODY': (e, t) => this.parseAcis(e, t),
      'REGION': (e, t) => this.parseAcis(e, t),
      'SURFACE': (e, t) => this.parseAcis(e, t),
      'MESH': (e, t) => this.parseMesh(e, t),
    };

    const handler = dispatch[entityType];
    const entity = handler ? handler(entityType, tokens) : this.parseGenericEntity(entityType, tokens);
    entity['type'] = entityType;
    return entity;
  }

  // --- Common property extraction ---
  private applyCommon(entity: Record<string, unknown>, code: number, value: DxfValue): boolean {
    if (code === 5) { entity['handle'] = String(value); return true; }
    if (code === 8) { entity['layer'] = String(value); return true; }
    if (code === 6) { entity['linetype'] = String(value); return true; }
    if (code === 62) { entity['color'] = Number(value); return true; }
    if (code === 370) { entity['lineweight'] = Number(value); return true; }
    if (code === 420) { entity['trueColor'] = Number(value); return true; }
    if (code === 440) { entity['transparency'] = Number(value); return true; }
    if (code === 60) { entity['visibility'] = Number(value); return true; }
    if (code === 67) { entity['paperSpace'] = Number(value); return true; }
    if (code === 210) {
      const ext = entity['extrusion'] as number[] ?? [0, 0, 1];
      ext[0] = Number(value);
      entity['extrusion'] = ext;
      return true;
    }
    if (code === 220) {
      const ext = entity['extrusion'] as number[] ?? [0, 0, 1];
      ext[1] = Number(value);
      entity['extrusion'] = ext;
      return true;
    }
    if (code === 230) {
      const ext = entity['extrusion'] as number[] ?? [0, 0, 1];
      ext[2] = Number(value);
      entity['extrusion'] = ext;
      return true;
    }
    if (code === 100) return true;
    if (code === 330) { entity['ownerHandle'] = String(value); return true; }
    if (code === 102) return true;
    return false;
  }

  // --- Collect raw codes until next entity boundary ---
  private collectCodes(tokens: TokenStream): [number, DxfValue][] {
    const pairs: [number, DxfValue][] = [];
    while (true) {
      const tok = tokens.peek();
      if (!tok) break;
      if (tok[0] === 0) break;
      tokens.next();
      pairs.push(tok);
    }
    return pairs;
  }

  // --- LINE ---
  private parseLine(_etype: string, tokens: TokenStream): Record<string, unknown> {
    const e: Record<string, unknown> = {};
    let sx = 0, sy = 0, sz = 0, ex = 0, ey = 0, ez = 0;
    for (const [code, value] of this.collectCodes(tokens)) {
      if (this.applyCommon(e, code, value)) continue;
      if (code === 10) sx = Number(value);
      else if (code === 20) sy = Number(value);
      else if (code === 30) sz = Number(value);
      else if (code === 11) ex = Number(value);
      else if (code === 21) ey = Number(value);
      else if (code === 31) ez = Number(value);
    }
    e['start'] = [sx, sy, sz];
    e['end'] = [ex, ey, ez];
    return e;
  }

  // --- POINT ---
  private parsePoint(_etype: string, tokens: TokenStream): Record<string, unknown> {
    const e: Record<string, unknown> = {};
    let px = 0, py = 0, pz = 0;
    for (const [code, value] of this.collectCodes(tokens)) {
      if (this.applyCommon(e, code, value)) continue;
      if (code === 10) px = Number(value);
      else if (code === 20) py = Number(value);
      else if (code === 30) pz = Number(value);
    }
    e['position'] = [px, py, pz];
    return e;
  }

  // --- CIRCLE ---
  private parseCircle(_etype: string, tokens: TokenStream): Record<string, unknown> {
    const e: Record<string, unknown> = {};
    let cx = 0, cy = 0, cz = 0, r = 0;
    for (const [code, value] of this.collectCodes(tokens)) {
      if (this.applyCommon(e, code, value)) continue;
      if (code === 10) cx = Number(value);
      else if (code === 20) cy = Number(value);
      else if (code === 30) cz = Number(value);
      else if (code === 40) r = Number(value);
    }
    e['center'] = [cx, cy, cz];
    e['radius'] = r;
    return e;
  }

  // --- ARC ---
  private parseArc(_etype: string, tokens: TokenStream): Record<string, unknown> {
    const e: Record<string, unknown> = {};
    let cx = 0, cy = 0, cz = 0, r = 0, sa = 0, ea = 0;
    for (const [code, value] of this.collectCodes(tokens)) {
      if (this.applyCommon(e, code, value)) continue;
      if (code === 10) cx = Number(value);
      else if (code === 20) cy = Number(value);
      else if (code === 30) cz = Number(value);
      else if (code === 40) r = Number(value);
      else if (code === 50) sa = Number(value);
      else if (code === 51) ea = Number(value);
    }
    e['center'] = [cx, cy, cz];
    e['radius'] = r;
    e['startAngle'] = sa;
    e['endAngle'] = ea;
    return e;
  }

  // --- ELLIPSE ---
  private parseEllipse(_etype: string, tokens: TokenStream): Record<string, unknown> {
    const e: Record<string, unknown> = {};
    let cx = 0, cy = 0, cz = 0, mx = 0, my = 0, mz = 0;
    let ratio = 1.0, sp = 0.0, ep = 6.283185307179586;
    for (const [code, value] of this.collectCodes(tokens)) {
      if (this.applyCommon(e, code, value)) continue;
      if (code === 10) cx = Number(value);
      else if (code === 20) cy = Number(value);
      else if (code === 30) cz = Number(value);
      else if (code === 11) mx = Number(value);
      else if (code === 21) my = Number(value);
      else if (code === 31) mz = Number(value);
      else if (code === 40) ratio = Number(value);
      else if (code === 41) sp = Number(value);
      else if (code === 42) ep = Number(value);
    }
    e['center'] = [cx, cy, cz];
    e['majorAxisEndpoint'] = [mx, my, mz];
    e['minorAxisRatio'] = ratio;
    e['startParam'] = sp;
    e['endParam'] = ep;
    return e;
  }

  // --- SPLINE ---
  private parseSpline(_etype: string, tokens: TokenStream): Record<string, unknown> {
    const e: Record<string, unknown> = {};
    let degree = 3, flags = 0;
    const knots: number[] = [];
    const ctrlPts: number[][] = [];
    const fitPts: number[][] = [];
    const weights: number[] = [];
    let cx = 0, cy = 0, cz = 0;
    let fx = 0, fy = 0, fz = 0;
    let inCtrl = false, inFit = false;

    for (const [code, value] of this.collectCodes(tokens)) {
      if (this.applyCommon(e, code, value)) continue;
      if (code === 70) flags = Number(value);
      else if (code === 71) degree = Number(value);
      else if (code === 72) { /* num knots */ }
      else if (code === 73) { /* ctrl_count */ }
      else if (code === 74) { /* fit_count */ }
      else if (code === 40) knots.push(Number(value));
      else if (code === 41) weights.push(Number(value));
      else if (code === 10) {
        if (inCtrl) ctrlPts.push([cx, cy, cz]);
        cx = Number(value); cy = 0; cz = 0;
        inCtrl = true; inFit = false;
      }
      else if (code === 20) { if (inCtrl) cy = Number(value); else if (inFit) fy = Number(value); }
      else if (code === 30) { if (inCtrl) cz = Number(value); else if (inFit) fz = Number(value); }
      else if (code === 11) {
        if (inFit) fitPts.push([fx, fy, fz]);
        fx = Number(value); fy = 0; fz = 0;
        inFit = true; inCtrl = false;
      }
      else if (code === 21) { if (inFit) fy = Number(value); }
      else if (code === 31) { if (inFit) fz = Number(value); }
    }
    if (inCtrl) ctrlPts.push([cx, cy, cz]);
    if (inFit) fitPts.push([fx, fy, fz]);

    e['degree'] = degree;
    e['closed'] = !!(flags & 1);
    if (knots.length) e['knots'] = knots;
    if (ctrlPts.length) e['controlPoints'] = ctrlPts;
    if (fitPts.length) e['fitPoints'] = fitPts;
    if (weights.length && weights.some(w => w !== 1.0)) {
      e['weights'] = weights;
      e['rational'] = true;
    }
    return e;
  }

  // --- LWPOLYLINE ---
  private parseLWPolyline(_etype: string, tokens: TokenStream): Record<string, unknown> {
    const e: Record<string, unknown> = {};
    const vertices: Record<string, unknown>[] = [];
    let currentV: Record<string, unknown> | null = null;
    let elevation = 0;

    for (const [code, value] of this.collectCodes(tokens)) {
      if (this.applyCommon(e, code, value)) continue;
      if (code === 90) { /* vertex count */ }
      else if (code === 70) {
        e['closed'] = !!(Number(value) & 1);
      }
      else if (code === 38) elevation = Number(value);
      else if (code === 10) {
        if (currentV) vertices.push(currentV);
        currentV = { x: Number(value), y: 0 };
      }
      else if (code === 20 && currentV) currentV['y'] = Number(value);
      else if (code === 40 && currentV) {
        const sw = Number(value);
        if (sw !== 0) currentV['startWidth'] = sw;
      }
      else if (code === 41 && currentV) {
        const ew = Number(value);
        if (ew !== 0) currentV['endWidth'] = ew;
      }
      else if (code === 42 && currentV) {
        const b = Number(value);
        if (b !== 0) currentV['bulge'] = b;
      }
    }
    if (currentV) vertices.push(currentV);
    e['vertices'] = vertices;
    if (elevation !== 0) e['elevation'] = elevation;
    return e;
  }

  // --- POLYLINE ---
  private parsePolyline(_etype: string, tokens: TokenStream): Record<string, unknown> {
    const e: Record<string, unknown> = {};
    let flags = 0;

    for (const [code, value] of this.collectCodes(tokens)) {
      if (this.applyCommon(e, code, value)) continue;
      if (code === 70) flags = Number(value);
    }

    const is3d = !!(flags & 8) || !!(flags & 16);
    e['closed'] = !!(flags & 1);
    e['flags'] = flags;

    const vertices: Record<string, unknown>[] = [];
    while (true) {
      const tok = tokens.next();
      if (!tok) break;
      const [code, value] = tok;
      if (code === 0 && String(value) === 'SEQEND') {
        this.skipToNextEntity(tokens);
        break;
      }
      if (code === 0 && String(value) === 'VERTEX') {
        vertices.push(this.parseVertex(tokens));
      }
    }

    if (is3d) {
      e['type'] = 'POLYLINE3D';
      e['vertices'] = vertices.map(v => [
        Number(v['x'] ?? 0), Number(v['y'] ?? 0), Number(v['z'] ?? 0)
      ]);
    } else {
      e['type'] = 'POLYLINE2D';
      e['vertices'] = vertices.map(v => {
        const vd: Record<string, unknown> = {
          position: [Number(v['x'] ?? 0), Number(v['y'] ?? 0), Number(v['z'] ?? 0)]
        };
        const b = Number(v['bulge'] ?? 0);
        if (b) vd['bulge'] = b;
        return vd;
      });
    }
    return e;
  }

  private parseVertex(tokens: TokenStream): Record<string, unknown> {
    const v: Record<string, unknown> = { x: 0, y: 0, z: 0 };
    for (const [code, value] of this.collectCodes(tokens)) {
      if (code === 10) v['x'] = Number(value);
      else if (code === 20) v['y'] = Number(value);
      else if (code === 30) v['z'] = Number(value);
      else if (code === 42) v['bulge'] = Number(value);
      else if (code === 70) v['flags'] = Number(value);
      else if (code === 40) v['startWidth'] = Number(value);
      else if (code === 41) v['endWidth'] = Number(value);
    }
    return v;
  }

  // --- TEXT ---
  private parseText(_etype: string, tokens: TokenStream): Record<string, unknown> {
    const e: Record<string, unknown> = {};
    let ix = 0, iy = 0, iz = 0, ax = 0, ay = 0, az = 0;
    let hasAlign = false;
    for (const [code, value] of this.collectCodes(tokens)) {
      if (this.applyCommon(e, code, value)) continue;
      if (code === 1) e['text'] = String(value);
      else if (code === 10) ix = Number(value);
      else if (code === 20) iy = Number(value);
      else if (code === 30) iz = Number(value);
      else if (code === 11) { ax = Number(value); hasAlign = true; }
      else if (code === 21) ay = Number(value);
      else if (code === 31) az = Number(value);
      else if (code === 40) e['height'] = Number(value);
      else if (code === 50) e['rotation'] = Number(value);
      else if (code === 7) e['style'] = String(value);
      else if (code === 72) e['horizontalAlignment'] = Number(value);
      else if (code === 73) e['verticalAlignment'] = Number(value);
      else if (code === 71) e['textGenerationFlags'] = Number(value);
      else if (code === 41) e['widthFactor'] = Number(value);
      else if (code === 51) e['obliqueAngle'] = Number(value);
    }
    e['insertionPoint'] = [ix, iy, iz];
    if (hasAlign) e['alignmentPoint'] = [ax, ay, az];
    return e;
  }

  // --- MTEXT ---
  private parseMText(_etype: string, tokens: TokenStream): Record<string, unknown> {
    const e: Record<string, unknown> = {};
    let ix = 0, iy = 0, iz = 0;
    const textParts: string[] = [];
    for (const [code, value] of this.collectCodes(tokens)) {
      if (this.applyCommon(e, code, value)) continue;
      if (code === 1) textParts.push(String(value));
      else if (code === 3) textParts.push(String(value));
      else if (code === 10) ix = Number(value);
      else if (code === 20) iy = Number(value);
      else if (code === 30) iz = Number(value);
      else if (code === 40) e['height'] = Number(value);
      else if (code === 41) e['width'] = Number(value);
      else if (code === 50) e['rotation'] = Number(value);
      else if (code === 7) e['style'] = String(value);
      else if (code === 71) e['attachment'] = Number(value);
      else if (code === 72) e['drawingDirection'] = Number(value);
      else if (code === 44) e['lineSpacingFactor'] = Number(value);
      else if (code === 73) e['lineSpacingStyle'] = Number(value);
    }
    e['insertionPoint'] = [ix, iy, iz];
    e['text'] = textParts.join('');
    return e;
  }

  // --- DIMENSION ---
  private parseDimension(_etype: string, tokens: TokenStream): Record<string, unknown> {
    const e: Record<string, unknown> = {};
    let dpX = 0, dpY = 0, dpZ = 0;
    let mpX = 0, mpY = 0, mpZ = 0;
    let d1X = 0, d1Y = 0, d1Z = 0;
    let d2X = 0, d2Y = 0, d2Z = 0;
    let d3X = 0, d3Y = 0, d3Z = 0;
    let dimtype = 0;

    for (const [code, value] of this.collectCodes(tokens)) {
      if (this.applyCommon(e, code, value)) continue;
      if (code === 2) e['blockName'] = String(value);
      else if (code === 3) e['dimStyle'] = String(value);
      else if (code === 1) e['overrideText'] = String(value);
      else if (code === 70) dimtype = Number(value);
      else if (code === 53) e['rotationAngle'] = Number(value);
      else if (code === 10) dpX = Number(value);
      else if (code === 20) dpY = Number(value);
      else if (code === 30) dpZ = Number(value);
      else if (code === 11) mpX = Number(value);
      else if (code === 21) mpY = Number(value);
      else if (code === 31) mpZ = Number(value);
      else if (code === 13) d1X = Number(value);
      else if (code === 23) d1Y = Number(value);
      else if (code === 33) d1Z = Number(value);
      else if (code === 14) d2X = Number(value);
      else if (code === 24) d2Y = Number(value);
      else if (code === 34) d2Z = Number(value);
      else if (code === 15) d3X = Number(value);
      else if (code === 25) d3Y = Number(value);
      else if (code === 35) d3Z = Number(value);
    }

    const subtype = dimtype & 0x0F;
    const typeMap: Record<number, string> = {
      0: 'DIMENSION_LINEAR', 1: 'DIMENSION_ALIGNED',
      2: 'DIMENSION_ANGULAR', 3: 'DIMENSION_DIAMETER',
      4: 'DIMENSION_RADIUS', 5: 'DIMENSION_ANGULAR3P',
      6: 'DIMENSION_ORDINATE',
    };
    e['dimType'] = typeMap[subtype] ?? 'DIMENSION_LINEAR';
    e['dimTypeRaw'] = dimtype;
    e['dimLinePoint'] = [dpX, dpY, dpZ];
    e['textPosition'] = [mpX, mpY, mpZ];
    e['defPoint1'] = [d1X, d1Y, d1Z];
    e['defPoint2'] = [d2X, d2Y, d2Z];
    if (subtype === 2 || subtype === 5) {
      e['defPoint3'] = [d3X, d3Y, d3Z];
    }
    return e;
  }

  // --- LEADER ---
  private parseLeader(_etype: string, tokens: TokenStream): Record<string, unknown> {
    const e: Record<string, unknown> = {};
    const vertices: number[][] = [];
    let vx = 0, vy = 0, vz = 0, haveVertex = false;

    for (const [code, value] of this.collectCodes(tokens)) {
      if (this.applyCommon(e, code, value)) continue;
      if (code === 76) { /* num vertices */ }
      else if (code === 71) e['hasArrowhead'] = !!Number(value);
      else if (code === 72) e['pathType'] = Number(value) === 1 ? 'spline' : 'straight';
      else if (code === 73) e['creationFlag'] = Number(value);
      else if (code === 74) e['hooklineDirection'] = Number(value);
      else if (code === 75) e['hasHookline'] = !!Number(value);
      else if (code === 40) e['textHeight'] = Number(value);
      else if (code === 41) e['textWidth'] = Number(value);
      else if (code === 10) {
        if (haveVertex) vertices.push([vx, vy, vz]);
        vx = Number(value); vy = 0; vz = 0; haveVertex = true;
      }
      else if (code === 20) vy = Number(value);
      else if (code === 30) vz = Number(value);
    }
    if (haveVertex) vertices.push([vx, vy, vz]);
    e['vertices'] = vertices;
    return e;
  }

  // --- HATCH ---
  private parseHatch(_etype: string, tokens: TokenStream): Record<string, unknown> {
    const e: Record<string, unknown> = {};
    const boundaries: Record<string, unknown>[] = [];
    const codes = this.collectCodes(tokens);
    let idx = 0;
    const n = codes.length;

    while (idx < n) {
      const [code, value] = codes[idx];
      idx++;
      if (this.applyCommon(e, code, value)) continue;
      if (code === 2) e['patternName'] = String(value);
      else if (code === 70) e['solid'] = Number(value) === 1;
      else if (code === 71) e['associative'] = Number(value) === 1;
      else if (code === 91) { /* num_boundaries */ }
      else if (code === 92) {
        const [boundary, newIdx] = this.parseHatchBoundary(codes, idx, Number(value));
        boundaries.push(boundary);
        idx = newIdx;
      }
      else if (code === 75) e['hatchStyle'] = Number(value);
      else if (code === 76) e['patternType'] = Number(value);
      else if (code === 52) e['patternAngle'] = Number(value);
      else if (code === 41) e['patternScale'] = Number(value);
      else if (code === 47) e['pixelSize'] = Number(value);
      else if (code === 98) { /* num seed points */ }
    }
    e['boundaries'] = boundaries;
    return e;
  }

  private parseHatchBoundary(codes: [number, DxfValue][], idx: number, flags: number): [Record<string, unknown>, number] {
    const boundary: Record<string, unknown> = { flags };
    const n = codes.length;
    const isPolyline = !!(flags & 2);

    if (isPolyline) {
      const vertices: Record<string, unknown>[] = [];
      let hasBulge = false, isClosed = false, numVerts = 0;

      if (idx < n && codes[idx][0] === 72) { hasBulge = !!Number(codes[idx][1]); idx++; }
      if (idx < n && codes[idx][0] === 73) { isClosed = !!Number(codes[idx][1]); idx++; }
      if (idx < n && codes[idx][0] === 93) { numVerts = Number(codes[idx][1]); idx++; }

      for (let i = 0; i < numVerts; i++) {
        let vx = 0, vy = 0, bulge = 0;
        while (idx < n) {
          const [c, v] = codes[idx];
          if (c === 10) { vx = Number(v); idx++; }
          else if (c === 20) { vy = Number(v); idx++; }
          else if (c === 42) { bulge = Number(v); idx++; }
          else break;
        }
        const vtx: Record<string, unknown> = { x: vx, y: vy };
        if (bulge !== 0) vtx['bulge'] = bulge;
        vertices.push(vtx);
      }
      boundary['type'] = 'polyline';
      boundary['polyline'] = { vertices, closed: isClosed };
    } else {
      let numEdges = 0;
      if (idx < n && codes[idx][0] === 93) { numEdges = Number(codes[idx][1]); idx++; }
      const edges: Record<string, unknown>[] = [];
      for (let i = 0; i < numEdges; i++) {
        if (idx >= n) break;
        if (codes[idx][0] === 72) {
          const edgeType = Number(codes[idx][1]);
          idx++;
          const [edge, newIdx] = this.parseHatchEdge(codes, idx, edgeType);
          edges.push(edge);
          idx = newIdx;
        }
      }
      boundary['type'] = 'edges';
      boundary['edges'] = edges;
    }
    return [boundary, idx];
  }

  private parseHatchEdge(codes: [number, DxfValue][], idx: number, edgeType: number): [Record<string, unknown>, number] {
    const edge: Record<string, unknown> = {};
    const n = codes.length;

    if (edgeType === 1) { // Line
      edge['edgeType'] = 'line';
      let sx = 0, sy = 0, ex = 0, ey = 0;
      while (idx < n) {
        const [c, v] = codes[idx];
        if (c === 10) { sx = Number(v); idx++; }
        else if (c === 20) { sy = Number(v); idx++; }
        else if (c === 11) { ex = Number(v); idx++; }
        else if (c === 21) { ey = Number(v); idx++; }
        else break;
      }
      edge['start'] = [sx, sy];
      edge['end'] = [ex, ey];
    } else if (edgeType === 2) { // Arc
      edge['edgeType'] = 'arc';
      let cx = 0, cy = 0, r = 0, sa = 0, ea = 0;
      let ccw = true;
      while (idx < n) {
        const [c, v] = codes[idx];
        if (c === 10) { cx = Number(v); idx++; }
        else if (c === 20) { cy = Number(v); idx++; }
        else if (c === 40) { r = Number(v); idx++; }
        else if (c === 50) { sa = Number(v); idx++; }
        else if (c === 51) { ea = Number(v); idx++; }
        else if (c === 73) { ccw = !!Number(v); idx++; }
        else break;
      }
      edge['center'] = [cx, cy];
      edge['radius'] = r;
      edge['startAngle'] = sa;
      edge['endAngle'] = ea;
      edge['counterClockwise'] = ccw;
    } else if (edgeType === 3) { // Ellipse
      edge['edgeType'] = 'ellipse';
      let cx = 0, cy = 0, mx = 0, my = 0, ratio = 0, sa = 0, ea = 0;
      let ccw = true;
      while (idx < n) {
        const [c, v] = codes[idx];
        if (c === 10) { cx = Number(v); idx++; }
        else if (c === 20) { cy = Number(v); idx++; }
        else if (c === 11) { mx = Number(v); idx++; }
        else if (c === 21) { my = Number(v); idx++; }
        else if (c === 40) { ratio = Number(v); idx++; }
        else if (c === 50) { sa = Number(v); idx++; }
        else if (c === 51) { ea = Number(v); idx++; }
        else if (c === 73) { ccw = !!Number(v); idx++; }
        else break;
      }
      edge['center'] = [cx, cy];
      edge['majorAxis'] = [mx, my];
      edge['minorAxisRatio'] = ratio;
      edge['startAngle'] = sa;
      edge['endAngle'] = ea;
      edge['counterClockwise'] = ccw;
    } else if (edgeType === 4) { // Spline
      edge['edgeType'] = 'spline';
      let degree = 3;
      const knots: number[] = [];
      const ctrlPts: number[][] = [];
      while (idx < n) {
        const [c, v] = codes[idx];
        if (c === 94) { degree = Number(v); idx++; }
        else if (c === 73) { idx++; }
        else if (c === 74) { idx++; }
        else if (c === 95) { idx++; }
        else if (c === 96) { idx++; }
        else if (c === 40) { knots.push(Number(v)); idx++; }
        else if (c === 10) {
          const px = Number(v); idx++;
          let py = 0;
          if (idx < n && codes[idx][0] === 20) { py = Number(codes[idx][1]); idx++; }
          ctrlPts.push([px, py]);
        }
        else break;
      }
      edge['degree'] = degree;
      edge['knots'] = knots;
      edge['controlPoints'] = ctrlPts;
    }
    return [edge, idx];
  }

  // --- INSERT ---
  private parseInsert(_etype: string, tokens: TokenStream): Record<string, unknown> {
    const e: Record<string, unknown> = {};
    let ix = 0, iy = 0, iz = 0, hasAttribs = false;
    for (const [code, value] of this.collectCodes(tokens)) {
      if (this.applyCommon(e, code, value)) continue;
      if (code === 2) e['blockName'] = String(value);
      else if (code === 10) ix = Number(value);
      else if (code === 20) iy = Number(value);
      else if (code === 30) iz = Number(value);
      else if (code === 41) e['scaleX'] = Number(value);
      else if (code === 42) e['scaleY'] = Number(value);
      else if (code === 43) e['scaleZ'] = Number(value);
      else if (code === 44) e['columnSpacing'] = Number(value);
      else if (code === 45) e['rowSpacing'] = Number(value);
      else if (code === 50) e['rotation'] = Number(value);
      else if (code === 66) hasAttribs = !!Number(value);
      else if (code === 70) e['columnCount'] = Number(value);
      else if (code === 71) e['rowCount'] = Number(value);
    }
    e['insertionPoint'] = [ix, iy, iz];

    if (hasAttribs) {
      const attribs: Record<string, unknown>[] = [];
      while (true) {
        const tok = tokens.next();
        if (!tok) break;
        const [code, value] = tok;
        if (code === 0 && String(value) === 'SEQEND') {
          this.skipToNextEntity(tokens);
          break;
        }
        if (code === 0 && String(value) === 'ATTRIB') {
          const attr = this.parseAttrib('ATTRIB', tokens);
          attr['type'] = 'ATTRIB';
          attribs.push(attr);
        }
      }
      if (attribs.length) e['attributes'] = attribs;
    }
    return e;
  }

  // --- ATTDEF ---
  private parseAttdef(_etype: string, tokens: TokenStream): Record<string, unknown> {
    const e: Record<string, unknown> = {};
    let ix = 0, iy = 0, iz = 0;
    for (const [code, value] of this.collectCodes(tokens)) {
      if (this.applyCommon(e, code, value)) continue;
      if (code === 1) e['defaultValue'] = String(value);
      else if (code === 2) e['tag'] = String(value);
      else if (code === 3) e['prompt'] = String(value);
      else if (code === 10) ix = Number(value);
      else if (code === 20) iy = Number(value);
      else if (code === 30) iz = Number(value);
      else if (code === 40) e['height'] = Number(value);
      else if (code === 50) e['rotation'] = Number(value);
      else if (code === 7) e['style'] = String(value);
      else if (code === 70) e['flags'] = Number(value);
      else if (code === 72) e['horizontalAlignment'] = Number(value);
      else if (code === 74) e['verticalAlignment'] = Number(value);
    }
    e['insertionPoint'] = [ix, iy, iz];
    return e;
  }

  // --- ATTRIB ---
  private parseAttrib(_etype: string, tokens: TokenStream): Record<string, unknown> {
    const e: Record<string, unknown> = {};
    let ix = 0, iy = 0, iz = 0;
    for (const [code, value] of this.collectCodes(tokens)) {
      if (this.applyCommon(e, code, value)) continue;
      if (code === 1) e['value'] = String(value);
      else if (code === 2) e['tag'] = String(value);
      else if (code === 10) ix = Number(value);
      else if (code === 20) iy = Number(value);
      else if (code === 30) iz = Number(value);
      else if (code === 40) e['height'] = Number(value);
      else if (code === 50) e['rotation'] = Number(value);
      else if (code === 7) e['style'] = String(value);
      else if (code === 70) e['flags'] = Number(value);
      else if (code === 72) e['horizontalAlignment'] = Number(value);
      else if (code === 74) e['verticalAlignment'] = Number(value);
    }
    e['insertionPoint'] = [ix, iy, iz];
    return e;
  }

  // --- SOLID / TRACE ---
  private parseSolidTrace(_etype: string, tokens: TokenStream): Record<string, unknown> {
    const e: Record<string, unknown> = {};
    const pts = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (const [code, value] of this.collectCodes(tokens)) {
      if (this.applyCommon(e, code, value)) continue;
      if (code === 10) pts[0][0] = Number(value);
      else if (code === 20) pts[0][1] = Number(value);
      else if (code === 30) pts[0][2] = Number(value);
      else if (code === 11) pts[1][0] = Number(value);
      else if (code === 21) pts[1][1] = Number(value);
      else if (code === 31) pts[1][2] = Number(value);
      else if (code === 12) pts[2][0] = Number(value);
      else if (code === 22) pts[2][1] = Number(value);
      else if (code === 32) pts[2][2] = Number(value);
      else if (code === 13) pts[3][0] = Number(value);
      else if (code === 23) pts[3][1] = Number(value);
      else if (code === 33) pts[3][2] = Number(value);
    }
    for (let i = 0; i < 4; i++) e[`point${i + 1}`] = pts[i];
    return e;
  }

  // --- 3DFACE ---
  private parse3DFace(_etype: string, tokens: TokenStream): Record<string, unknown> {
    const e: Record<string, unknown> = {};
    const pts = [[0, 0, 0], [0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (const [code, value] of this.collectCodes(tokens)) {
      if (this.applyCommon(e, code, value)) continue;
      if (code === 10) pts[0][0] = Number(value);
      else if (code === 20) pts[0][1] = Number(value);
      else if (code === 30) pts[0][2] = Number(value);
      else if (code === 11) pts[1][0] = Number(value);
      else if (code === 21) pts[1][1] = Number(value);
      else if (code === 31) pts[1][2] = Number(value);
      else if (code === 12) pts[2][0] = Number(value);
      else if (code === 22) pts[2][1] = Number(value);
      else if (code === 32) pts[2][2] = Number(value);
      else if (code === 13) pts[3][0] = Number(value);
      else if (code === 23) pts[3][1] = Number(value);
      else if (code === 33) pts[3][2] = Number(value);
      else if (code === 70) e['invisibleEdges'] = Number(value);
    }
    for (let i = 0; i < 4; i++) e[`point${i + 1}`] = pts[i];
    return e;
  }

  // --- VIEWPORT ---
  private parseViewport(_etype: string, tokens: TokenStream): Record<string, unknown> {
    const e: Record<string, unknown> = {};
    let cx = 0, cy = 0, cz = 0, vcx = 0, vcy = 0;
    for (const [code, value] of this.collectCodes(tokens)) {
      if (this.applyCommon(e, code, value)) continue;
      if (code === 10) cx = Number(value);
      else if (code === 20) cy = Number(value);
      else if (code === 30) cz = Number(value);
      else if (code === 40) e['width'] = Number(value);
      else if (code === 41) e['height'] = Number(value);
      else if (code === 69) e['id'] = Number(value);
      else if (code === 12) vcx = Number(value);
      else if (code === 22) vcy = Number(value);
      else if (code === 45) e['viewHeight'] = Number(value);
      else if (code === 90) e['statusFlags'] = Number(value);
    }
    e['center'] = [cx, cy, cz];
    if (vcx !== 0 || vcy !== 0) e['viewCenter'] = [vcx, vcy];
    return e;
  }

  // --- XLINE / RAY ---
  private parseXlineRay(_etype: string, tokens: TokenStream): Record<string, unknown> {
    const e: Record<string, unknown> = {};
    let ox = 0, oy = 0, oz = 0, dx = 0, dy = 0, dz = 0;
    for (const [code, value] of this.collectCodes(tokens)) {
      if (this.applyCommon(e, code, value)) continue;
      if (code === 10) ox = Number(value);
      else if (code === 20) oy = Number(value);
      else if (code === 30) oz = Number(value);
      else if (code === 11) dx = Number(value);
      else if (code === 21) dy = Number(value);
      else if (code === 31) dz = Number(value);
    }
    e['origin'] = [ox, oy, oz];
    e['direction'] = [dx, dy, dz];
    return e;
  }

  // --- IMAGE ---
  private parseImage(_etype: string, tokens: TokenStream): Record<string, unknown> {
    const e: Record<string, unknown> = {};
    let ix = 0, iy = 0, iz = 0;
    let ux = 0, uy = 0, uz = 0;
    let vx = 0, vy = 0, vz = 0;
    let sx = 0, sy = 0;
    for (const [code, value] of this.collectCodes(tokens)) {
      if (this.applyCommon(e, code, value)) continue;
      if (code === 10) ix = Number(value);
      else if (code === 20) iy = Number(value);
      else if (code === 30) iz = Number(value);
      else if (code === 11) ux = Number(value);
      else if (code === 21) uy = Number(value);
      else if (code === 31) uz = Number(value);
      else if (code === 12) vx = Number(value);
      else if (code === 22) vy = Number(value);
      else if (code === 32) vz = Number(value);
      else if (code === 13) sx = Number(value);
      else if (code === 23) sy = Number(value);
      else if (code === 340) e['imageDefHandle'] = String(value);
      else if (code === 70) e['displayFlags'] = Number(value);
      else if (code === 280) e['clippingState'] = Number(value);
      else if (code === 281) e['brightness'] = Number(value);
      else if (code === 282) e['contrast'] = Number(value);
      else if (code === 283) e['fade'] = Number(value);
    }
    e['insertionPoint'] = [ix, iy, iz];
    e['uVector'] = [ux, uy, uz];
    e['vVector'] = [vx, vy, vz];
    e['size'] = [sx, sy];
    return e;
  }

  // --- WIPEOUT ---
  private parseWipeout(_etype: string, tokens: TokenStream): Record<string, unknown> {
    const e: Record<string, unknown> = {};
    let ix = 0, iy = 0, iz = 0;
    let ux = 0, uy = 0, uz = 0;
    let vx = 0, vy = 0, vz = 0;
    const clipVerts: number[][] = [];
    let cvX = 0, cvY = 0, haveCv = false;

    for (const [code, value] of this.collectCodes(tokens)) {
      if (this.applyCommon(e, code, value)) continue;
      if (code === 10) ix = Number(value);
      else if (code === 20) iy = Number(value);
      else if (code === 30) iz = Number(value);
      else if (code === 11) ux = Number(value);
      else if (code === 21) uy = Number(value);
      else if (code === 31) uz = Number(value);
      else if (code === 12) vx = Number(value);
      else if (code === 22) vy = Number(value);
      else if (code === 32) vz = Number(value);
      else if (code === 14) {
        if (haveCv) clipVerts.push([cvX, cvY]);
        cvX = Number(value); cvY = 0; haveCv = true;
      }
      else if (code === 24) cvY = Number(value);
      else if (code === 71) e['clipType'] = Number(value);
    }
    if (haveCv) clipVerts.push([cvX, cvY]);
    e['insertionPoint'] = [ix, iy, iz];
    e['uVector'] = [ux, uy, uz];
    e['vVector'] = [vx, vy, vz];
    if (clipVerts.length) e['clipVertices'] = clipVerts;
    return e;
  }

  // --- TABLE entity ---
  private parseTableEntity(_etype: string, tokens: TokenStream): Record<string, unknown> {
    const e: Record<string, unknown> = {};
    let ix = 0, iy = 0, iz = 0;
    for (const [code, value] of this.collectCodes(tokens)) {
      if (this.applyCommon(e, code, value)) continue;
      if (code === 2) e['blockName'] = String(value);
      else if (code === 10) ix = Number(value);
      else if (code === 20) iy = Number(value);
      else if (code === 30) iz = Number(value);
      else if (code === 41) e['horizontalDirection'] = Number(value);
      else if (code === 70) e['tableFlags'] = Number(value);
      else if (code === 90) e['rowCount'] = Number(value);
      else if (code === 91) e['columnCount'] = Number(value);
    }
    e['insertionPoint'] = [ix, iy, iz];
    return e;
  }

  // --- ACIS entities ---
  private parseAcis(_etype: string, tokens: TokenStream): Record<string, unknown> {
    const e: Record<string, unknown> = {};
    const acisLines: string[] = [];
    for (const [code, value] of this.collectCodes(tokens)) {
      if (this.applyCommon(e, code, value)) continue;
      if (code === 1) acisLines.push(String(value));
      else if (code === 3) acisLines.push(String(value));
      else if (code === 70) e['modelerVersion'] = Number(value);
    }
    if (acisLines.length) e['acisData'] = acisLines.join('\n');
    return e;
  }

  // --- MESH ---
  private parseMesh(_etype: string, tokens: TokenStream): Record<string, unknown> {
    const e: Record<string, unknown> = {};
    const vertices: number[][] = [];
    const faces: number[][] = [];
    let vx = 0, vy = 0, vz = 0, haveV = false;
    const codes = this.collectCodes(tokens);
    let idx = 0;
    const n = codes.length;
    let readingVertices = false, readingFaces = false;
    const faceData: number[] = [];

    while (idx < n) {
      const [code, value] = codes[idx];
      idx++;
      if (this.applyCommon(e, code, value)) continue;
      if (code === 71) e['version'] = Number(value);
      else if (code === 72) e['subdivisionLevel'] = Number(value);
      else if (code === 92) { readingVertices = true; readingFaces = false; }
      else if (code === 93) { readingFaces = true; readingVertices = false; }
      else if (code === 10 && readingVertices) {
        if (haveV) vertices.push([vx, vy, vz]);
        vx = Number(value); vy = 0; vz = 0; haveV = true;
      }
      else if (code === 20 && readingVertices) vy = Number(value);
      else if (code === 30 && readingVertices) vz = Number(value);
      else if (code === 90 && readingFaces) faceData.push(Number(value));
    }
    if (haveV) vertices.push([vx, vy, vz]);

    let fi = 0;
    while (fi < faceData.length) {
      const count = faceData[fi]; fi++;
      const faceIndices: number[] = [];
      for (let j = 0; j < count && fi < faceData.length; j++) {
        faceIndices.push(faceData[fi]); fi++;
      }
      faces.push(faceIndices);
    }

    e['vertices'] = vertices;
    e['faces'] = faces;
    return e;
  }

  // --- Generic fallback ---
  private parseGenericEntity(_etype: string, tokens: TokenStream): Record<string, unknown> {
    const e: Record<string, unknown> = {};
    for (const [code, value] of this.collectCodes(tokens)) {
      if (this.applyCommon(e, code, value)) continue;
      e[code] = value;
    }
    return e;
  }

  // -----------------------------------------------------------------
  // Helpers
  // -----------------------------------------------------------------

  private skipSection(tokens: TokenStream): void {
    while (true) {
      const tok = tokens.next();
      if (!tok) break;
      if (tok[0] === 0 && String(tok[1]) === 'ENDSEC') break;
    }
  }

  private skipToNextEntity(tokens: TokenStream): void {
    while (true) {
      const tok = tokens.peek();
      if (!tok) break;
      if (tok[0] === 0) break;
      tokens.next();
    }
  }
}
