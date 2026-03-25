/**
 * V2 (IFC5 node-based) to V1 (DXF-style IfcxDocument) converter.
 *
 * Converts the v2 node graph back into the flat entity-list format that the
 * existing DXF exporter (DxfExporter) understands. The typical export path
 * is: v2 dict -> V2Export.toV1() -> DxfExporter.toFile().
 */

import { IfcxDocument } from '../document.js';
import type { Entity, Layer, TextStyle, BlockDefinition } from '../types.js';
import type { V2Document, V2Node } from './v2-converter.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

interface RGBColor {
  r: number;
  g: number;
  b: number;
}

const ACI_TABLE: Array<[number, number, number, number]> = [
  [1, 1.0, 0.0, 0.0],
  [2, 1.0, 1.0, 0.0],
  [3, 0.0, 1.0, 0.0],
  [4, 0.0, 1.0, 1.0],
  [5, 0.0, 0.0, 1.0],
  [6, 1.0, 0.0, 1.0],
  [7, 1.0, 1.0, 1.0],
  [8, 0.5, 0.5, 0.5],
  [9, 0.75, 0.75, 0.75],
];

function rgbToAci(rgb: RGBColor | null | undefined): number {
  if (!rgb) return 7;
  const { r, g, b } = rgb;
  let bestAci = 7;
  let bestDist = Infinity;
  for (const [aci, cr, cg, cb] of ACI_TABLE) {
    const d = (r - cr) ** 2 + (g - cg) ** 2 + (b - cb) ** 2;
    if (d < bestDist) {
      bestDist = d;
      bestAci = aci;
    }
  }
  return bestAci;
}

const UNIT_MAP: Record<string, string> = {
  mm: 'millimeters',
  cm: 'centimeters',
  m: 'meters',
  km: 'kilometers',
  in: 'inches',
  ft: 'feet',
  mi: 'miles',
};

// ---------------------------------------------------------------------------
// V2Export
// ---------------------------------------------------------------------------

export class V2Export {
  /**
   * Convert a v2 IFC5-node document back to a v1 IfcxDocument.
   */
  static toV1(v2: V2Document): IfcxDocument {
    const conv = new V2Export(v2);
    conv.convert();
    return conv.doc;
  }

  // ----- internals --------------------------------------------------------

  private v2: V2Document;
  private doc: IfcxDocument;
  private nodesByPath: Record<string, V2Node> = {};
  private layers: Record<string, Record<string, unknown>> = {};  // path -> layer props
  private layerNameByPath: Record<string, string> = {};
  private styles: Record<string, Record<string, unknown>> = {};  // path -> style dict
  private definitions: Record<string, V2Node> = {};              // path -> block node

  private constructor(v2: V2Document) {
    this.v2 = v2;
    this.doc = new IfcxDocument();
  }

