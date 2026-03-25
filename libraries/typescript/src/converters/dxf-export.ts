/**
 * IFCX to DXF exporter -- pure TypeScript, no external dependencies.
 *
 * Generates valid DXF ASCII output (AutoCAD 2018 / AC1032 by default)
 * that can be opened in AutoCAD, BricsCAD, LibreCAD and similar programs.
 */

import { IfcxDocument } from '../document.js';
import { DxfWriter } from './dxf-writer.js';

type AnyDict = Record<string, any>;

export class DxfExporter {
  /** Export to DXF string. */
  static toString(doc: IfcxDocument, version = 'AC1032'): string {
    const w = new DxfWriter();

    DxfExporter.writeHeader(w, doc, version);
    DxfExporter.writeTables(w, doc);
    DxfExporter.writeBlocks(w, doc);
    DxfExporter.writeEntities(w, doc);
    DxfExporter.writeObjects(w, doc);

    w.group(0, 'EOF');
    return w.toString();
  }

  /** Export to DXF buffer. */
  static toBuffer(doc: IfcxDocument, version = 'AC1032'): Uint8Array {
    return new TextEncoder().encode(DxfExporter.toString(doc, version));
  }

  // ------------------------------------------------------------------
  // HEADER section
  // ------------------------------------------------------------------

  private static writeHeader(w: DxfWriter, doc: IfcxDocument, version: string): void {
    w.beginSection('HEADER');

    w.group(9, '$ACADVER'); w.group(1, version);
    w.group(9, '$HANDSEED'); w.group(5, 'FFFF');

    const units = (doc.header as AnyDict)?.units;
    const unitsStr = units?.linear ?? 'millimeters';
    const unitMap: Record<string, number> = {
      unitless: 0, inches: 1, feet: 2, miles: 3,
      millimeters: 4, centimeters: 5, meters: 6, kilometers: 7,
    };
    w.group(9, '$INSUNITS'); w.group(70, unitMap[unitsStr] ?? 4);

    const measurement = units?.measurement ?? 'metric';
    w.group(9, '$MEASUREMENT'); w.group(70, measurement === 'metric' ? 1 : 0);

    const clayer = (doc.header as AnyDict)?.currentLayer ?? '0';
    w.group(9, '$CLAYER'); w.group(8, clayer);

    const ltscale = (doc.header as AnyDict)?.linetypeScale ?? 1.0;
    w.group(9, '$LTSCALE'); w.group(40, Number(ltscale));

    w.endSection();
  }

  // ------------------------------------------------------------------
  // TABLES section
  // ------------------------------------------------------------------

