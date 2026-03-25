/**
 * DGN V7 to IFCX importer -- pure TypeScript, no external dependencies.
 *
 * Uses the built-in DgnParser to read DGN V7 binary files and converts
 * the parsed data into an IfcxDocument.
 */

import { IfcxDocument } from '../document.js';
import { DgnParser, type DgnFile, type DgnElement } from './dgn-parser.js';

type AnyDict = Record<string, any>;

export class DgnImporter {
  /** Import DGN from raw bytes. */
  static fromBytes(data: Uint8Array): IfcxDocument {
    const parser = new DgnParser();
    const dgn = parser.parse(data);
    return DgnImporter.convert(dgn);
  }

  // ------------------------------------------------------------------
  // Conversion
  // ------------------------------------------------------------------

  private static convert(dgn: DgnFile): IfcxDocument {
    const doc = new IfcxDocument();
    doc.header = DgnImporter.convertHeader(dgn) as any;
    doc.tables = DgnImporter.convertTables(dgn) as any;
    doc.blocks = DgnImporter.convertBlocks(dgn) as any;
    doc.entities = DgnImporter.convertEntities(dgn) as any;
    doc.objects = [];
    return doc;
  }

  // ------------------------------------------------------------------
  // Header
  // ------------------------------------------------------------------

  private static convertHeader(dgn: DgnFile): AnyDict {
    const header: AnyDict = {
      version: dgn.version,
      is3d: dgn.is3d,
    };
    if (dgn.masterUnitName) header['masterUnits'] = dgn.masterUnitName;
    if (dgn.subUnitName) header['subUnits'] = dgn.subUnitName;
    header['units'] = {
      uorPerSub: dgn.uorPerSub,
      subPerMaster: dgn.subPerMaster,
    };
    if (dgn.globalOrigin.some(v => v !== 0)) {
      header['globalOrigin'] = [...dgn.globalOrigin];
    }
    return header;
  }

  // ------------------------------------------------------------------
  // Tables
  // ------------------------------------------------------------------

  private static convertTables(dgn: DgnFile): AnyDict {
    const tables: AnyDict = {
      layers: {},
      linetypes: {},
      textStyles: {},
      dimStyles: {},
    };

    const levelsUsed = new Set<number>();
    for (const elem of dgn.elements) {
      if (!elem.deleted && elem.level > 0) levelsUsed.add(elem.level);
    }
    for (const lvl of Array.from(levelsUsed).sort((a, b) => a - b)) {
      tables['layers'][String(lvl)] = {};
    }
    if (!('0' in tables['layers'])) tables['layers']['0'] = {};
    return tables;
  }

  // ------------------------------------------------------------------
  // Blocks
  // ------------------------------------------------------------------

  private static convertBlocks(_dgn: DgnFile): AnyDict {
    return {};
  }

  // ------------------------------------------------------------------
  // Entities
  // ------------------------------------------------------------------

  private static convertEntities(dgn: DgnFile): AnyDict[] {
    const entities: AnyDict[] = [];
    for (const elem of dgn.elements) {
      if (elem.deleted) continue;
      if (elem.type === 0 || elem.type === 9 || elem.type === 10 || elem.type === 8) continue;
      const converted = DgnImporter.convertEntity(elem, dgn);
      if (converted) entities.push(converted);
    }
    return entities;
  }

