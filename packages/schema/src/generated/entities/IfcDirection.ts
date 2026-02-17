import type { IfcGeometricRepresentationItem } from './IfcGeometricRepresentationItem.js';
import type { IfcReal } from '../types/IfcReal.js';

export interface IfcDirection extends IfcGeometricRepresentationItem {
  DirectionRatios: IfcReal[];
}