  private convert(): void {
    // Index all nodes by path
    for (const node of this.v2.data ?? []) {
      const path = node.path ?? '';
      if (path) {
        this.nodesByPath[path] = node;
      }
    }

    // Reconstruct header
    this.convertHeader();

    // First pass: extract layers, styles, definitions
    for (const node of this.v2.data ?? []) {
      const attrs = node.attributes ?? {};
      const path = node.path ?? '';

      if (attrs['ifcx::layer::assignment']) {
        const assignment = attrs['ifcx::layer::assignment'] as Record<string, unknown>;
        const name = (assignment.name ?? path) as string;
        this.layerNameByPath[path] = name;
        const layerProps: Layer = {};
        const ls = (attrs['ifcx::layer::style'] ?? {}) as Record<string, unknown>;
        if (ls['colour']) {
          layerProps.color = rgbToAci(ls['colour'] as RGBColor);
        }
        if (ls['lineWeight'] !== undefined) {
          layerProps.lineweight = Math.round((ls['lineWeight'] as number) * 100);
        }
        if (ls['frozen'] !== undefined) {
          layerProps.frozen = ls['frozen'] as boolean;
        }
        if (ls['locked'] !== undefined) {
          layerProps.locked = ls['locked'] as boolean;
        }
        if (ls['visible'] !== undefined) {
          layerProps.off = !(ls['visible'] as boolean);
        }
        if (ls['plot'] !== undefined) {
          layerProps.plot = ls['plot'] as boolean;
        }
        this.layers[path] = layerProps as Record<string, unknown>;
        this.doc.addLayer(name, layerProps);
      }

      if (attrs['ifcx::style::textStyle']) {
        this.styles[path] = attrs['ifcx::style::textStyle'] as Record<string, unknown>;
      }

      if (attrs['ifcx::style::curveStyle'] && !attrs['ifcx::layer::assignment']) {
        this.styles[path] = attrs['ifcx::style::curveStyle'] as Record<string, unknown>;
      }

      if (attrs['ifcx::component::definition']) {
        this.definitions[path] = node;
      }
    }

    // Convert text styles
    for (const [path, style] of Object.entries(this.styles)) {
      if ('font' in style) {
        const name = path.includes('-') ? path.split('-').slice(1).join('-') : path;
        const props: TextStyle = {};
        if (style['font']) props.fontFamily = style['font'] as string;
        if (style['size'] !== undefined) props.height = style['size'] as number;
        if (style['widthFactor'] !== undefined) props.widthFactor = style['widthFactor'] as number;
        this.doc.addTextStyle(name, props);
      }
    }

    // Convert blocks (definitions)
    for (const [path, defNode] of Object.entries(this.definitions)) {
      const comp = ((defNode.attributes ?? {})['ifcx::component::definition'] ?? {}) as Record<string, unknown>;
      const name = (comp.name ?? path) as string;
      const basePt = (comp.basePoint ?? [0, 0, 0]) as [number, number, number];
      const blockEntities: Entity[] = [];
      const children = defNode.children ?? {};
      for (const childPath of Object.values(children)) {
        const childNode = this.nodesByPath[childPath];
        if (childNode) {
          const ent = this.nodeToEntity(childNode);
          if (ent) blockEntities.push(ent);
        }
      }
      const block: BlockDefinition = {
        name,
        basePoint: basePt,
        entities: blockEntities,
      };
      this.doc.addBlock(block);
    }

    // Convert entity nodes -- walk views and collect elements
    let foundView = false;
    for (const node of this.v2.data ?? []) {
      const attrs = node.attributes ?? {};
      if (attrs['ifcx::view::name'] !== undefined) {
        foundView = true;
        const children = node.children ?? {};
        for (const childPath of Object.values(children)) {
          const childNode = this.nodesByPath[childPath];
          if (childNode) {
            const ent = this.nodeToEntity(childNode);
            if (ent) this.doc.addEntity(ent);
          }
        }
      }
    }

    // If no views found, scan all data nodes for geometry
    if (!foundView || this.doc.entities.length === 0) {
      for (const node of this.v2.data ?? []) {
        const ent = this.nodeToEntity(node);
        if (ent) this.doc.addEntity(ent);
      }
    }
  }

  private convertHeader(): void {
    const header = this.v2.header ?? {};
    const units = header.units ?? { length: 'mm', angle: 'rad' };
    const length = units.length ?? 'mm';
    this.doc.header = {
      units: {
        linear: (UNIT_MAP[length] ?? 'millimeters') as 'millimeters',
        measurement: 'metric',
      },
    };
  }

