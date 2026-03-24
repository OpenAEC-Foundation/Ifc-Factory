/**
 * Core IFCX type definitions
 * Generated from schema/ifcx.schema.json
 */

// === Primitives ===

export type Point2D = [number, number];
export type Point3D = [number, number, number];
export type Handle = string;
export type EntityRef = string;

export type Color =
  | { r: number; g: number; b: number; a?: number }
  | number   // ACI color index
  | string;  // Named or hex color

// === Header ===

export interface Units {
  linear?: LinearUnit;
  linearFormat?: LinearFormat;
  linearPrecision?: number;
  angular?: AngularUnit;
  angularPrecision?: number;
  angularBase?: number;
  angularDirection?: 'ccw' | 'cw';
  measurement?: 'imperial' | 'metric';
}

export type LinearUnit =
  | 'unitless' | 'inches' | 'feet' | 'miles'
  | 'millimeters' | 'centimeters' | 'meters' | 'kilometers'
  | 'microinches' | 'mils' | 'yards' | 'angstroms'
  | 'nanometers' | 'microns' | 'decimeters' | 'decameters'
  | 'hectometers' | 'gigameters' | 'astronomical' | 'lightyears' | 'parsecs';

export type LinearFormat = 'scientific' | 'decimal' | 'engineering' | 'architectural' | 'fractional';
export type AngularUnit = 'decimal_degrees' | 'dms' | 'grads' | 'radians' | 'surveyor';

export interface Header {
  version?: string;
  codePage?: string;
  createDate?: string;
  updateDate?: string;
  totalEditTime?: number;
  author?: string;
  organization?: string;
  application?: string;
  units?: Units;
  extents?: { min: Point3D; max: Point3D };
  limits?: { min: Point2D; max: Point2D };
  currentLayer?: string;
  currentLinetype?: string;
  currentColor?: Color;
  currentTextStyle?: string;
  currentDimStyle?: string;
  linetypeScale?: number;
  elevation?: number;
  thickness?: number;
  fillMode?: boolean;
  orthoMode?: boolean;
  pointDisplayMode?: number;
  pointDisplaySize?: number;
  ucs?: { origin: Point3D; xAxis: Point3D; yAxis: Point3D };
  handleSeed?: Handle;
  variables?: Record<string, unknown>;
}

// === Tables ===

export interface Layer {
  color?: Color;
  linetype?: string;
  lineweight?: number;
  frozen?: boolean;
  locked?: boolean;
  off?: boolean;
  plot?: boolean;
  description?: string;
  transparency?: number;
}

export interface Linetype {
  description?: string;
  patternLength?: number;
  pattern?: number[];
  complexElements?: LinetypeElement[];
}

export interface LinetypeElement {
  type: 'shape' | 'text';
  style?: string;
  value?: string | number;
  scale?: number;
  rotation?: number;
  offset?: Point2D;
}

export interface TextStyle {
  fontFamily?: string;
  bigFont?: string;
  height?: number;
  widthFactor?: number;
  oblique?: number;
  isVertical?: boolean;
  isBackward?: boolean;
  isUpsideDown?: boolean;
  isTrueType?: boolean;
  bold?: boolean;
  italic?: boolean;
}

export interface DimStyle {
  overallScale?: number;
  linearScale?: number;
  arrowSize?: number;
  arrowBlock?: string;
  arrowBlock1?: string;
  arrowBlock2?: string;
  leaderArrowBlock?: string;
  textHeight?: number;
  textStyle?: string;
  textColor?: Color;
  textInsideAlign?: boolean;
  textOutsideAlign?: boolean;
  textAboveDimLine?: boolean;
  textGap?: number;
  dimLineColor?: Color;
  dimLineWeight?: number;
  dimLineExtension?: number;
  dimLineIncrement?: number;
  suppressDimLine1?: boolean;
  suppressDimLine2?: boolean;
  extLineColor?: Color;
  extLineWeight?: number;
  extLineOffset?: number;
  extLineExtension?: number;
  suppressExtLine1?: boolean;
  suppressExtLine2?: boolean;
  centerMarkSize?: number;
  linearUnit?: string;
  linearPrecision?: number;
  decimalSeparator?: string;
  prefix?: string;
  suffix?: string;
  tolerance?: DimTolerance;
  alternate?: DimAlternate;
  fit?: string;
  textJustification?: string;
}