  private static convertEntity(elem: DgnElement, dgn: DgnFile): AnyDict | null {
    const result: AnyDict = { layer: String(elem.level) };

    // Common symbology
    if (elem.color) {
      result['color'] = elem.color;
      if (dgn.colorTable.length > 0 && elem.color >= 0 && elem.color < dgn.colorTable.length) {
        const ct = dgn.colorTable[elem.color];
        if (ct) result['colorRGB'] = [...ct];
      }
    }
    if (elem.weight) result['lineweight'] = elem.weight;
    if (elem.style) result['linetype'] = elem.style;

    const etype = elem.type;
    const data = elem.data;

    if (etype === 3) {
      // LINE
      result['type'] = 'LINE';
      const verts = data['vertices'] as number[][] ?? [];
      if (verts.length >= 2) {
        result['start'] = [...verts[0]];
        result['end'] = [...verts[1]];
      } else return null;
    } else if (etype === 4) {
      // LINE_STRING -> LWPOLYLINE (open)
      result['type'] = 'LWPOLYLINE';
      result['closed'] = false;
      result['vertices'] = ((data['vertices'] as number[][]) ?? []).map(v => [...v]);
      if (!result['vertices'].length) return null;
    } else if (etype === 6) {
      // SHAPE -> LWPOLYLINE (closed)
      result['type'] = 'LWPOLYLINE';
      result['closed'] = true;
      result['vertices'] = ((data['vertices'] as number[][]) ?? []).map(v => [...v]);
      if (!result['vertices'].length) return null;
    } else if (etype === 11) {
      // CURVE
      result['type'] = 'SPLINE';
      result['vertices'] = ((data['vertices'] as number[][]) ?? []).map(v => [...v]);
      if (!result['vertices'].length) return null;
    } else if (etype === 15) {
      // ELLIPSE
      result['type'] = 'ELLIPSE';
      result['center'] = [...(data['origin'] as number[] ?? [0, 0, 0])];
      result['majorAxis'] = data['primary_axis'] ?? 0;
      result['minorAxis'] = data['secondary_axis'] ?? 0;
      result['rotation'] = toRadians(Number(data['rotation'] ?? 0));
    } else if (etype === 16) {
      // ARC
      const start = Number(data['start_angle'] ?? 0);
      const sweep = Number(data['sweep_angle'] ?? 360);
      if (Math.abs(sweep) >= 360) {
        result['type'] = 'ELLIPSE';
      } else {
        result['type'] = 'ARC';
        result['startAngle'] = toRadians(start);
        result['endAngle'] = toRadians(start + sweep);
      }
      result['center'] = [...(data['origin'] as number[] ?? [0, 0, 0])];
      result['majorAxis'] = data['primary_axis'] ?? 0;
      result['minorAxis'] = data['secondary_axis'] ?? 0;
      result['rotation'] = toRadians(Number(data['rotation'] ?? 0));
    } else if (etype === 17) {
      // TEXT
      result['type'] = 'TEXT';
      result['text'] = data['text'] ?? '';
      result['insertionPoint'] = [...(data['origin'] as number[] ?? [0, 0, 0])];
      result['height'] = data['height'] ?? 0;
      result['rotation'] = toRadians(Number(data['rotation'] ?? 0));
      result['fontIndex'] = data['font_id'] ?? 0;
    } else if (etype === 7) {
      // TEXT_NODE
      result['type'] = 'TEXT_NODE';
      result['origin'] = [...(data['origin'] as number[] ?? [0, 0, 0])];
      result['height'] = data['height'] ?? 0;
      result['rotation'] = toRadians(Number(data['rotation'] ?? 0));
      result['numelems'] = data['numelems'] ?? 0;
    } else if (etype === 2) {
      // CELL_HEADER -> INSERT
      result['type'] = 'INSERT';
      result['name'] = data['name'] ?? '';
      result['insertionPoint'] = [...(data['origin'] as number[] ?? [0, 0, 0])];
      result['xScale'] = data['xscale'] ?? 1;
      result['yScale'] = data['yscale'] ?? 1;
      result['rotation'] = toRadians(Number(data['rotation'] ?? 0));
    } else if (etype === 12 || etype === 14) {
      const ctype = etype === 12 ? 'COMPLEX_CHAIN' : 'COMPLEX_SHAPE';
      result['type'] = ctype;
      result['numelems'] = data['numelems'] ?? 0;
      result['totlength'] = data['totlength'] ?? 0;
    } else if (etype === 18 || etype === 19) {
      result['type'] = etype === 18 ? '3DSURFACE' : '3DSOLID';
      result['numelems'] = data['numelems'] ?? 0;
    } else if (etype === 5) {
      result['type'] = 'GROUP_DATA';
    } else if (etype === 37) {
      result['type'] = 'TAG_VALUE';
      result['tagSet'] = data['tag_set'] ?? 0;
      result['tagIndex'] = data['tag_index'] ?? 0;
      if ('value' in data) result['value'] = data['value'];
    } else if (etype === 21) {
      result['type'] = 'BSPLINE_POLE';
      result['vertices'] = ((data['vertices'] as number[][]) ?? []).map(v => [...v]);
    } else if (etype === 27) {
      result['type'] = 'BSPLINE_CURVE';
    } else if (etype === 1) {
      result['type'] = 'CELL_LIBRARY';
    } else if (etype === 34) {
      result['type'] = 'SHARED_CELL_DEFN';
    } else if (etype === 35) {
      result['type'] = 'SHARED_CELL';
    } else {
      result['type'] = elem.typeName;
      result['rawType'] = elem.type;
    }

    return result;
  }
}

function toRadians(degrees: number): number {
  return degrees * Math.PI / 180;
}
