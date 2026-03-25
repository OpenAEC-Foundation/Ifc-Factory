/**
 * V1 (DXF-style IfcxDocument) to V2 (IFC5 node-based) converter.
 *
 * Transforms the flat entity-list format produced by the DXF/DWG/DGN importers
 * into the IFC5-compatible node graph used by IfcX v2.
 */

import { IfcxDocument } from '../document.js';

// ---------------------------------------------------------------------------
// V2 Types
// ---------------------------------------------------------------------------

export interface V2Node {
  path: string;
  children?: Record<string, string>;
  attributes?: Record<string, unknown>;
  inherits?: string[];
}

export interface V2Header {
  ifcxVersion: string;
  id: string;
  timestamp: string;
  units: { length: string; angle: string };
}

export interface V2Import {
  uri: string;
}

export interface V2Document {
  header: V2Header;
  imports: V2Import[];
  data: V2Node[];
  media: Record<string, { path?: string; [key: string]: unknown }>;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const V2_IMPORTS: V2Import[] = [
  { uri: 'https://ifcx.dev/@standards.buildingsmart.org/ifc/core/ifc@v5a.ifcx' },
  { uri: 'https://ifcx.dev/@openusd.org/usd@v1.ifcx' },
  { uri: 'https://ifcx.openaec.org/schemas/geom@v1.ifcx' },
  { uri: 'https://ifcx.openaec.org/schemas/annotation@v1.ifcx' },
  { uri: 'https://ifcx.openaec.org/schemas/sheet@v1.ifcx' },
];

const UNIT_TO_MM: Record<string, string> = {
  millimeters: 'mm',
  centimeters: 'cm',
  meters: 'm',
  kilometers: 'km',
  inches: 'in',
  feet: 'ft',
  miles: 'mi',
  unitless: 'mm',
  // DWG-specific (LUNITS)
  scientific: 'mm',
  decimal: 'mm',
  engineering: 'in',
  architectural: 'in',
  fractional: 'in',
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

let _uidCounter = 0;

function uid(): string {
  // Generates a short unique id using random hex + counter for uniqueness
  const hex = Math.random().toString(16).substring(2, 10);
  return hex + ((_uidCounter++) % 0xffff).toString(16).padStart(4, '0');
}

function ensure3D(pt: number[] | undefined): [number, number, number] {
  if (!pt) return [0, 0, 0];
  const result: [number, number, number] = [
    pt[0] ?? 0,
    pt[1] ?? 0,
    pt[2] ?? 0,
  ];
  return result;
}

function buildInsertMatrix(
  insertPt: number[],
  xScale = 1.0,
  yScale = 1.0,
  zScale = 1.0,
  rotation = 0.0,
): number[][] {
  const c = Math.cos(rotation);
  const s = Math.sin(rotation);
  const [tx, ty, tz] = ensure3D(insertPt);
  return [
    [xScale * c, xScale * s, 0.0, 0.0],
    [-yScale * s, yScale * c, 0.0, 0.0],
    [0.0, 0.0, zScale, 0.0],
    [tx, ty, tz, 1.0],
  ];
}

// ---------------------------------------------------------------------------
// ACI -> RGB
// ---------------------------------------------------------------------------

interface RGBColor {
  r: number;
  g: number;
  b: number;
}

const ACI_TABLE: Record<number, [number, number, number]> = {
  1: [1.0, 0.0, 0.0],       // red
  2: [1.0, 1.0, 0.0],       // yellow
  3: [0.0, 1.0, 0.0],       // green
  4: [0.0, 1.0, 1.0],       // cyan
  5: [0.0, 0.0, 1.0],       // blue
  6: [1.0, 0.0, 1.0],       // magenta
  7: [1.0, 1.0, 1.0],       // white/black
  8: [0.5, 0.5, 0.5],       // dark grey
  9: [0.75, 0.75, 0.75],    // light grey
};

function aciToRgb(aci: unknown): RGBColor | null {
  if (typeof aci !== 'number' || aci < 1) return null;
  const entry = ACI_TABLE[aci];
  if (entry) {
    return { r: entry[0], g: entry[1], b: entry[2] };
  }
  if (aci >= 1 && aci <= 255) {
    const v = Math.round((aci / 255.0) * 1000) / 1000;
    return { r: v, g: v, b: v };
  }
  return null;
}

// ---------------------------------------------------------------------------
// V2Converter
// ---------------------------------------------------------------------------

export class V2Converter {
  /**
   * Convert a v1 IfcxDocument to a v2 IFC5-node dict format.
   */
  static fromV1(doc: IfcxDocument): V2Document {
    const conv = new V2Converter(doc);
    conv.convert();
    return conv.result;
  }

  // ----- internals --------------------------------------------------------

  private doc: IfcxDocument;
  private nodes: V2Node[] = [];
  private result!: V2Document;

  // Maps: v1 name -> v2 path
  private layerPaths: Record<string, string> = {};
  private stylePaths: Record<string, string> = {};
  private blockPaths: Record<string, string> = {};

  // Media (raster images)
  private media: Record<string, { path?: string; [key: string]: unknown }> = {};

  private constructor(doc: IfcxDocument) {
    this.doc = doc;
  }

  // .......................................................................
  // Main orchestrator
  // .......................................................................

  private convert(): void {
    // Determine length unit
    const v1Units = this.doc.header?.units;
    let lengthUnit = 'mm';
    if (v1Units && typeof v1Units === 'object') {
      const raw = v1Units.linear ?? 'millimeters';
      lengthUnit = UNIT_TO_MM[String(raw)] ?? 'mm';
    }

    const header: V2Header = {
      ifcxVersion: '2.0',
      id: crypto?.randomUUID?.() ?? `${uid()}-${uid()}-${uid()}`,
      timestamp: new Date().toISOString(),
      units: { length: lengthUnit, angle: 'rad' },
    };

    // Structural root nodes
    const projectPath = 'project';
    const drawingsPath = 'drawings';
    const definitionsPath = 'definitions';
    const stylesPath = 'styles';

    const projectNode: V2Node = {
      path: projectPath,
      children: {
        drawings: drawingsPath,
        definitions: definitionsPath,
        styles: stylesPath,
      },
      attributes: {
        'ifcx::purpose': 'drawing',
      },
    };
    this.nodes.push(projectNode);

    // Styles container
    const stylesNode: V2Node = {
      path: stylesPath,
      children: {},
      attributes: { 'ifcx::purpose': 'drawing' },
    };

    // Definitions container
    const definitionsNode: V2Node = {
      path: definitionsPath,
      children: {},
      attributes: { 'ifcx::purpose': 'definition' },
    };

    // Drawings container
    const drawingsNode: V2Node = {
      path: drawingsPath,
      children: {},
      attributes: { 'ifcx::purpose': 'drawing' },
    };

    // 1. Convert layers -> style nodes
    this.convertLayers(stylesNode);

    // 2. Convert text / dim / linetype styles
    this.convertTextStyles(stylesNode);
    this.convertDimStyles(stylesNode);
    this.convertLinetypes(stylesNode);

    // 3. Convert blocks -> definitions
    this.convertBlocks(definitionsNode);

    // 4. Convert entities -> element nodes under a default view
    const viewPath = 'view-main';
    const viewNode: V2Node = {
      path: viewPath,
      children: {},
      attributes: {
        'ifcx::purpose': 'drawing',
        'ifcx::view::name': 'Main',
        'ifcx::view::scale': 1,
      },
    };
    this.convertEntities(viewNode);

    // Wire view into drawings
    drawingsNode.children!['main'] = viewPath;

    // Append structural nodes (after children are populated)
    this.nodes.push(stylesNode);
    this.nodes.push(definitionsNode);
    this.nodes.push(drawingsNode);
    this.nodes.push(viewNode);

    this.result = {
      header,
      imports: [...V2_IMPORTS],
      data: this.nodes,
      media: this.media,
    };
  }

  // .......................................................................
  // Layers
  // .......................................................................

  private convertLayers(stylesNode: V2Node): void {
    const layers = this.doc.tables?.layers ?? {};
    for (const [name, props] of Object.entries(layers)) {
      const path = `layer-${uid()}`;
      this.layerPaths[name] = path;

      const attrs: Record<string, unknown> = { 'ifcx::purpose': 'drawing' };

      const styleVal: Record<string, unknown> = {};
      if (props.color !== undefined) {
        const colour = aciToRgb(props.color);
        if (colour) styleVal['colour'] = colour;
      }
      if (props.lineweight !== undefined) {
        const lw = props.lineweight;
        if (typeof lw === 'number' && lw >= 0) {
          styleVal['lineWeight'] = lw > 10 ? lw / 100.0 : lw;
        }
      }
      if (props.frozen !== undefined) {
        styleVal['frozen'] = Boolean(props.frozen);
      }
      if (props.locked !== undefined) {
        styleVal['locked'] = Boolean(props.locked);
      }
      if (props.off !== undefined) {
        styleVal['visible'] = !Boolean(props.off);
      }
      if (props.plot !== undefined) {
        styleVal['plot'] = Boolean(props.plot);
      }

      attrs['ifcx::layer::style'] = styleVal;
      attrs['ifcx::layer::assignment'] = { name };

      const node: V2Node = { path, attributes: attrs };
      this.nodes.push(node);
      stylesNode.children![`layer-${name}`] = path;
    }
  }

  // .......................................................................
  // Text styles
  // .......................................................................

  private convertTextStyles(stylesNode: V2Node): void {
    const textStyles = this.doc.tables?.textStyles ?? {};
    for (const [name, props] of Object.entries(textStyles)) {
      const path = `textstyle-${uid()}`;
      this.stylePaths[`text:${name}`] = path;

      const styleVal: Record<string, unknown> = {};
      if (props.fontFamily) styleVal['font'] = props.fontFamily;
      if (props.height !== undefined) styleVal['size'] = props.height;
      if (props.widthFactor !== undefined) styleVal['widthFactor'] = props.widthFactor;

      const node: V2Node = {
        path,
        attributes: {
          'ifcx::purpose': 'drawing',
          'ifcx::style::textStyle': styleVal,
        },
      };
      this.nodes.push(node);
      stylesNode.children![`textstyle-${name}`] = path;
    }
  }

  // .......................................................................
  // Dim styles
  // .......................................................................

  private convertDimStyles(stylesNode: V2Node): void {
    const dimStyles = this.doc.tables?.dimStyles ?? {};
    for (const [name, props] of Object.entries(dimStyles)) {
      const path = `dimstyle-${uid()}`;
      this.stylePaths[`dim:${name}`] = path;

      const node: V2Node = {
        path,
        attributes: {
          'ifcx::purpose': 'drawing',
          'ifcx::style::dimensionStyle': { ...props },
        },
      };
      this.nodes.push(node);
      stylesNode.children![`dimstyle-${name}`] = path;
    }
  }

  // .......................................................................
  // Linetypes
  // .......................................................................

  private convertLinetypes(stylesNode: V2Node): void {
    const linetypes = this.doc.tables?.linetypes ?? {};
    for (const [name, props] of Object.entries(linetypes)) {
      const path = `linetype-${uid()}`;
      this.stylePaths[`lt:${name}`] = path;

      const styleVal: Record<string, unknown> = {};
      if (props.description) styleVal['description'] = props.description;
      if (props.pattern) styleVal['dashPattern'] = props.pattern;

      const node: V2Node = {
        path,
        attributes: {
          'ifcx::purpose': 'drawing',
          'ifcx::style::curveStyle': styleVal,
        },
      };
      this.nodes.push(node);
      stylesNode.children![`linetype-${name}`] = path;
    }
  }

  // .......................................................................
  // Blocks -> definitions
  // .......................................................................

  private convertBlocks(definitionsNode: V2Node): void {
    for (const [name, block] of Object.entries(this.doc.blocks)) {
      const path = `def-${uid()}`;
      this.blockPaths[name] = path;

      const basePt = ensure3D(block.basePoint as number[] | undefined);
      const children: Record<string, string> = {};

      // Convert block entities
      for (const ent of block.entities ?? []) {
        const entPath = `e-${uid()}`;
        const entNode = this.entityToNode(ent as Record<string, unknown>, entPath);
        if (entNode) {
          this.nodes.push(entNode);
          const childKey = String((ent as Record<string, unknown>).handle ?? uid());
          children[childKey] = entPath;
        }
      }

      const node: V2Node = {
        path,
        children,
        attributes: {
          'ifcx::purpose': 'definition',
          'ifcx::component::definition': {
            name,
            basePoint: basePt,
          },
        },
      };
      this.nodes.push(node);
      definitionsNode.children![name] = path;
    }
  }

  // .......................................................................
  // Entities
  // .......................................................................

  private convertEntities(viewNode: V2Node): void {
    for (const ent of this.doc.entities) {
      const path = `e-${uid()}`;
      const node = this.entityToNode(ent as Record<string, unknown>, path);
      if (node) {
        this.nodes.push(node);
        const childKey = String((ent as Record<string, unknown>).handle ?? path);
        viewNode.children![childKey] = path;
      }
    }
  }

  private entityToNode(ent: Record<string, unknown>, path: string): V2Node | null {
    const etype = String(ent.type ?? '');
    const attrs: Record<string, unknown> = { 'ifcx::purpose': 'drawing' };
    let inherits: string[] | undefined;

    // -- geometry mapping ------------------------------------------------
    if (etype === 'LINE') {
      const start = ensure3D(ent.start as number[] | undefined);
      const end = ensure3D(ent.end as number[] | undefined);
      attrs['ifcx::geom::line'] = { points: [start, end] };

    } else if (etype === 'CIRCLE') {
      attrs['ifcx::geom::circle'] = {
        center: ensure3D(ent.center as number[] | undefined),
        radius: ent.radius ?? 0,
      };

    } else if (etype === 'ARC') {
      attrs['ifcx::geom::trimmedCurve'] = {
        center: ensure3D(ent.center as number[] | undefined),
        radius: ent.radius ?? 0,
        startAngle: ent.startAngle ?? 0,
        endAngle: ent.endAngle ?? 0,
      };

    } else if (etype === 'ELLIPSE') {
      const center = ensure3D(ent.center as number[] | undefined);
      const semi1 = ent.semiAxis1 ?? ent.majorAxis ?? 0;
      const semi2 = ent.semiAxis2 ?? ent.minorAxis ?? 0;
      const rotation = ent.rotation ?? 0;
      attrs['ifcx::geom::ellipse'] = {
        center,
        semiAxis1: semi1,
        semiAxis2: semi2,
        rotation,
      };

    } else if (etype === 'SPLINE') {
      const bspline: Record<string, unknown> = {};
      if (ent.degree !== undefined) bspline['degree'] = ent.degree;
      if (ent.controlPoints) {
        bspline['controlPoints'] = (ent.controlPoints as number[][]).map(p => ensure3D(p));
      } else if (ent.vertices) {
        bspline['controlPoints'] = (ent.vertices as number[][]).map(p => ensure3D(p));
      }
      if (ent.knots) bspline['knots'] = ent.knots;
      if (ent.weights) bspline['weights'] = ent.weights;
      attrs['ifcx::geom::bspline'] = bspline;

    } else if (etype === 'LWPOLYLINE') {
      const verts = ent.vertices as Array<Record<string, unknown>> | number[][] | undefined;
      const closed = Boolean(ent.closed);
      const bulges = ent.bulges as number[] | undefined;

      // Extract vertex coordinates - handle both {x,y} objects and [x,y] arrays
      const vertCoords = (verts ?? []).map((v: unknown) => {
        if (Array.isArray(v)) return v as number[];
        const obj = v as Record<string, number>;
        return [obj.x ?? 0, obj.y ?? 0, obj.z ?? 0];
      });

      // Extract bulges from vertex objects if not provided separately
      let bulgeValues = bulges ?? [];
      if (!bulges && verts) {
        bulgeValues = (verts as Array<Record<string, unknown>>).map(
          (v: unknown) => {
            if (Array.isArray(v)) return 0;
            return ((v as Record<string, number>).bulge ?? 0);
          }
        );
      }

      const hasBulge = bulgeValues.length > 0 && bulgeValues.some(b => b !== 0);
      if (hasBulge) {
        const segments = V2Converter.lwpolyToSegments(vertCoords, bulgeValues, closed);
        attrs['ifcx::geom::compositeCurve'] = {
          segments,
          closed,
        };
      } else {
        attrs['ifcx::geom::polyline'] = {
          points: vertCoords.map(v => ensure3D(v)),
          closed,
        };
      }

    } else if (etype === 'POLYLINE2D' || etype === 'POLYLINE3D') {
      const verts = ent.vertices as number[][] | undefined;
      const closed = Boolean(ent.closed);
      attrs['ifcx::geom::polyline'] = {
        points: (verts ?? []).map(v => ensure3D(v)),
        closed,
      };

    } else if (etype === 'TEXT') {
      const textVal: Record<string, unknown> = {
        value: ent.text ?? '',
      };
      if (ent.insertionPoint !== undefined) {
        textVal['placement'] = ensure3D(ent.insertionPoint as number[]);
      }
      if (ent.height !== undefined) textVal['height'] = ent.height;
      if (ent.rotation !== undefined) {
        textVal['style'] = { rotation: ent.rotation };
      }
      if (ent.horizontalAlignment !== undefined) {
        textVal['alignment'] = ent.horizontalAlignment;
      }
      // Link text style if present
      const ts = ent.style as string | undefined;
      if (ts && this.stylePaths[`text:${ts}`]) {
        attrs['ifcx::connects::style'] = { ref: this.stylePaths[`text:${ts}`] };
      }
      attrs['ifcx::annotation::text'] = textVal;

    } else if (etype === 'MTEXT') {
      const textVal: Record<string, unknown> = {
        value: ent.text ?? '',
      };
      if (ent.insertionPoint !== undefined) {
        textVal['placement'] = ensure3D(ent.insertionPoint as number[]);
      }
      if (ent.height !== undefined) textVal['height'] = ent.height;
      if (ent.width !== undefined) textVal['width'] = ent.width;
      if (ent.attachment !== undefined) textVal['attachment'] = ent.attachment;
      const ts = ent.style as string | undefined;
      if (ts && this.stylePaths[`text:${ts}`]) {
        attrs['ifcx::connects::style'] = { ref: this.stylePaths[`text:${ts}`] };
      }
      attrs['ifcx::annotation::text'] = textVal;

    } else if (etype.startsWith('DIMENSION')) {
      const dimVal: Record<string, unknown> = {};
      const subtypeMap: Record<string, string> = {
        DIMENSION_LINEAR: 'linear',
        DIMENSION_ALIGNED: 'aligned',
        DIMENSION_ANGULAR: 'angular',
        DIMENSION_ANGULAR3P: 'angular',
        DIMENSION_DIAMETER: 'diameter',
        DIMENSION_RADIUS: 'radius',
        DIMENSION_ORDINATE: 'ordinate',
        DIMENSION: 'linear',
      };
      dimVal['subtype'] = subtypeMap[etype] ?? 'linear';

      // Collect measure points
      const measurePts: number[][] = [];
      if (ent.defPoint1 !== undefined) measurePts.push(ensure3D(ent.defPoint1 as number[]));
      if (ent.defPoint2 !== undefined) measurePts.push(ensure3D(ent.defPoint2 as number[]));
      if (measurePts.length > 0) dimVal['measurePoints'] = measurePts;

      if (ent.dimLine !== undefined) dimVal['dimensionLine'] = ensure3D(ent.dimLine as number[]);
      if (ent.text !== undefined) dimVal['text'] = ent.text;
      if (ent.measurement !== undefined) dimVal['value'] = ent.measurement;

      // Link dim style
      const ds = ent.dimStyle as string | undefined;
      if (ds && this.stylePaths[`dim:${ds}`]) {
        attrs['ifcx::connects::style'] = { ref: this.stylePaths[`dim:${ds}`] };
      }
      attrs['ifcx::annotation::dimension'] = dimVal;

    } else if (etype === 'LEADER') {
      const leaderVal: Record<string, unknown> = {};
      if (ent.vertices) {
        leaderVal['path'] = (ent.vertices as number[][]).map(v => ensure3D(v));
      }
      leaderVal['arrowhead'] = ent.hasArrowhead ?? true;
      attrs['ifcx::annotation::leader'] = leaderVal;

    } else if (etype === 'HATCH') {
      const hatchType = ent.patternType as string | undefined;
      if (ent.solid || hatchType === 'SOLID') {
        const fill: Record<string, unknown> = {};
        if (ent.color !== undefined) {
          const colour = aciToRgb(ent.color);
          if (colour) fill['colour'] = colour;
        }
        attrs['ifcx::hatch::solid'] = fill;
      } else {
        const pattern: Record<string, unknown> = {};
        if (ent.patternName !== undefined) pattern['name'] = ent.patternName;
        if (ent.patternAngle !== undefined) pattern['angle'] = ent.patternAngle;
        if (ent.patternScale !== undefined) pattern['scale'] = ent.patternScale;
        attrs['ifcx::hatch::pattern'] = pattern;
      }
      // Boundary
      if (ent.boundary !== undefined) {
        attrs['ifcx::hatch::boundary'] = ent.boundary;
      }

    } else if (etype === 'INSERT') {
      const blockName = (ent.name ?? ent.blockName ?? '') as string;
      if (blockName && this.blockPaths[blockName]) {
        inherits = [this.blockPaths[blockName]];
      }
      const insertPt = ensure3D(ent.insertionPoint as number[] | undefined);
      const xScale = (ent.xScale ?? ent.scaleX ?? 1.0) as number;
      const yScale = (ent.yScale ?? ent.scaleY ?? 1.0) as number;
      const zScale = (ent.zScale ?? ent.scaleZ ?? 1.0) as number;
      const rotation = (ent.rotation ?? 0.0) as number;

      const matrix = buildInsertMatrix(insertPt, xScale, yScale, zScale, rotation);
      attrs['ifcx::xform::matrix'] = matrix;

    } else if (etype === 'SOLID' || etype === 'TRACE') {
      const points: number[][] = [];
      for (const key of ['p1', 'p2', 'p3', 'p4']) {
        if (ent[key] !== undefined) points.push(ensure3D(ent[key] as number[]));
      }
      if (points.length === 0 && ent.vertices) {
        for (const v of ent.vertices as number[][]) {
          points.push(ensure3D(v));
        }
      }
      attrs['ifcx::geom::polygon'] = { points };

    } else if (etype === '3DFACE') {
      const points: number[][] = [];
      for (const key of ['p1', 'p2', 'p3', 'p4']) {
        if (ent[key] !== undefined) points.push(ensure3D(ent[key] as number[]));
      }
      if (points.length === 0 && ent.vertices) {
        for (const v of ent.vertices as number[][]) {
          points.push(ensure3D(v));
        }
      }
      attrs['ifcx::geom::polygon'] = { points };

    } else if (etype === 'VIEWPORT') {
      const vp: Record<string, unknown> = {};
      if (ent.center !== undefined) {
        const c = ensure3D(ent.center as number[]);
        vp['center'] = [c[0], c[1]];
      }
      if (ent.width !== undefined) vp['width'] = ent.width;
      if (ent.height !== undefined) vp['height'] = ent.height;
      if (ent.viewTarget !== undefined) vp['viewTarget'] = ensure3D(ent.viewTarget as number[]);
      if (ent.viewScale !== undefined || ent.customScale !== undefined) {
        vp['viewScale'] = ent.viewScale ?? ent.customScale ?? 1.0;
      }
      attrs['ifcx::sheet::viewport'] = vp;

    } else if (etype === 'POINT') {
      const pos = ensure3D((ent.position ?? ent.insertionPoint ?? [0, 0, 0]) as number[]);
      attrs['ifcx::geom::point'] = { position: pos };

    } else if (etype === 'RAY') {
      attrs['ifcx::geom::ray'] = {
        origin: ensure3D((ent.origin ?? ent.start ?? [0, 0, 0]) as number[]),
        direction: ensure3D((ent.direction ?? [1, 0, 0]) as number[]),
      };

    } else if (etype === 'XLINE') {
      attrs['ifcx::geom::constructionLine'] = {
        origin: ensure3D((ent.origin ?? ent.start ?? [0, 0, 0]) as number[]),
        direction: ensure3D((ent.direction ?? [1, 0, 0]) as number[]),
      };

    } else if (etype === '3DSOLID' || etype === 'BODY' || etype === 'REGION') {
      const dataStr = (ent.acisData ?? ent.data ?? '') as string;
      attrs['ifcx::geom::solid'] = { data: dataStr };

    } else if (etype === 'MESH') {
      const meshVal: Record<string, unknown> = {};
      if (ent.vertices) {
        meshVal['points'] = (ent.vertices as number[][]).map(v => ensure3D(v));
      }
      if (ent.faces) meshVal['faceVertexIndices'] = ent.faces;
      attrs['ifcx::geom::mesh'] = meshVal;

    } else if (etype === 'IMAGE') {
      const img: Record<string, unknown> = {};
      if (ent.insertionPoint !== undefined) {
        img['insertionPoint'] = ensure3D(ent.insertionPoint as number[]);
      }
      if (ent.imageSize !== undefined) img['imageSize'] = ent.imageSize;
      if (ent.imagePath !== undefined) {
        const mediaId = uid();
        img['mediaId'] = mediaId;
        this.media[mediaId] = { path: ent.imagePath as string };
      }
      attrs['ifcx::image::raster'] = img;

    } else if (etype === 'WIPEOUT') {
      let boundary: number[][] = [];
      if (ent.boundary) {
        boundary = (ent.boundary as number[][]).map(p => ensure3D(p));
      } else if (ent.vertices) {
        boundary = (ent.vertices as number[][]).map(p => ensure3D(p));
      }
      attrs['ifcx::image::wipeout'] = { boundary };

    } else if (etype === 'TEXT_NODE') {
      // DGN-specific
      const textVal: Record<string, unknown> = { value: '' };
      if (ent.origin !== undefined) textVal['placement'] = ensure3D(ent.origin as number[]);
      if (ent.height !== undefined) textVal['height'] = ent.height;
      attrs['ifcx::annotation::text'] = textVal;

    } else if (etype === 'COMPLEX_CHAIN' || etype === 'COMPLEX_SHAPE') {
      attrs['ifcx::geom::compositeCurve'] = {
        segments: [],
        closed: etype === 'COMPLEX_SHAPE',
      };

    } else if (etype === '3DSURFACE') {
      attrs['ifcx::geom::solid'] = { data: '' };

    } else if (etype === 'BSPLINE_CURVE') {
      attrs['ifcx::geom::bspline'] = {};

    } else if (etype === 'BSPLINE_POLE') {
      const verts = ent.vertices as number[][] | undefined;
      attrs['ifcx::geom::bspline'] = {
        controlPoints: (verts ?? []).map(v => ensure3D(v)),
      };

    } else {
      // Unknown entity -- store raw type for round-tripping
      const data: Record<string, unknown> = {};
      const skipKeys = new Set(['type', 'handle', 'layer', 'color', 'linetype', 'lineweight', 'style']);
      for (const [k, v] of Object.entries(ent)) {
        if (!skipKeys.has(k)) data[k] = v;
      }
      attrs['ifcx::unknown::entity'] = { originalType: etype, data };
    }

    // -- connections (layer, style) --------------------------------------
    const layerName = (ent.layer ?? '0') as string;
    if (this.layerPaths[layerName]) {
      attrs['ifcx::connects::layer'] = { ref: this.layerPaths[layerName] };
    }

    // Curve style from entity-level overrides
    const curveStyle: Record<string, unknown> = {};
    if (ent.color !== undefined) {
      const colour = aciToRgb(ent.color);
      if (colour) curveStyle['colour'] = colour;
    }
    if (ent.lineweight !== undefined) {
      curveStyle['width'] = ent.lineweight;
    }
    if (ent.linetype && typeof ent.linetype === 'string') {
      const lt = ent.linetype;
      if (this.stylePaths[`lt:${lt}`]) {
        const existing = (attrs['ifcx::connects::style'] ?? {}) as Record<string, unknown>;
        existing['ref'] = this.stylePaths[`lt:${lt}`];
        attrs['ifcx::connects::style'] = existing;
      } else {
        curveStyle['pattern'] = lt;
      }
    }
    if (Object.keys(curveStyle).length > 0) {
      attrs['ifcx::style::curveStyle'] = curveStyle;
    }

    // Build node
    const node: V2Node = { path, attributes: attrs };
    if (inherits) node.inherits = inherits;
    return node;
  }

  // .......................................................................
  // LWPOLYLINE bulge -> segments
  // .......................................................................

  static lwpolyToSegments(
    verts: number[][],
    bulges: number[],
    closed: boolean,
  ): Record<string, unknown>[] {
    const segments: Record<string, unknown>[] = [];
    const n = verts.length;
    if (n === 0) return segments;

    // Pad bulges to match verts
    const bulgesPadded = [...bulges];
    while (bulgesPadded.length < n) bulgesPadded.push(0.0);

    const count = closed ? n : n - 1;
    for (let i = 0; i < count; i++) {
      const p1 = ensure3D(verts[i]);
      const p2 = ensure3D(verts[(i + 1) % n]);
      const bulge = bulgesPadded[i];

      if (Math.abs(bulge) < 1e-10) {
        segments.push({ type: 'line', points: [p1, p2] });
      } else {
        // Bulge -> arc
        const dx = p2[0] - p1[0];
        const dy = p2[1] - p1[1];
        const chord = Math.hypot(dx, dy);
        if (chord < 1e-12) {
          segments.push({ type: 'line', points: [p1, p2] });
          continue;
        }
        const sagitta = Math.abs(bulge) * chord / 2.0;
        const radius = (chord * chord / 4.0 + sagitta * sagitta) / (2.0 * sagitta);

        // midpoint and perpendicular
        const mx = (p1[0] + p2[0]) / 2.0;
        const my = (p1[1] + p2[1]) / 2.0;
        const nx = -dy / chord;
        const ny = dx / chord;
        const d = radius - sagitta;
        const sign = bulge > 0 ? 1.0 : -1.0;
        const cx = mx + sign * d * nx;
        const cy = my + sign * d * ny;

        const startAngle = Math.atan2(p1[1] - cy, p1[0] - cx);
        const endAngle = Math.atan2(p2[1] - cy, p2[0] - cx);

        segments.push({
          type: 'arc',
          center: [cx, cy, 0.0],
          radius,
          startAngle,
          endAngle,
        });
      }
    }

    return segments;
  }
}
