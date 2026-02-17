import type { IfcGeometricRepresentationItem } from './IfcGeometricRepresentationItem.js';
import type { IfcGeometricSetSelect } from '../selects/IfcGeometricSetSelect.js';

export interface IfcGeometricSet extends IfcGeometricRepresentationItem {
  Elements: IfcGeometricSetSelect[];
}