export interface DimTolerance {
  enabled?: boolean;
  method?: 'none' | 'symmetrical' | 'deviation' | 'limits' | 'basic';
  upper?: number;
  lower?: number;
  precision?: number;
  verticalPosition?: 'top' | 'middle' | 'bottom';
  scaleFactor?: number;
}

export interface DimAlternate {
  enabled?: boolean;
  scaleFactor?: number;
  precision?: number;
  unit?: string;
  prefix?: string;
  suffix?: string;
}

export interface Tables {
  layers?: Record<string, Layer>;
  linetypes?: Record<string, Linetype>;
  textStyles?: Record<string, TextStyle>;
  dimStyles?: Record<string, DimStyle>;
  views?: Record<string, NamedView>;
  ucss?: Record<string, UCS>;
  viewports?: Record<string, ViewportConfig>;
  appIds?: string[];
}

export interface NamedView {
  center: Point2D;
  height: number;
  width: number;
  direction?: Point3D;
  target?: Point3D;
  lensLength?: number;
  twist?: number;
}

export interface UCS {
  origin: Point3D;
  xAxis: Point3D;
  yAxis: Point3D;
}

export interface ViewportConfig {
  lowerLeft?: Point2D;
  upperRight?: Point2D;
  center?: Point2D;
  height?: number;
  aspectRatio?: number;
  direction?: Point3D;
  target?: Point3D;
}

// === Common Entity Properties ===

export interface CommonEntityProps {
  handle?: Handle;
  layer?: string;
  linetype?: string;
  linetypeScale?: number;
  color?: Color;
  lineweight?: number;
  transparency?: number;
  visible?: boolean;
  space?: 'model' | 'paper';
  layoutRef?: EntityRef;
  ownerRef?: EntityRef;
  extrusion?: Point3D;
  thickness?: number;
  xdata?: Record<string, XDataItem[]>;
  extensionDict?: EntityRef;
  reactors?: EntityRef[];
}

export interface XDataItem {
  code: number;
  value: unknown;
}

// === Entity Types ===

export type Entity = CommonEntityProps & (
  | LineEntity | PointEntity | CircleEntity | ArcEntity
  | EllipseEntity | SplineEntity | RayEntity | XLineEntity
  | LWPolylineEntity | Polyline2DEntity | Polyline3DEntity
  | MLineEntity | HelixEntity
  | TextEntity | MTextEntity
  | DimensionLinearEntity | DimensionAlignedEntity
  | DimensionAngularEntity | DimensionRadiusEntity
  | DimensionDiameterEntity | DimensionOrdinateEntity
  | DimensionArcEntity
  | LeaderEntity | MultiLeaderEntity | ToleranceEntity
  | HatchEntity | SolidEntity | TraceEntity | Face3DEntity
  | InsertEntity | AttDefEntity | AttribEntity
  | ViewportEntity | ImageEntity | WipeoutEntity | TableEntity
  | Solid3DEntity | RegionEntity | BodyEntity | SurfaceEntity
  | MeshEntity | ShapeEntity | OleEntity | UnderlayEntity
  | LightEntity | CameraEntity | SectionEntity
  | GeoMarkerEntity | ProxyEntity
);

export interface LineEntity { type: 'LINE'; start: Point3D; end: Point3D }
export interface PointEntity { type: 'POINT'; position: Point3D; angle?: number }
export interface CircleEntity { type: 'CIRCLE'; center: Point3D; radius: number }
export interface ArcEntity { type: 'ARC'; center: Point3D; radius: number; startAngle: number; endAngle: number }
export interface EllipseEntity { type: 'ELLIPSE'; center: Point3D; majorAxisEndpoint: Point3D; minorAxisRatio: number; startParam?: number; endParam?: number }