  private static writeTables(w: DxfWriter, doc: IfcxDocument): void {
    const tables = doc.tables ?? {} as AnyDict;
    const layers: AnyDict = tables.layers ?? { '0': {} };
    const linetypes: AnyDict = tables.linetypes ?? {};
    const styles: AnyDict = tables.textStyles ?? {};
    const dimstyles: AnyDict = tables.dimStyles ?? {};

    w.beginSection('TABLES');

    // --- VPORT ---
    w.beginTable('VPORT', w.nextHandle(), 1);
    w.group(0, 'VPORT');
    w.handle(w.nextHandle());
    w.group(100, 'AcDbSymbolTableRecord');
    w.group(100, 'AcDbViewportTableRecord');
    w.group(2, '*Active'); w.group(70, 0);
    w.point(0, 0, 0);
    w.point(1, 1, 0, 11);
    w.point(0, 0, 0, 12);
    w.point(0, 0, 0, 13);
    w.point(1, 1, 0, 14);
    w.point(1, 1, 0, 15);
    w.point(0, 0, 1, 16);
    w.point(0, 0, 0, 17);
    w.group(42, 50); w.group(43, 0); w.group(44, 0);
    w.group(45, 1); w.group(50, 0); w.group(51, 0);
    w.endTable();

    // --- LTYPE ---
    const ltNames = Object.keys(linetypes);
    w.beginTable('LTYPE', w.nextHandle(), 3 + ltNames.length);
    for (const ltName of ['ByBlock', 'ByLayer', 'Continuous']) {
      w.group(0, 'LTYPE');
      w.handle(w.nextHandle());
      w.group(100, 'AcDbSymbolTableRecord');
      w.group(100, 'AcDbLinetypeTableRecord');
      w.group(2, ltName); w.group(70, 0);
      w.group(3, ''); w.group(72, 65); w.group(73, 0); w.group(40, 0);
    }
    for (const [ltName, ltProps] of Object.entries(linetypes) as [string, AnyDict][]) {
      w.group(0, 'LTYPE');
      w.handle(w.nextHandle());
      w.group(100, 'AcDbSymbolTableRecord');
      w.group(100, 'AcDbLinetypeTableRecord');
      w.group(2, ltName); w.group(70, 0);
      w.group(3, ltProps.description ?? '');
      w.group(72, 65);
      const pattern: number[] = ltProps.pattern ?? [];
      w.group(73, pattern.length);
      w.group(40, pattern.reduce((a: number, v: number) => a + Math.abs(v), 0));
      for (const elem of pattern) { w.group(49, elem); w.group(74, 0); }
    }
    w.endTable();

    // --- LAYER ---
    const layerNames = Object.keys(layers);
    w.beginTable('LAYER', w.nextHandle(), layerNames.length);
    for (const [layerName, layerProps] of Object.entries(layers) as [string, AnyDict][]) {
      w.group(0, 'LAYER');
      w.handle(w.nextHandle());
      w.group(100, 'AcDbSymbolTableRecord');
      w.group(100, 'AcDbLayerTableRecord');
      w.group(2, layerName);
      let flags = 0;
      if (layerProps.frozen) flags |= 1;
      if (layerProps.locked) flags |= 4;
      w.group(70, flags);
      let color = layerProps.color ?? 7;
      if (layerProps.off) color = -Math.abs(color);
      w.group(62, color);
      w.group(6, layerProps.linetype ?? 'Continuous');
      if ('plot' in layerProps) w.group(290, layerProps.plot ? 1 : 0);
      w.group(370, layerProps.lineweight ?? -3);
    }
    w.endTable();

    // --- STYLE ---
    const styleNames = Object.keys(styles);
    const styleCount = Math.max(1, styleNames.length);
    w.beginTable('STYLE', w.nextHandle(), styleCount);
    if (styleNames.length === 0) {
      w.group(0, 'STYLE'); w.handle(w.nextHandle());
      w.group(100, 'AcDbSymbolTableRecord'); w.group(100, 'AcDbTextStyleTableRecord');
      w.group(2, 'Standard'); w.group(70, 0); w.group(40, 0); w.group(41, 1);
      w.group(50, 0); w.group(71, 0); w.group(42, 2.5); w.group(3, 'txt'); w.group(4, '');
    } else {
      for (const [styleName, styleProps] of Object.entries(styles) as [string, AnyDict][]) {
        w.group(0, 'STYLE'); w.handle(w.nextHandle());
        w.group(100, 'AcDbSymbolTableRecord'); w.group(100, 'AcDbTextStyleTableRecord');
        w.group(2, styleName); w.group(70, 0);
        w.group(40, styleProps.height ?? 0);
        w.group(41, styleProps.widthFactor ?? 1);
        w.group(50, 0); w.group(71, 0);
        w.group(42, styleProps.height || 2.5);
        w.group(3, styleProps.fontFamily ?? 'txt');
        w.group(4, '');
      }
    }
    w.endTable();

    // --- VIEW ---
    w.beginTable('VIEW', w.nextHandle(), 0); w.endTable();

    // --- UCS ---
    w.beginTable('UCS', w.nextHandle(), 0); w.endTable();

    // --- APPID ---
    w.beginTable('APPID', w.nextHandle(), 1);
    w.group(0, 'APPID'); w.handle(w.nextHandle());
    w.group(100, 'AcDbSymbolTableRecord'); w.group(100, 'AcDbRegAppTableRecord');
    w.group(2, 'ACAD'); w.group(70, 0);
    w.endTable();

    // --- DIMSTYLE ---
    const dsNames = Object.keys(dimstyles);
    const dsCount = Math.max(1, dsNames.length);
    w.beginTable('DIMSTYLE', w.nextHandle(), dsCount);
    if (dsNames.length === 0) {
      w.group(0, 'DIMSTYLE'); w.handle(w.nextHandle());
      w.group(100, 'AcDbSymbolTableRecord'); w.group(100, 'AcDbDimStyleTableRecord');
      w.group(2, 'Standard'); w.group(70, 0);
      w.group(40, 1); w.group(41, 2.5); w.group(42, 0.625);
      w.group(43, 3.75); w.group(44, 1.25); w.group(140, 2.5);
      w.group(141, 2.5); w.group(147, 0.625); w.group(77, 1); w.group(271, 2);
    } else {
      for (const [dsName, dsProps] of Object.entries(dimstyles) as [string, AnyDict][]) {
        w.group(0, 'DIMSTYLE'); w.handle(w.nextHandle());
        w.group(100, 'AcDbSymbolTableRecord'); w.group(100, 'AcDbDimStyleTableRecord');
        w.group(2, dsName); w.group(70, 0);
        w.group(40, dsProps.overallScale ?? 1);
        w.group(41, dsProps.arrowSize ?? 2.5);
        w.group(140, dsProps.textHeight ?? 2.5);
      }
    }
    w.endTable();

    // --- BLOCK_RECORD ---
    const blockNames = Object.keys(doc.blocks ?? {});
    const brCount = 2 + blockNames.length;
    w.beginTable('BLOCK_RECORD', w.nextHandle(), brCount);
    for (const brName of ['*Model_Space', '*Paper_Space', ...blockNames]) {
      w.group(0, 'BLOCK_RECORD'); w.handle(w.nextHandle());
      w.group(100, 'AcDbSymbolTableRecord'); w.group(100, 'AcDbBlockTableRecord');
      w.group(2, brName);
    }
    w.endTable();

    w.endSection();
  }

