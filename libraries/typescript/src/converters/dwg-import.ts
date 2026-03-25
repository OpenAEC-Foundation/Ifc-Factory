/**
 * DWG to IFCX importer -- pure TypeScript, no external dependencies.
 *
 * Uses the built-in DwgParser to read DWG binary files and converts
 * the parsed data into an IfcxDocument.
 */

import { IfcxDocument } from '../document.js';
import { DwgParser, type DwgFile, type DwgObject } from './dwg-parser.js';

type AnyDict = Record<string, any>;

export class DwgImporter {
  /** Import DWG from raw bytes. */
  static fromBytes(data: Uint8Array): IfcxDocument {
    const parser = new DwgParser();
    const dwg = parser.parse(data);
    return DwgImporter.convert(dwg);
  }

  // ------------------------------------------------------------------
  // Conversion
  // ------------------------------------------------------------------

  private static convert(dwg: DwgFile): IfcxDocument {
    const doc = new IfcxDocument();
    doc.header = DwgImporter.convertHeader(dwg) as any;
    doc.tables = DwgImporter.convertTables(dwg) as any;
    doc.blocks = DwgImporter.convertBlocks(dwg) as any;
    doc.entities = DwgImporter.convertEntities(dwg) as any;
    doc.objects = DwgImporter.convertObjects(dwg) as any;
    return doc;
  }

  // ------------------------------------------------------------------
  // Header
  // ------------------------------------------------------------------

  private static convertHeader(dwg: DwgFile): AnyDict {
    const header: AnyDict = {};
    const hv = dwg.headerVars;

    header['version'] = hv['$ACADVER'] ?? dwg.versionCode;

    let insunits = hv['$LUNITS'] ?? 0;
    if (typeof insunits === 'object') insunits = 0;
    const unitMap: Record<number, string> = {
      0: 'unitless', 1: 'scientific', 2: 'decimal',
      3: 'engineering', 4: 'architectural', 5: 'fractional',
    };

    let measurement: unknown = hv['$MEASUREMENT'] ?? 1;
    if (typeof measurement === 'object') measurement = 1;

    header['units'] = {
      linear: unitMap[Number(insunits)] ?? 'unitless',
      measurement: Number(measurement) === 1 ? 'metric' : 'imperial',
    };

    const ltscale = hv['$LTSCALE'];
    if (typeof ltscale === 'number') header['linetypeScale'] = ltscale;

    return header;
  }

  // ------------------------------------------------------------------
  // Tables
  // ------------------------------------------------------------------

  private static convertTables(dwg: DwgFile): AnyDict {
    const tables: AnyDict = {
      layers: {},
      linetypes: {},
      textStyles: {},
      dimStyles: {},
    };

    for (const obj of dwg.objects) {
      if (obj.typeName === 'LAYER') {
        const name = String(obj.data['name'] ?? '');
        if (!name) continue;
        const props: AnyDict = {};
        if ('color' in obj.data) props['color'] = obj.data['color'];
        if ('frozen' in obj.data) props['frozen'] = obj.data['frozen'];
        if ('off' in obj.data) props['off'] = obj.data['off'];
        if ('locked' in obj.data) props['locked'] = obj.data['locked'];
        tables['layers'][name] = props;
      } else if (obj.typeName === 'STYLE') {
        const name = String(obj.data['name'] ?? '');
        if (!name) continue;
        const props: AnyDict = {};
        if ('fontName' in obj.data) props['fontFamily'] = obj.data['fontName'];
        if (obj.data['fixedHeight']) props['height'] = obj.data['fixedHeight'];
        if ('widthFactor' in obj.data) props['widthFactor'] = obj.data['widthFactor'];
        tables['textStyles'][name] = props;
      } else if (obj.typeName === 'LTYPE') {
        const name = String(obj.data['name'] ?? '');
        if (!name || name === 'ByBlock' || name === 'ByLayer' || name === 'Continuous') continue;
        const props: AnyDict = {};
        if ('description' in obj.data) props['description'] = obj.data['description'];
        if ('patternLength' in obj.data) props['patternLength'] = obj.data['patternLength'];
        tables['linetypes'][name] = props;
      }
    }

    if (!('0' in tables['layers'])) tables['layers']['0'] = {};

    return tables;
  }

  // ------------------------------------------------------------------
  // Blocks
  // ------------------------------------------------------------------

  private static convertBlocks(dwg: DwgFile): AnyDict {
    const blocks: AnyDict = {};
    for (const obj of dwg.objects) {
      if (obj.typeName === 'BLOCK_HEADER') {
        const name = String(obj.data['name'] ?? '');
        if (!name) continue;
        if (name.startsWith('*Model_Space') || name.startsWith('*Paper_Space')) continue;
        blocks[name] = { name, basePoint: [0, 0, 0], entities: [] };
      }
    }
    return blocks;
  }

  // ------------------------------------------------------------------
  // Entities
  // ------------------------------------------------------------------

  private static convertEntities(dwg: DwgFile): AnyDict[] {
    const entities: AnyDict[] = [];
    for (const obj of dwg.objects) {
      if (!obj.isEntity) continue;
      const converted = DwgImporter.convertEntity(obj);
      if (converted) entities.push(converted);
    }
    return entities;
  }

  private static convertEntity(obj: DwgObject): AnyDict | null {
    const result: AnyDict = { ...obj.data };
    const etype = String(result['type'] ?? '');

    // Normalize handle to string
    if ('handle' in result) {
      result['handle'] = typeof result['handle'] === 'number'
        ? result['handle'].toString(16).toUpperCase()
        : String(result['handle']);
    }

    // Remove internal fields
    for (const key of Object.keys(result)) {
      if (key.startsWith('_')) delete result[key];
    }

    // Color: 256 = BYLAYER, 0 = BYBLOCK -> remove
    if (result['color'] === 0 || result['color'] === 256) delete result['color'];

    // Remove zero thickness
    if (result['thickness'] === 0.0) delete result['thickness'];

    // Remove default extrusion [0,0,1]
    const ext = result['extrusion'];
    if (Array.isArray(ext) && ext[0] === 0 && ext[1] === 0 && ext[2] === 1) {
      delete result['extrusion'];
    }

    // Remove internal/default fields
    delete result['entity_mode'];
    delete result['linetype_scale'];
    delete result['invisible'];

    const lw = result['lineweight'];
    if (lw != null && (lw === 29 || lw < 0)) delete result['lineweight'];

    return result;
  }

  // ------------------------------------------------------------------
  // Objects
  // ------------------------------------------------------------------

  private static convertObjects(dwg: DwgFile): AnyDict[] {
    const objects: AnyDict[] = [];
    for (const obj of dwg.objects) {
      if (obj.typeName === 'DICTIONARY') {
        const converted: AnyDict = {
          objectType: 'DICTIONARY',
          handle: obj.handle.toString(16).toUpperCase(),
        };
        if ('entries' in obj.data) {
          const entries = obj.data['entries'] as Record<string, unknown>;
          converted['entries'] = Object.fromEntries(
            Object.entries(entries).map(([k, v]) => [
              k, typeof v === 'number' ? v.toString(16).toUpperCase() : String(v)
            ])
          );
        }
        objects.push(converted);
      }
    }
    return objects;
  }
}