export interface SplineEntity {
  type: 'SPLINE';
  degree: number;
  closed?: boolean;
  periodic?: boolean;
  rational?: boolean;
  planar?: boolean;
  knots?: number[];
  controlPoints?: Point3D[];
  weights?: number[];
  fitPoints?: Point3D[];
  startTangent?: Point3D;
  endTangent?: Point3D;
}

export interface RayEntity { type: 'RAY'; origin: Point3D; direction: Point3D }
export interface XLineEntity { type: 'XLINE'; origin: Point3D; direction: Point3D }

export interface LWPolylineVertex {
  x: number; y: number;
  startWidth?: number; endWidth?: number;
  bulge?: number;
}

export interface LWPolylineEntity {
  type: 'LWPOLYLINE';
  closed?: boolean;
  constantWidth?: number;
  elevation?: number;
  vertices: LWPolylineVertex[];
}

export interface Polyline2DEntity {
  type: 'POLYLINE2D';
  closed?: boolean;
  vertices: { position: Point3D; startWidth?: number; endWidth?: number; bulge?: number }[];
}

export interface Polyline3DEntity {
  type: 'POLYLINE3D';
  closed?: boolean;
  vertices: Point3D[];
}

export interface MLineEntity {
  type: 'MLINE';
  style?: string;
  scale?: number;
  justification?: 'top' | 'zero' | 'bottom';
  closed?: boolean;
  vertices: Point3D[];
}

export interface HelixEntity {
  type: 'HELIX';
  axisBasePoint: Point3D;
  axisTopPoint: Point3D;
  radius: number;
  topRadius?: number;
  turns?: number;
  height?: number;
}

export interface TextEntity {
  type: 'TEXT';
  text: string;
  insertionPoint: Point3D;
  height: number;
  alignmentPoint?: Point3D;
  widthFactor?: number;
  rotation?: number;
  oblique?: number;
  style?: string;
  horizontalAlignment?: 'left' | 'center' | 'right' | 'aligned' | 'middle' | 'fit';
  verticalAlignment?: 'baseline' | 'bottom' | 'middle' | 'top';
}

export interface MTextEntity {
  type: 'MTEXT';
  text: string;
  insertionPoint: Point3D;
  height: number;
  width?: number;
  rotation?: number;
  style?: string;
  attachment?: string;
  direction?: string;
  lineSpacingFactor?: number;
  richText?: RichTextSpan[];
}

export interface RichTextSpan {
  text: string;
  font?: string;
  height?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  overline?: boolean;
  color?: Color;
}

// Dimensions
export interface DimensionCommon {
  dimStyle?: string;
  overrideText?: string;
  textPosition?: Point3D;
  textRotation?: number;
  blockRef?: string;
  overrides?: Partial<DimStyle>;
}

export interface DimensionLinearEntity extends DimensionCommon {
  type: 'DIMENSION_LINEAR';
  defPoint1: Point3D; defPoint2: Point3D; dimLinePoint: Point3D;
  rotation?: number;
}

export interface DimensionAlignedEntity extends DimensionCommon {
  type: 'DIMENSION_ALIGNED';
  defPoint1: Point3D; defPoint2: Point3D; dimLinePoint: Point3D;
}

export interface DimensionAngularEntity extends DimensionCommon {
  type: 'DIMENSION_ANGULAR';
  center: Point3D; defPoint1: Point3D; defPoint2: Point3D; arcPoint: Point3D;
}

export interface DimensionRadiusEntity extends DimensionCommon {
  type: 'DIMENSION_RADIUS';
  center: Point3D; chordPoint: Point3D; leaderLength?: number;
}

