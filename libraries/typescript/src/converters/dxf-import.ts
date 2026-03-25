/**
 * DXF to IFCX importer -- pure TypeScript, no external dependencies.
 *
 * Uses the built-in DxfParser to read DXF ASCII files and converts
 * the parsed data into an IfcxDocument.
 */

import { IfcxDocument } from '../document.js';
import { DxfParser, type DxfFile } from './dxf-parser.js';

export class DxfImporter {
  /** Import DXF from a string. */
  static fromString(dxf: string): IfcxDocument {
    const parser = new DxfParser();
    const dxfFile = parser.parse(dxf);
    return DxfImporter.convert(dxfFile);
  }

  /** Import DXF from a buffer. */
  static fromBuffer(buffer: Uint8Array): IfcxDocument {
    const decoder = new TextDecoder('utf-8');
    return DxfImporter.fromString(decoder.decode(buffer));
  }

  // ------------------------------------------------------------------
  // Conversion
  // ------------------------------------------------------------------

  private static convert(dxfFile: DxfFile): IfcxDocument {
    const doc = new IfcxDocument();
    doc.header = DxfImporter.convertHeader(dxfFile);
    doc.tables = DxfImporter.convertTables(dxfFile);
    doc.blocks = DxfImporter.convertBlocks(dxfFile);
    doc.entities = DxfImporter.convertEntities(dxfFile) as any;
    doc.objects = DxfImporter.convertObjects(dxfFile) as any;
    return doc;
  }

  // ------------------------------------------------------------------
  // Header
  // ------------------------------------------------------------------

  private static convertHeader(dxf: DxfFile): Record<string, unknown> {
    const header: Record<string, unknown> = {};
    const raw = dxf.header;

    header['version'] = raw['$ACADVER'] ?? 'AC1032';

    let insunits = raw['$INSUNITS'] ?? 0;
    if (typeof insunits === 'object') insunits = 0;
    const unitMap: Record<number, string> = {
      0: 'unitless', 1: 'inches', 2: 'feet', 3: 'miles',
      4: 'millimeters', 5: 'centimeters', 6: 'meters', 7: 'kilometers',
    };

    let measurement = raw['$MEASUREMENT'] ?? 1;
    if (typeof measurement === 'object') measurement = 1;

    header['units'] = {
      linear: unitMap[Number(insunits)] ?? 'unitless',
      measurement: Number(measurement) === 1 ? 'metric' : 'imperial',
    };

    const clayer = raw['$CLAYER'];
    if (typeof clayer === 'string') header['currentLayer'] = clayer;

    const ltscale = raw['$LTSCALE'];
    if (typeof ltscale === 'number') header['linetypeScale'] = ltscale;

    return header;
  }

  // ------------------------------------------------------------------
  // Tables
  // ------------------------------------------------------------------

  private static convertTables(dxf: DxfFile): Record<string, unknown> {
    const tables: Record<string, unknown> = {
      layers: {} as Record<string, unknown>,
      linetypes: {} as Record<string, unknown>,
      textStyles: {} as Record<string, unknown>,
      dimStyles: {} as Record<string, unknown>,
    };

    const rawTables = dxf.tables;
    const layers = tables['layers'] as Record<string, unknown>;
    const linetypes = tables['linetypes'] as Record<string, unknown>;
    const textStyles = tables['textStyles'] as Record<string, unknown>;
    const dimStyles = tables['dimStyles'] as Record<string, unknown>;

    // Layers
    for (const entry of rawTables['LAYER'] ?? []) {
      const name = String(entry['name'] ?? '');
      if (!name) continue;
      const props: Record<string, unknown> = {};
      if ('color' in entry) props['color'] = entry['color'];
      if ('linetype' in entry) props['linetype'] = entry['linetype'];
      if ('frozen' in entry) props['frozen'] = entry['frozen'];
      if ('locked' in entry) props['locked'] = entry['locked'];
      if ('off' in entry) props['off'] = entry['off'];
      if ('plot' in entry) props['plot'] = entry['plot'];
      if ('lineweight' in entry) props['lineweight'] = entry['lineweight'];
      layers[name] = props;
    }
    if (!('0' in layers)) layers['0'] = {};

    // Linetypes
    for (const entry of rawTables['LTYPE'] ?? []) {
      const name = String(entry['name'] ?? '');
      if (!name || name === 'ByBlock' || name === 'ByLayer' || name === 'Continuous') continue;
      const props: Record<string, unknown> = {};
      if ('description' in entry) props['description'] = entry['description'];
      if ('pattern' in entry) props['pattern'] = entry['pattern'];
      linetypes[name] = props;
    }

    // Text styles
    for (const entry of rawTables['STYLE'] ?? []) {
      const name = String(entry['name'] ?? '');
      if (!name) continue;
      const props: Record<string, unknown> = {};
      if ('font' in entry) props['fontFamily'] = entry['font'];
      if ('height' in entry && entry['height']) props['height'] = entry['height'];
      if ('widthFactor' in entry) props['widthFactor'] = entry['widthFactor'];
      textStyles[name] = props;
    }

    // Dim styles
    for (const entry of rawTables['DIMSTYLE'] ?? []) {
      const name = String(entry['name'] ?? '');
      if (!name) continue;
      const props: Record<string, unknown> = {};
      if ('DIMTXT' in entry) props['textHeight'] = entry['DIMTXT'];
      if ('DIMASZ' in entry) props['arrowSize'] = entry['DIMASZ'];
      if ('DIMSCALE' in entry) props['overallScale'] = entry['DIMSCALE'];
      if ('DIMEXO' in entry) props['extensionOffset'] = entry['DIMEXO'];
      if ('DIMDLI' in entry) props['dimensionLineIncrement'] = entry['DIMDLI'];
      if ('DIMEXE' in entry) props['extensionExtend'] = entry['DIMEXE'];
      if ('DIMGAP' in entry) props['textGap'] = entry['DIMGAP'];
      if ('DIMTAD' in entry) props['textAbove'] = entry['DIMTAD'];
      if ('DIMDEC' in entry) props['decimalPlaces'] = entry['DIMDEC'];
      dimStyles[name] = props;
    }

    return tables;
  }