  // ------------------------------------------------------------------
  // BLOCKS section
  // ------------------------------------------------------------------

  private static writeBlocks(w: DxfWriter, doc: IfcxDocument): void {
    w.beginSection('BLOCKS');

    DxfExporter.writeBlockWrapper(w, '*Model_Space', '0', []);
    DxfExporter.writeBlockWrapper(w, '*Paper_Space', '0', []);

    if (doc.blocks) {
      for (const [blockName, blockData] of Object.entries(doc.blocks) as [string, AnyDict][]) {
        const layer = blockData.layer ?? '0';
        const bp = blockData.basePoint ?? [0, 0, 0];
        const entities = blockData.entities ?? [];
        DxfExporter.writeBlockWrapper(w, blockName, layer, entities, bp);
      }
    }

    w.endSection();
  }

  private static writeBlockWrapper(
    w: DxfWriter, name: string, layer: string,
    entities: AnyDict[], basePoint?: number[]
  ): void {
    const bp = basePoint ?? [0, 0, 0];
    w.group(0, 'BLOCK'); w.handle(w.nextHandle());
    w.group(100, 'AcDbEntity'); w.group(8, layer);
    w.group(100, 'AcDbBlockBegin');
    w.group(2, name); w.group(70, 0);
    w.point(bp[0], bp[1], bp[2] ?? 0);
    w.group(3, name); w.group(1, '');

    for (const ent of entities) DxfExporter.writeEntity(w, ent);

    w.group(0, 'ENDBLK'); w.handle(w.nextHandle());
    w.group(100, 'AcDbEntity'); w.group(8, layer);
    w.group(100, 'AcDbBlockEnd');
  }

  // ------------------------------------------------------------------
  // ENTITIES section
  // ------------------------------------------------------------------

  private static writeEntities(w: DxfWriter, doc: IfcxDocument): void {
    w.beginSection('ENTITIES');
    for (const ent of doc.entities) DxfExporter.writeEntity(w, ent as AnyDict);
    w.endSection();
  }

  private static writeEntity(w: DxfWriter, ent: AnyDict): void {
    const etype = ent.type ?? '';
    const dispatch: Record<string, (w: DxfWriter, ent: AnyDict) => void> = {
      'LINE': DxfExporter.writeLine,
      'POINT': DxfExporter.writePointEntity,
      'CIRCLE': DxfExporter.writeCircle,
      'ARC': DxfExporter.writeArc,
      'ELLIPSE': DxfExporter.writeEllipse,
      'SPLINE': DxfExporter.writeSpline,
      'LWPOLYLINE': DxfExporter.writeLWPolyline,
      'POLYLINE2D': DxfExporter.writePolyline,
      'POLYLINE3D': DxfExporter.writePolyline,
      'POLYLINE': DxfExporter.writePolyline,
      'TEXT': DxfExporter.writeText,
      'MTEXT': DxfExporter.writeMText,
      'DIMENSION_LINEAR': DxfExporter.writeDimension,
      'DIMENSION_ALIGNED': DxfExporter.writeDimension,
      'DIMENSION_ANGULAR': DxfExporter.writeDimension,
      'DIMENSION_ANGULAR3P': DxfExporter.writeDimension,
      'DIMENSION_DIAMETER': DxfExporter.writeDimension,
      'DIMENSION_RADIUS': DxfExporter.writeDimension,
      'DIMENSION_ORDINATE': DxfExporter.writeDimension,
      'DIMENSION': DxfExporter.writeDimension,
      'LEADER': DxfExporter.writeLeader,
      'HATCH': DxfExporter.writeHatch,
      'INSERT': DxfExporter.writeInsert,
      'ATTDEF': DxfExporter.writeAttdef,
      'SOLID': DxfExporter.writeSolidTrace,
      'TRACE': DxfExporter.writeSolidTrace,
      '3DFACE': DxfExporter.write3DFace,
      'VIEWPORT': DxfExporter.writeViewport,
      'XLINE': DxfExporter.writeXlineRay,
      'RAY': DxfExporter.writeXlineRay,
    };

    const handler = dispatch[etype];
    if (handler) handler(w, ent);
  }