export interface DimensionDiameterEntity extends DimensionCommon {
  type: 'DIMENSION_DIAMETER';
  center: Point3D; chordPoint: Point3D; leaderLength?: number;
}

export interface DimensionOrdinateEntity extends DimensionCommon {
  type: 'DIMENSION_ORDINATE';
  featurePoint: Point3D; leaderEndpoint: Point3D; isXOrdinate?: boolean;
}

export interface DimensionArcEntity extends DimensionCommon {
  type: 'DIMENSION_ARC';
  center: Point3D; defPoint1: Point3D; defPoint2: Point3D; arcPoint: Point3D;
}

export interface LeaderEntity {
  type: 'LEADER';
  vertices: Point3D[];
  hasArrowhead?: boolean;
  pathType?: 'straight' | 'spline';
  annotationRef?: EntityRef;
  dimStyle?: string;
}

export interface MultiLeaderEntity {
  type: 'MULTILEADER';
  style?: string;
  contentType?: 'mtext' | 'block' | 'none';
  textContent?: { text: string; style?: string; insertionPoint?: Point3D };
  blockContent?: { blockName: string; insertionPoint?: Point3D };
  leaders?: { lines: { vertices: Point3D[] }[] }[];
}

export interface ToleranceEntity {
  type: 'TOLERANCE';
  insertionPoint: Point3D;
  dimStyle?: string;
  frames?: ToleranceFrame[];
}

export interface ToleranceFrame {
  symbol: string;
  tolerance1?: { value: number; diameterSymbol?: boolean; materialCondition?: string };
  datum1?: { letter: string; materialCondition?: string };
  datum2?: { letter: string; materialCondition?: string };
  datum3?: { letter: string; materialCondition?: string };
}

export interface HatchEntity {
  type: 'HATCH';
  patternName?: string;
  solid?: boolean;
  associative?: boolean;
  boundaries: HatchBoundary[];
  patternAngle?: number;
  patternScale?: number;
  gradient?: HatchGradient;
}

export interface HatchBoundary {
  type: 'polyline' | 'edges' | 'default' | 'outermost';
  polyline?: { vertices: LWPolylineVertex[] };
  edges?: HatchEdge[];
}

export type HatchEdge =
  | { edgeType: 'line'; start: Point2D; end: Point2D }
  | { edgeType: 'arc'; center: Point2D; radius: number; startAngle: number; endAngle: number }
  | { edgeType: 'ellipticArc'; center: Point2D; majorAxisEndpoint: Point2D; minorAxisRatio: number }
  | { edgeType: 'spline'; degree: number; controlPoints: Point2D[]; knots?: number[] };

export interface HatchGradient {
  name: string;
  angle?: number;
  color1?: Color;
  color2?: Color;
}

export interface SolidEntity { type: 'SOLID'; point1: Point3D; point2: Point3D; point3: Point3D; point4?: Point3D }
export interface TraceEntity { type: 'TRACE'; point1: Point3D; point2: Point3D; point3: Point3D; point4?: Point3D }
export interface Face3DEntity { type: '3DFACE'; point1: Point3D; point2: Point3D; point3: Point3D; point4?: Point3D }

export interface InsertEntity {
  type: 'INSERT';
  blockName: string;
  insertionPoint: Point3D;
  scaleX?: number; scaleY?: number; scaleZ?: number;
  rotation?: number;
  attributes?: AttribEntity[];
  columnCount?: number; rowCount?: number;
  columnSpacing?: number; rowSpacing?: number;
}

export interface AttDefEntity {
  type: 'ATTDEF';
  tag: string; prompt?: string; defaultValue?: string;
  insertionPoint: Point3D; height: number;
  rotation?: number; style?: string;
  invisible?: boolean; constant?: boolean;
}

export interface AttribEntity {
  type: 'ATTRIB';
  tag: string; value: string;
  insertionPoint: Point3D; height: number;
  rotation?: number; style?: string;
  invisible?: boolean;
}

