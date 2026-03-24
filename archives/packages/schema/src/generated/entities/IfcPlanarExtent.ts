import type { IfcGeometricRepresentationItem } from './IfcGeometricRepresentationItem.js';
import type { IfcLengthMeasure } from '../types/IfcLengthMeasure.js';

export interface IfcPlanarExtent extends IfcGeometricRepresentationItem {
  SizeInX: IfcLengthMeasure;
  SizeInY: IfcLengthMeasure;
}