  private static writeCommon(w: DxfWriter, ent: AnyDict, subclass: string): void {
    const h = ent.handle ?? w.nextHandle();
    w.handle(h);
    w.group(100, 'AcDbEntity');
    if (ent.paperSpace) w.group(67, 1);
    w.group(8, ent.layer ?? '0');
    if (ent.linetype) w.group(6, ent.linetype);
    if (ent.color != null) w.group(62, ent.color);
    if (ent.lineweight != null) w.group(370, ent.lineweight);
    if (ent.trueColor != null) w.group(420, ent.trueColor);
    if (ent.transparency != null) w.group(440, ent.transparency);
    if (ent.visibility != null) w.group(60, ent.visibility);
    w.group(100, subclass);
  }

  private static p(arr: number[] | undefined, idx = 0): number {
    return arr?.[idx] ?? 0;
  }

  // --- LINE ---
  private static writeLine(w: DxfWriter, ent: AnyDict): void {
    w.entity('LINE');
    DxfExporter.writeCommon(w, ent, 'AcDbLine');
    const s = ent.start ?? [0, 0, 0];
    const e = ent.end ?? [0, 0, 0];
    w.point(s[0], s[1], s[2] ?? 0);
    w.point(e[0], e[1], e[2] ?? 0, 11);
  }

  // --- POINT ---
  private static writePointEntity(w: DxfWriter, ent: AnyDict): void {
    w.entity('POINT');
    DxfExporter.writeCommon(w, ent, 'AcDbPoint');
    const p = ent.position ?? [0, 0, 0];
    w.point(p[0], p[1], p[2] ?? 0);
  }

  // --- CIRCLE ---
  private static writeCircle(w: DxfWriter, ent: AnyDict): void {
    w.entity('CIRCLE');
    DxfExporter.writeCommon(w, ent, 'AcDbCircle');
    const c = ent.center ?? [0, 0, 0];
    w.point(c[0], c[1], c[2] ?? 0);
    w.group(40, ent.radius ?? 0);
  }

  // --- ARC ---
  private static writeArc(w: DxfWriter, ent: AnyDict): void {
    w.entity('ARC');
    DxfExporter.writeCommon(w, ent, 'AcDbCircle');
    const c = ent.center ?? [0, 0, 0];
    w.point(c[0], c[1], c[2] ?? 0);
    w.group(40, ent.radius ?? 0);
    w.group(100, 'AcDbArc');
    w.group(50, ent.startAngle ?? 0);
    w.group(51, ent.endAngle ?? 360);
  }

  // --- ELLIPSE ---
  private static writeEllipse(w: DxfWriter, ent: AnyDict): void {
    w.entity('ELLIPSE');
    DxfExporter.writeCommon(w, ent, 'AcDbEllipse');
    const c = ent.center ?? [0, 0, 0];
    w.point(c[0], c[1], c[2] ?? 0);
    const ma = ent.majorAxisEndpoint ?? [1, 0, 0];
    w.point(ma[0], ma[1], ma[2] ?? 0, 11);
    w.group(40, ent.minorAxisRatio ?? 0.5);
    w.group(41, ent.startParam ?? 0);
    w.group(42, ent.endParam ?? 6.283185307179586);
  }

  // --- SPLINE ---
  private static writeSpline(w: DxfWriter, ent: AnyDict): void {
    w.entity('SPLINE');
    DxfExporter.writeCommon(w, ent, 'AcDbSpline');
    let flags = 0;
    if (ent.closed) flags |= 1;
    if (ent.rational) flags |= 4;
    w.group(70, flags);
    w.group(71, ent.degree ?? 3);
    const knots: number[] = ent.knots ?? [];
    const ctrlPts: number[][] = ent.controlPoints ?? [];
    const fitPts: number[][] = ent.fitPoints ?? [];
    w.group(72, knots.length);
    w.group(73, ctrlPts.length);
    w.group(74, fitPts.length);
    for (const k of knots) w.group(40, k);
    const weights: number[] = ent.weights ?? [];
    for (let i = 0; i < ctrlPts.length; i++) {
      const cp = ctrlPts[i];
      w.point(cp[0], cp[1], cp[2] ?? 0);
      if (i < weights.length) w.group(41, weights[i]);
    }
    for (const fp of fitPts) w.point(fp[0], fp[1], fp[2] ?? 0, 11);
  }

