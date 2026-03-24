import type { IfcCartesianTransformationOperator } from './IfcCartesianTransformationOperator.js';
import type { IfcDirection } from './IfcDirection.js';

export interface IfcCartesianTransformationOperator3D extends IfcCartesianTransformationOperator {
  Axis3?: IfcDirection | null;
}
