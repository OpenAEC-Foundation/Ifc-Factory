import type { IfcGeometricRepresentationItem } from './IfcGeometricRepresentationItem.js';
import type { IfcVector } from './IfcVector.js';
import type { IfcStyledItem } from './IfcStyledItem.js';
import type { IfcPositiveRatioMeasure } from '../types/IfcPositiveRatioMeasure.js';

export interface IfcFillAreaStyleTiles extends IfcGeometricRepresentationItem {
  TilingPattern: IfcVector[];
  Tiles: IfcStyledItem[];
  TilingScale: IfcPositiveRatioMeasure;
}