  // --- LWPOLYLINE ---
  private static writeLWPolyline(w: DxfWriter, ent: AnyDict): void {
    w.entity('LWPOLYLINE');
    DxfExporter.writeCommon(w, ent, 'AcDbPolyline');
    const verts: AnyDict[] = ent.vertices ?? [];
    w.group(90, verts.length);
    let flags = 0;
    if (ent.closed) flags |= 1;
    w.group(70, flags);
    if (ent.elevation != null) w.group(38, Number(ent.elevation));
    for (const v of verts) {
      w.group(10, v.x ?? 0);
      w.group(20, v.y ?? 0);
      if (v.startWidth != null) w.group(40, v.startWidth);
      if (v.endWidth != null) w.group(41, v.endWidth);
      if (v.bulge != null) w.group(42, v.bulge);
    }
  }

  // --- POLYLINE ---
  private static writePolyline(w: DxfWriter, ent: AnyDict): void {
    const is3d = ent.type === 'POLYLINE3D';
    w.entity('POLYLINE');
    const h = ent.handle ?? w.nextHandle();
    w.handle(h);
    w.group(100, 'AcDbEntity');
    w.group(8, ent.layer ?? '0');
    if (is3d) {
      w.group(100, 'AcDb3dPolyline');
    } else {
      w.group(100, 'AcDb2dPolyline');
    }
    let flags = is3d ? 8 : 0;
    if (ent.closed) flags |= 1;
    w.group(66, 1);
    w.group(70, flags);
    w.point(0, 0, 0);

    const verts: any[] = ent.vertices ?? [];
    for (const v of verts) {
      w.entity('VERTEX');
      w.handle(w.nextHandle());
      w.group(100, 'AcDbEntity');
      w.group(8, ent.layer ?? '0');
      if (is3d) {
        w.group(100, 'AcDb3dPolylineVertex');
        if (Array.isArray(v)) w.point(v[0], v[1], v[2] ?? 0);
        else {
          const pos = v.position ?? [0, 0, 0];
          w.point(pos[0], pos[1], pos[2] ?? 0);
        }
        w.group(70, 32);
      } else {
        w.group(100, 'AcDb2dVertex');
        if (v && typeof v === 'object' && 'position' in v) {
          const pos = v.position;
          w.point(pos[0], pos[1], pos[2] ?? 0);
          if (v.bulge != null) w.group(42, v.bulge);
        } else if (Array.isArray(v)) {
          w.point(v[0], v[1], v[2] ?? 0);
        }
        w.group(70, 0);
      }
    }

    w.entity('SEQEND');
    w.handle(w.nextHandle());
    w.group(100, 'AcDbEntity');
    w.group(8, ent.layer ?? '0');
  }

  // --- TEXT ---
  private static writeText(w: DxfWriter, ent: AnyDict): void {
    w.entity('TEXT');
    DxfExporter.writeCommon(w, ent, 'AcDbText');
    const ip = ent.insertionPoint ?? [0, 0, 0];
    w.point(ip[0], ip[1], ip[2] ?? 0);
    w.group(40, ent.height ?? 2.5);
    w.group(1, ent.text ?? '');
    if (ent.rotation != null) w.group(50, ent.rotation);
    if (ent.style) w.group(7, ent.style);
    if (ent.widthFactor != null) w.group(41, ent.widthFactor);
    if (ent.obliqueAngle != null) w.group(51, ent.obliqueAngle);
    if (ent.textGenerationFlags != null) w.group(71, ent.textGenerationFlags);
    if (ent.horizontalAlignment != null) {
      let hVal = ent.horizontalAlignment;
      if (typeof hVal === 'string') {
        const hMap: Record<string, number> = { left: 0, center: 1, right: 2, aligned: 3, middle: 4, fit: 5 };
        hVal = hMap[hVal] ?? 0;
      }
      w.group(72, hVal);
    }
    if (ent.alignmentPoint) {
      const ap = ent.alignmentPoint;
      w.point(ap[0], ap[1], ap[2] ?? 0, 11);
    }
    w.group(100, 'AcDbText');
    if (ent.verticalAlignment != null) w.group(73, ent.verticalAlignment);
  }

