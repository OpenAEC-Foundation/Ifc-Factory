import type { IfcGeometricRepresentationItem } from './IfcGeometricRepresentationItem.js';
import type { IfcDirection } from './IfcDirection.js';
import type { IfcCartesianPoint } from './IfcCartesianPoint.js';
import type { IfcReal } from '../types/IfcReal.js';

export interface IfcCartesianTransformationOperator extends IfcGeometricRepresentationItem {
  Axis1?: IfcDirection | null;
  Axis2?: IfcDirection | null;
  LocalOrigin: IfcCartesianPoint;
  Scale?: IfcReal | null;
}