  // ------------------------------------------------------------------
  // Blocks
  // ------------------------------------------------------------------

  private static convertBlocks(dxf: DxfFile): Record<string, unknown> {
    const blocks: Record<string, unknown> = {};
    for (const [name, blockData] of Object.entries(dxf.blocks)) {
      if (name.startsWith('*Model_Space') || name.startsWith('*Paper_Space')) continue;
      const blk: Record<string, unknown> = {
        name,
        basePoint: blockData['basePoint'] ?? [0, 0, 0],
      };
      const entities: Record<string, unknown>[] = [];
      for (const ent of (blockData['entities'] as Record<string, unknown>[]) ?? []) {
        const converted = DxfImporter.convertEntity(ent);
        if (converted) entities.push(converted);
      }
      blk['entities'] = entities;
      blocks[name] = blk;
    }
    return blocks;
  }

  // ------------------------------------------------------------------
  // Entities
  // ------------------------------------------------------------------

  private static convertEntities(dxf: DxfFile): Record<string, unknown>[] {
    const entities: Record<string, unknown>[] = [];
    for (const ent of dxf.entities) {
      const converted = DxfImporter.convertEntity(ent);
      if (converted) entities.push(converted);
    }
    return entities;
  }

  private static convertEntity(ent: Record<string, unknown>): Record<string, unknown> | null {
    const result = { ...ent };
    const etype = String(result['type'] ?? '');

    // Lineweight: convert to mm
    if ('lineweight' in result) {
      const lw = Number(result['lineweight']);
      if (typeof result['lineweight'] === 'number' && lw >= 0) {
        result['lineweight'] = lw / 100.0;
      } else {
        delete result['lineweight'];
      }
    }

    // Color 256 = BYLAYER -> remove
    if (result['color'] === 256) delete result['color'];

    // Linetype BYLAYER -> remove
    if (result['linetype'] === 'BYLAYER') delete result['linetype'];

    // Entity-specific normalisation
    if (etype === 'ARC') {
      if ('startAngle' in result) result['startAngle'] = toRadians(Number(result['startAngle']));
      if ('endAngle' in result) result['endAngle'] = toRadians(Number(result['endAngle']));
    } else if (etype === 'TEXT') {
      if ('rotation' in result) result['rotation'] = toRadians(Number(result['rotation']));
      const halign = result['horizontalAlignment'];
      if (typeof halign === 'number') {
        const hMap: Record<number, string> = { 0: 'left', 1: 'center', 2: 'right', 3: 'aligned', 4: 'middle', 5: 'fit' };
        result['horizontalAlignment'] = hMap[halign] ?? 'left';
      }
    } else if (etype === 'MTEXT') {
      const att = result['attachment'];
      if (typeof att === 'number') {
        const attMap: Record<number, string> = {
          1: 'top_left', 2: 'top_center', 3: 'top_right',
          4: 'middle_left', 5: 'middle_center', 6: 'middle_right',
          7: 'bottom_left', 8: 'bottom_center', 9: 'bottom_right',
        };
        result['attachment'] = attMap[att] ?? 'top_left';
      }
    } else if (etype === 'INSERT') {
      if ('rotation' in result) result['rotation'] = toRadians(Number(result['rotation']));
    } else if (etype === 'DIMENSION') {
      if ('dimType' in result) {
        result['type'] = result['dimType'];
        delete result['dimType'];
      }
    } else if (etype === 'LEADER') {
      if (!('hasArrowhead' in result)) result['hasArrowhead'] = true;
      if (!('pathType' in result)) result['pathType'] = 'straight';
    }

    // Remove internal fields
    for (const key of Object.keys(result)) {
      if (key.startsWith('_')) delete result[key];
    }

    return result;
  }

  // ------------------------------------------------------------------
  // Objects
  // ------------------------------------------------------------------

  private static convertObjects(dxf: DxfFile): Record<string, unknown>[] {
    const objects: Record<string, unknown>[] = [];
    for (const obj of dxf.objects) {
      const objType = String(obj['type'] ?? '');
      if (objType === 'LAYOUT') {
        objects.push({
          objectType: 'LAYOUT',
          name: obj['name'] ?? '',
          isModelSpace: obj['name'] === 'Model',
        });
      } else if (objType === 'DICTIONARY') {
        const converted: Record<string, unknown> = {
          objectType: 'DICTIONARY',
          handle: obj['handle'] ?? '',
          name: obj['name'] ?? '',
        };
        if ('entries' in obj) converted['entries'] = obj['entries'];
        if ('entryHandles' in obj) converted['entryHandles'] = obj['entryHandles'];
        objects.push(converted);
      }
    }
    return objects;
  }
}

function toRadians(degrees: number): number {
  return degrees * Math.PI / 180;
}