  // --- MTEXT ---
  private static writeMText(w: DxfWriter, ent: AnyDict): void {
    w.entity('MTEXT');
    DxfExporter.writeCommon(w, ent, 'AcDbMText');
    const ip = ent.insertionPoint ?? [0, 0, 0];
    w.point(ip[0], ip[1], ip[2] ?? 0);
    w.group(40, ent.height ?? 2.5);
    if (ent.width != null) w.group(41, ent.width);
    let attachment = ent.attachment ?? 1;
    if (typeof attachment === 'string') {
      const attMap: Record<string, number> = {
        top_left: 1, top_center: 2, top_right: 3,
        middle_left: 4, middle_center: 5, middle_right: 6,
        bottom_left: 7, bottom_center: 8, bottom_right: 9,
      };
      attachment = attMap[attachment] ?? 1;
    }
    w.group(71, attachment);
    if (ent.drawingDirection != null) w.group(72, ent.drawingDirection);
    let text: string = ent.text ?? '';
    const chunkSize = 250;
    while (text.length > chunkSize) {
      w.group(3, text.substring(0, chunkSize));
      text = text.substring(chunkSize);
    }
    w.group(1, text);
    if (ent.rotation != null) w.group(50, ent.rotation);
    if (ent.style) w.group(7, ent.style);
    if (ent.lineSpacingFactor != null) w.group(44, ent.lineSpacingFactor);
    if (ent.lineSpacingStyle != null) w.group(73, ent.lineSpacingStyle);
  }

  // --- DIMENSION ---
  private static writeDimension(w: DxfWriter, ent: AnyDict): void {
    w.entity('DIMENSION');
    DxfExporter.writeCommon(w, ent, 'AcDbDimension');
    if (ent.blockName) w.group(2, ent.blockName);
    const dp = ent.dimLinePoint ?? ent.center ?? [0, 0, 0];
    w.point(dp[0], dp[1], dp[2] ?? 0);
    const mp = ent.textPosition ?? [0, 0, 0];
    w.point(mp[0], mp[1], mp[2] ?? 0, 11);

    const etype = ent.type ?? ent.dimType ?? 'DIMENSION_LINEAR';
    const typeMap: Record<string, number> = {
      DIMENSION_LINEAR: 0, DIMENSION_ALIGNED: 1,
      DIMENSION_ANGULAR: 2, DIMENSION_DIAMETER: 3,
      DIMENSION_RADIUS: 4, DIMENSION_ANGULAR3P: 5,
      DIMENSION_ORDINATE: 6,
    };
    const dimtype = ent.dimTypeRaw ?? typeMap[etype] ?? 0;
    w.group(70, dimtype);
    if (ent.overrideText != null) w.group(1, ent.overrideText);
    if (ent.dimStyle) w.group(3, ent.dimStyle);
    if (ent.rotationAngle != null) w.group(53, ent.rotationAngle);

    const subtype = dimtype & 0x0F;
    if (subtype === 0 || subtype === 1) {
      w.group(100, 'AcDbAlignedDimension');
      const d1 = ent.defPoint1 ?? [0, 0, 0];
      w.point(d1[0], d1[1], d1[2] ?? 0, 13);
      const d2 = ent.defPoint2 ?? [0, 0, 0];
      w.point(d2[0], d2[1], d2[2] ?? 0, 14);
      if (subtype === 0) w.group(100, 'AcDbRotatedDimension');
    } else if (subtype === 2 || subtype === 5) {
      w.group(100, 'AcDb3PointAngularDimension');
      const d1 = ent.defPoint1 ?? [0, 0, 0];
      w.point(d1[0], d1[1], d1[2] ?? 0, 13);
      const d2 = ent.defPoint2 ?? [0, 0, 0];
      w.point(d2[0], d2[1], d2[2] ?? 0, 14);
      const d3 = ent.defPoint3 ?? [0, 0, 0];
      w.point(d3[0], d3[1], d3[2] ?? 0, 15);
    } else if (subtype === 3 || subtype === 4) {
      w.group(100, 'AcDbRadialDimension');
      const d1 = ent.defPoint1 ?? ent.chordPoint ?? [0, 0, 0];
      w.point(d1[0], d1[1], d1[2] ?? 0, 15);
      w.group(40, ent.leaderLength ?? 0);
    } else if (subtype === 6) {
      w.group(100, 'AcDbOrdinateDimension');
      const d1 = ent.defPoint1 ?? [0, 0, 0];
      w.point(d1[0], d1[1], d1[2] ?? 0, 13);
      const d2 = ent.defPoint2 ?? [0, 0, 0];
      w.point(d2[0], d2[1], d2[2] ?? 0, 14);
    }
  }