  private nodeToEntity(node: V2Node): Entity | null {
    const attrs = node.attributes ?? {};
    const result: Record<string, unknown> = {};

    // Resolve layer from connection
    const layerConn = attrs['ifcx::connects::layer'] as Record<string, unknown> | undefined;
    const layerRef = layerConn?.ref as string | undefined;
    if (layerRef && this.layerNameByPath[layerRef]) {
      result['layer'] = this.layerNameByPath[layerRef];
    }

    // Entity-level curve style
    const cs = (attrs['ifcx::style::curveStyle'] ?? {}) as Record<string, unknown>;
    if (cs['colour']) {
      result['color'] = rgbToAci(cs['colour'] as RGBColor);
    }
    if (cs['width'] !== undefined) {
      result['lineweight'] = cs['width'];
    }
    if (cs['pattern'] && typeof cs['pattern'] === 'string') {
      result['linetype'] = cs['pattern'];
    }

    // --- Geometry attributes -> entity type ---

    if (attrs['ifcx::geom::line']) {
      result['type'] = 'LINE';
      const g = attrs['ifcx::geom::line'] as Record<string, unknown>;
      const pts = (g.points ?? []) as number[][];
      if (pts.length >= 2) {
        result['start'] = [...pts[0]];
        result['end'] = [...pts[1]];
      }
      return result as unknown as Entity;
    }

    if (attrs['ifcx::geom::circle']) {
      result['type'] = 'CIRCLE';
      const g = attrs['ifcx::geom::circle'] as Record<string, unknown>;
      result['center'] = [...((g.center ?? [0, 0, 0]) as number[])];
      result['radius'] = g.radius ?? 0;
      return result as unknown as Entity;
    }

    if (attrs['ifcx::geom::trimmedCurve']) {
      result['type'] = 'ARC';
      const g = attrs['ifcx::geom::trimmedCurve'] as Record<string, unknown>;
      result['center'] = [...((g.center ?? [0, 0, 0]) as number[])];
      result['radius'] = g.radius ?? 0;
      result['startAngle'] = g.startAngle ?? 0;
      result['endAngle'] = g.endAngle ?? 0;
      return result as unknown as Entity;
    }

    if (attrs['ifcx::geom::ellipse']) {
      result['type'] = 'ELLIPSE';
      const g = attrs['ifcx::geom::ellipse'] as Record<string, unknown>;
      result['center'] = [...((g.center ?? [0, 0, 0]) as number[])];
      result['semiAxis1'] = g.semiAxis1 ?? 0;
      result['semiAxis2'] = g.semiAxis2 ?? 0;
      result['rotation'] = g.rotation ?? 0;
      return result as unknown as Entity;
    }

    if (attrs['ifcx::geom::bspline']) {
      result['type'] = 'SPLINE';
      const g = attrs['ifcx::geom::bspline'] as Record<string, unknown>;
      if (g.degree !== undefined) result['degree'] = g.degree;
      if (g.controlPoints) result['controlPoints'] = g.controlPoints;
      if (g.knots) result['knots'] = g.knots;
      if (g.weights) result['weights'] = g.weights;
      return result as unknown as Entity;
    }

    if (attrs['ifcx::geom::compositeCurve']) {
      result['type'] = 'LWPOLYLINE';
      const g = attrs['ifcx::geom::compositeCurve'] as Record<string, unknown>;
      result['closed'] = g.closed ?? false;
      // Reconstruct vertices and bulges from segments
      const [verts, bulges] = V2Export.segmentsToLwpoly(
        (g.segments ?? []) as Record<string, unknown>[],
      );
      result['vertices'] = verts;
      if (bulges.some(b => b !== 0)) {
        result['bulges'] = bulges;
      }
      return result as unknown as Entity;
    }

    if (attrs['ifcx::geom::polyline']) {
      result['type'] = 'LWPOLYLINE';
      const g = attrs['ifcx::geom::polyline'] as Record<string, unknown>;
      result['closed'] = g.closed ?? false;
      result['vertices'] = g.points ?? [];
      return result as unknown as Entity;
    }

    if (attrs['ifcx::geom::polygon']) {
      const g = attrs['ifcx::geom::polygon'] as Record<string, unknown>;
      const pts = (g.points ?? []) as number[][];
      result['type'] = pts.length <= 4 ? 'SOLID' : '3DFACE';
      for (let i = 0; i < Math.min(pts.length, 4); i++) {
        result[`p${i + 1}`] = [...pts[i]];
      }
      return result as unknown as Entity;
    }

    if (attrs['ifcx::geom::point']) {
      result['type'] = 'POINT';
      const g = attrs['ifcx::geom::point'] as Record<string, unknown>;
      result['position'] = [...((g.position ?? [0, 0, 0]) as number[])];
      return result as unknown as Entity;
    }

    if (attrs['ifcx::geom::ray']) {
      result['type'] = 'RAY';
      const g = attrs['ifcx::geom::ray'] as Record<string, unknown>;
      result['origin'] = [...((g.origin ?? [0, 0, 0]) as number[])];
      result['direction'] = [...((g.direction ?? [1, 0, 0]) as number[])];
      return result as unknown as Entity;
    }

    if (attrs['ifcx::geom::constructionLine']) {
      result['type'] = 'XLINE';
      const g = attrs['ifcx::geom::constructionLine'] as Record<string, unknown>;
      result['origin'] = [...((g.origin ?? [0, 0, 0]) as number[])];
      result['direction'] = [...((g.direction ?? [1, 0, 0]) as number[])];
      return result as unknown as Entity;
    }

    if (attrs['ifcx::geom::solid']) {
      result['type'] = '3DSOLID';
      const g = attrs['ifcx::geom::solid'] as Record<string, unknown>;
      result['acisData'] = g.data ?? '';
      return result as unknown as Entity;
    }

    if (attrs['ifcx::geom::mesh']) {
      result['type'] = 'MESH';
      const g = attrs['ifcx::geom::mesh'] as Record<string, unknown>;
      if (g.points) result['vertices'] = g.points;
      if (g.faceVertexIndices) result['faces'] = g.faceVertexIndices;
      return result as unknown as Entity;
    }

    if (attrs['ifcx::annotation::text']) {
      const g = attrs['ifcx::annotation::text'] as Record<string, unknown>;
      // Distinguish TEXT vs MTEXT by presence of "width"
      if (g.width !== undefined) {
        result['type'] = 'MTEXT';
      } else {
        result['type'] = 'TEXT';
      }
      result['text'] = g.value ?? '';
      if (g.placement) result['insertionPoint'] = [...(g.placement as number[])];
      if (g.height !== undefined) result['height'] = g.height;
      if (g.width !== undefined) result['width'] = g.width;
      if (g.attachment !== undefined) result['attachment'] = g.attachment;
      if (g.alignment !== undefined) result['horizontalAlignment'] = g.alignment;
      if (g.style && typeof g.style === 'object') {
        const style = g.style as Record<string, unknown>;
        if (style.rotation !== undefined) result['rotation'] = style.rotation;
      }
      return result as unknown as Entity;
    }

    if (attrs['ifcx::annotation::dimension']) {
      const g = attrs['ifcx::annotation::dimension'] as Record<string, unknown>;
      const subtype = (g.subtype ?? 'linear') as string;
      const typeMap: Record<string, string> = {
        linear: 'DIMENSION_LINEAR',
        aligned: 'DIMENSION_ALIGNED',
        angular: 'DIMENSION_ANGULAR',
        diameter: 'DIMENSION_DIAMETER',
        radius: 'DIMENSION_RADIUS',
        ordinate: 'DIMENSION_ORDINATE',
      };
      result['type'] = typeMap[subtype] ?? 'DIMENSION_LINEAR';
      const pts = (g.measurePoints ?? []) as number[][];
      if (pts.length >= 1) result['defPoint1'] = [...pts[0]];
      if (pts.length >= 2) result['defPoint2'] = [...pts[1]];
      if (g.dimensionLine) result['dimLine'] = [...(g.dimensionLine as number[])];
      if (g.text !== undefined) result['text'] = g.text;
      if (g.value !== undefined) result['measurement'] = g.value;
      return result as unknown as Entity;
    }

    if (attrs['ifcx::annotation::leader']) {
      result['type'] = 'LEADER';
      const g = attrs['ifcx::annotation::leader'] as Record<string, unknown>;
      if (g.path) result['vertices'] = g.path;
      result['hasArrowhead'] = g.arrowhead ?? true;
      return result as unknown as Entity;
    }

    if (attrs['ifcx::hatch::solid'] || attrs['ifcx::hatch::pattern']) {
      result['type'] = 'HATCH';
      if (attrs['ifcx::hatch::solid']) {
        result['solid'] = true;
        const s = attrs['ifcx::hatch::solid'] as Record<string, unknown>;
        if (s['colour']) {
          result['color'] = rgbToAci(s['colour'] as RGBColor);
        }
      } else {
        result['solid'] = false;
        const p = attrs['ifcx::hatch::pattern'] as Record<string, unknown>;
        if (p['name'] !== undefined) result['patternName'] = p['name'];
        if (p['angle'] !== undefined) result['patternAngle'] = p['angle'];
        if (p['scale'] !== undefined) result['patternScale'] = p['scale'];
      }
      if (attrs['ifcx::hatch::boundary']) {
        result['boundary'] = attrs['ifcx::hatch::boundary'];
      }
      return result as unknown as Entity;
    }

    if (attrs['ifcx::sheet::viewport']) {
      result['type'] = 'VIEWPORT';
      const g = attrs['ifcx::sheet::viewport'] as Record<string, unknown>;
      if (g.center) result['center'] = [...(g.center as number[])];
      if (g.width !== undefined) result['width'] = g.width;
      if (g.height !== undefined) result['height'] = g.height;
      if (g.viewTarget) result['viewTarget'] = [...(g.viewTarget as number[])];
      if (g.viewScale !== undefined) result['viewScale'] = g.viewScale;
      return result as unknown as Entity;
    }

    if (attrs['ifcx::image::raster']) {
      result['type'] = 'IMAGE';
      const g = attrs['ifcx::image::raster'] as Record<string, unknown>;
      if (g.insertionPoint) result['insertionPoint'] = [...(g.insertionPoint as number[])];
      const media = this.v2.media ?? {};
      const mid = (g.mediaId ?? '') as string;
      if (mid && media[mid]) {
        result['imagePath'] = media[mid].path ?? '';
      }
      return result as unknown as Entity;
    }

    if (attrs['ifcx::image::wipeout']) {
      result['type'] = 'WIPEOUT';
      const g = attrs['ifcx::image::wipeout'] as Record<string, unknown>;
      result['boundary'] = g.boundary ?? [];
      return result as unknown as Entity;
    }

    // INSERT via inherits
    const inherits = node.inherits ?? [];
    if (inherits.length > 0 && attrs['ifcx::xform::matrix']) {
      result['type'] = 'INSERT';
      // Find block name from definition
      const defPath = inherits[0];
      const defNode = this.nodesByPath[defPath] ?? {};
      const comp = ((defNode.attributes ?? {})['ifcx::component::definition'] ?? {}) as Record<string, unknown>;
      result['name'] = comp.name ?? defPath;
      // Decompose matrix
      const matrix = attrs['ifcx::xform::matrix'] as number[][];
      result['insertionPoint'] = [matrix[3][0], matrix[3][1], matrix[3][2]];
      // Extract scale and rotation from the matrix
      const sx = Math.hypot(matrix[0][0], matrix[0][1]);
      const sy = Math.hypot(matrix[1][0], matrix[1][1]);
      const sz = matrix[2][2];
      const rotation = Math.atan2(matrix[0][1], matrix[0][0]);
      result['xScale'] = sx;
      result['yScale'] = sy;
      result['zScale'] = sz;
      result['rotation'] = rotation;
      return result as unknown as Entity;
    }

    if (attrs['ifcx::unknown::entity']) {
      const g = attrs['ifcx::unknown::entity'] as Record<string, unknown>;
      result['type'] = g.originalType ?? 'UNKNOWN';
      const data = (g.data ?? {}) as Record<string, unknown>;
      Object.assign(result, data);
      return result as unknown as Entity;
    }

    // Not a convertible geometry/annotation node
    return null;
  }