export interface ViewportEntity {
  type: 'VIEWPORT';
  center: Point3D; width: number; height: number;
  id?: number;
  viewCenter?: Point2D; viewHeight?: number;
  viewDirection?: Point3D; viewTarget?: Point3D;
  twistAngle?: number; scale?: number;
  locked?: boolean; on?: boolean;
  frozenLayers?: string[];
}

export interface ImageEntity {
  type: 'IMAGE';
  insertionPoint: Point3D;
  uVector: Point3D; vVector: Point3D;
  imageSize: Point2D;
  imagePath?: string; imageData?: string;
}

export interface WipeoutEntity { type: 'WIPEOUT'; vertices: Point2D[] }

export interface TableEntity {
  type: 'TABLE';
  insertionPoint: Point3D;
  rows: number; columns: number;
  rowHeights?: number[]; columnWidths?: number[];
  cells?: TableCell[];
}

export interface TableCell {
  row: number; column: number;
  text?: string; blockName?: string;
  textHeight?: number; textStyle?: string;
  textColor?: Color; fillColor?: Color;
  formula?: string;
  mergeRange?: { rowSpan: number; colSpan: number };
}

export interface Solid3DEntity { type: '3DSOLID'; acisData?: string }
export interface RegionEntity { type: 'REGION'; acisData?: string }
export interface BodyEntity { type: 'BODY'; acisData?: string }
export interface SurfaceEntity { type: 'SURFACE'; surfaceType: string; acisData?: string }

export interface MeshEntity {
  type: 'MESH';
  subdivisionLevel?: number;
  vertices: Point3D[];
  faces: number[][];
  edges?: { from: number; to: number; crease?: number }[];
}

export interface ShapeEntity { type: 'SHAPE'; insertionPoint: Point3D; shapeNumber: number; size: number }
export interface OleEntity { type: 'OLE2FRAME'; data?: string }
export interface UnderlayEntity { type: 'UNDERLAY'; underlayType: 'pdf' | 'dwf' | 'dgn'; insertionPoint: Point3D; filePath: string }
export interface LightEntity { type: 'LIGHT'; lightType: 'point' | 'spot' | 'distant'; position: Point3D }
export interface CameraEntity { type: 'CAMERA'; position: Point3D; target: Point3D; lensLength?: number }
export interface SectionEntity { type: 'SECTION'; vertices: Point3D[] }
export interface GeoMarkerEntity { type: 'GEOPOSITIONMARKER'; position: Point3D; latitude?: number; longitude?: number }
export interface ProxyEntity { type: 'PROXY'; originalType: string; graphicsData?: string; entityData?: string }

// === Drawing Objects ===

export interface LayoutObject {
  objectType: 'LAYOUT';
  handle?: Handle;
  name: string;
  tabOrder?: number;
  isModelSpace?: boolean;
  plotSettings?: PlotSettings;
}

export interface PlotSettings {
  printer?: string;
  paperSize?: string;
  paperWidth?: number;
  paperHeight?: number;
  plotScale?: number;
  scaleToFit?: boolean;
  plotStyleTable?: string;
  plotArea?: string;
}

export interface GroupObject {
  objectType: 'GROUP';
  handle?: Handle;
  name: string;
  description?: string;
  members?: EntityRef[];
}

export type DrawingObject = LayoutObject | GroupObject | { objectType: string; handle?: Handle; [key: string]: unknown };

// === Document ===

export interface IfcxDocument {
  ifcx: '1.0';
  header: Header;
  tables?: Tables;
  blocks?: Record<string, BlockDefinition>;
  entities: Entity[];
  objects?: DrawingObject[];
  extensions?: Record<string, unknown>;
}

export interface BlockDefinition {
  name: string;
  basePoint?: Point3D;
  description?: string;
  entities?: Entity[];
  attDefs?: AttDefEntity[];
  isAnonymous?: boolean;
  isXRef?: boolean;
  xRefPath?: string;
}