  // --- LEADER ---
  private static writeLeader(w: DxfWriter, ent: AnyDict): void {
    w.entity('LEADER');
    DxfExporter.writeCommon(w, ent, 'AcDbLeader');
    if (ent.dimStyle) w.group(3, ent.dimStyle);
    w.group(71, ent.hasArrowhead !== false ? 1 : 0);
    w.group(72, ent.pathType === 'spline' ? 1 : 0);
    const verts: number[][] = ent.vertices ?? [];
    w.group(76, verts.length);
    for (const v of verts) w.point(v[0], v[1], v[2] ?? 0);
  }

  // --- HATCH ---
  private static writeHatch(w: DxfWriter, ent: AnyDict): void {
    w.entity('HATCH');
    DxfExporter.writeCommon(w, ent, 'AcDbHatch');
    w.point(0, 0, 0);
    w.group(210, 0); w.group(220, 0); w.group(230, 1);
    w.group(2, ent.patternName ?? 'SOLID');
    w.group(70, ent.solid !== false ? 1 : 0);
    w.group(71, ent.associative ? 1 : 0);

    const boundaries: AnyDict[] = ent.boundaries ?? [];
    w.group(91, boundaries.length);
    for (const boundary of boundaries) {
      const btype = boundary.type ?? 'polyline';
      const bflags = boundary.flags ?? (btype === 'polyline' ? 2 : 0);
      w.group(92, bflags);
      if (btype === 'polyline') {
        const poly = boundary.polyline ?? {};
        const verts: AnyDict[] = poly.vertices ?? [];
        const hasBulge = verts.some((v: AnyDict) => (v.bulge ?? 0) !== 0);
        w.group(72, hasBulge ? 1 : 0);
        w.group(73, poly.closed !== false ? 1 : 0);
        w.group(93, verts.length);
        for (const v of verts) {
          w.group(10, v.x ?? 0);
          w.group(20, v.y ?? 0);
          if (hasBulge) w.group(42, v.bulge ?? 0);
        }
      } else {
        const edges: AnyDict[] = boundary.edges ?? [];
        w.group(93, edges.length);
        for (const edge of edges) {
          const edgeType = edge.edgeType ?? 'line';
          if (edgeType === 'line') {
            w.group(72, 1);
            const s = edge.start ?? [0, 0]; const e = edge.end ?? [0, 0];
            w.group(10, s[0]); w.group(20, s[1]);
            w.group(11, e[0]); w.group(21, e[1]);
          } else if (edgeType === 'arc') {
            w.group(72, 2);
            const c = edge.center ?? [0, 0];
            w.group(10, c[0]); w.group(20, c[1]);
            w.group(40, edge.radius ?? 0);
            w.group(50, edge.startAngle ?? 0);
            w.group(51, edge.endAngle ?? 360);
            w.group(73, edge.counterClockwise !== false ? 1 : 0);
          }
        }
      }
    }
    w.group(75, ent.hatchStyle ?? 0);
    w.group(76, ent.patternType ?? 1);
    w.group(98, 0);
  }

  // --- INSERT ---
  private static writeInsert(w: DxfWriter, ent: AnyDict): void {
    w.entity('INSERT');
    DxfExporter.writeCommon(w, ent, 'AcDbBlockReference');
    const hasAttribs = !!ent.attributes?.length;
    if (hasAttribs) w.group(66, 1);
    w.group(2, ent.blockName ?? '');
    const ip = ent.insertionPoint ?? [0, 0, 0];
    w.point(ip[0], ip[1], ip[2] ?? 0);
    if (ent.scaleX != null) w.group(41, ent.scaleX);
    if (ent.scaleY != null) w.group(42, ent.scaleY);
    if (ent.scaleZ != null) w.group(43, ent.scaleZ);
    if (ent.rotation != null) w.group(50, ent.rotation);
    if (ent.columnCount != null) w.group(70, ent.columnCount);
    if (ent.rowCount != null) w.group(71, ent.rowCount);
    if (ent.columnSpacing != null) w.group(44, ent.columnSpacing);
    if (ent.rowSpacing != null) w.group(45, ent.rowSpacing);

    if (hasAttribs) {
      for (const attr of ent.attributes) {
        w.entity('ATTRIB');
        w.handle(w.nextHandle());
        w.group(100, 'AcDbEntity');
        w.group(8, attr.layer ?? ent.layer ?? '0');
        w.group(100, 'AcDbText');
        const aip = attr.insertionPoint ?? [0, 0, 0];
        w.point(aip[0], aip[1], aip[2] ?? 0);
        w.group(40, attr.height ?? 2.5);
        w.group(1, attr.value ?? '');
        w.group(100, 'AcDbAttribute');
        w.group(2, attr.tag ?? '');
        w.group(70, attr.flags ?? 0);
      }
      w.entity('SEQEND');
      w.handle(w.nextHandle());
      w.group(100, 'AcDbEntity');
      w.group(8, ent.layer ?? '0');
    }
  }