  // .......................................................................
  // Composite curve segments -> LWPOLYLINE vertices + bulges
  // .......................................................................

  static segmentsToLwpoly(
    segments: Record<string, unknown>[],
  ): [number[][], number[]] {
    const verts: number[][] = [];
    const bulges: number[] = [];

    for (const seg of segments) {
      const stype = (seg.type ?? 'line') as string;
      if (stype === 'line') {
        const pts = (seg.points ?? []) as number[][];
        if (pts.length > 0) {
          if (verts.length === 0) {
            verts.push([...pts[0]]);
            bulges.push(0.0);
          }
          if (pts.length > 1) {
            // The start should match the last vertex
            verts.push([...pts[pts.length - 1]]);
            // Update the bulge of the *previous* vertex
            bulges[bulges.length - 1] = 0.0;
            bulges.push(0.0);
          }
        }
      } else if (stype === 'arc') {
        const center = (seg.center ?? [0, 0, 0]) as number[];
        const radius = (seg.radius ?? 0) as number;
        const sa = (seg.startAngle ?? 0) as number;
        const ea = (seg.endAngle ?? 0) as number;
        const p1 = [
          center[0] + radius * Math.cos(sa),
          center[1] + radius * Math.sin(sa),
          0.0,
        ];
        const p2 = [
          center[0] + radius * Math.cos(ea),
          center[1] + radius * Math.sin(ea),
          0.0,
        ];

        // Calculate bulge
        let angle = ea - sa;
        if (angle < 0) angle += 2 * Math.PI;
        const bulge = Math.tan(angle / 4.0);

        if (verts.length === 0) {
          verts.push(p1);
          bulges.push(bulge);
        } else {
          bulges[bulges.length - 1] = bulge;
        }
        verts.push(p2);
        bulges.push(0.0);
      }
    }

    return [verts, bulges];
  }
}
