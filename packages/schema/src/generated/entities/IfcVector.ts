import type { IfcGeometricRepresentationItem } from './IfcGeometricRepresentationItem.js';
import type { IfcDirection } from './IfcDirection.js';
import type { IfcLengthMeasure } from '../types/IfcLengthMeasure.js';

export interface IfcVector extends IfcGeometricRepresentationItem {
  Orientation: IfcDirection;
  Magnitude: IfcLengthMeasure;
}