  // --- ATTDEF ---
  private static writeAttdef(w: DxfWriter, ent: AnyDict): void {
    w.entity('ATTDEF');
    DxfExporter.writeCommon(w, ent, 'AcDbText');
    const ip = ent.insertionPoint ?? [0, 0, 0];
    w.point(ip[0], ip[1], ip[2] ?? 0);
    w.group(40, ent.height ?? 2.5);
    w.group(1, ent.defaultValue ?? '');
    w.group(100, 'AcDbAttributeDefinition');
    w.group(3, ent.prompt ?? '');
    w.group(2, ent.tag ?? '');
    w.group(70, ent.flags ?? 0);
  }

  // --- SOLID / TRACE ---
  private static writeSolidTrace(w: DxfWriter, ent: AnyDict): void {
    const etype = ent.type ?? 'SOLID';
    w.entity(etype);
    DxfExporter.writeCommon(w, ent, 'AcDbTrace');
    for (let i = 0; i < 4; i++) {
      const pt = ent[`point${i + 1}`] ?? [0, 0, 0];
      w.point(pt[0], pt[1], pt[2] ?? 0, 10 + i);
    }
  }

  // --- 3DFACE ---
  private static write3DFace(w: DxfWriter, ent: AnyDict): void {
    w.entity('3DFACE');
    DxfExporter.writeCommon(w, ent, 'AcDbFace');
    for (let i = 0; i < 4; i++) {
      const pt = ent[`point${i + 1}`] ?? [0, 0, 0];
      w.point(pt[0], pt[1], pt[2] ?? 0, 10 + i);
    }
    if (ent.invisibleEdges != null) w.group(70, ent.invisibleEdges);
  }

  // --- VIEWPORT ---
  private static writeViewport(w: DxfWriter, ent: AnyDict): void {
    w.entity('VIEWPORT');
    DxfExporter.writeCommon(w, ent, 'AcDbViewport');
    const c = ent.center ?? [0, 0, 0];
    w.point(c[0], c[1], c[2] ?? 0);
    w.group(40, ent.width ?? 297);
    w.group(41, ent.height ?? 210);
    if (ent.id != null) w.group(69, ent.id);
    if (ent.viewCenter) {
      w.group(12, ent.viewCenter[0]);
      w.group(22, ent.viewCenter[1]);
    }
    if (ent.viewHeight != null) w.group(45, ent.viewHeight);
    if (ent.statusFlags != null) w.group(90, ent.statusFlags);
  }

  // --- XLINE / RAY ---
  private static writeXlineRay(w: DxfWriter, ent: AnyDict): void {
    const etype = ent.type ?? 'XLINE';
    w.entity(etype);
    DxfExporter.writeCommon(w, ent, etype === 'XLINE' ? 'AcDbXline' : 'AcDbRay');
    const o = ent.origin ?? [0, 0, 0];
    w.point(o[0], o[1], o[2] ?? 0);
    const d = ent.direction ?? [1, 0, 0];
    w.point(d[0], d[1], d[2] ?? 0, 11);
  }

  // ------------------------------------------------------------------
  // OBJECTS section
  // ------------------------------------------------------------------

  private static writeObjects(w: DxfWriter, doc: IfcxDocument): void {
    w.beginSection('OBJECTS');

    const rootHandle = w.nextHandle();
    w.entity('DICTIONARY');
    w.handle(rootHandle);
    w.group(100, 'AcDbDictionary');
    w.group(281, 1);

    const groupDictHandle = w.nextHandle();
    w.group(3, 'ACAD_GROUP');
    w.group(350, groupDictHandle);

    w.entity('DICTIONARY');
    w.handle(groupDictHandle);
    w.group(100, 'AcDbDictionary');
    w.group(281, 1);

    w.endSection();
  }
}
