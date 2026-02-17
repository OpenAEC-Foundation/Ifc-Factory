import type { IfcCartesianTransformationOperator3D } from './IfcCartesianTransformationOperator3D.js';
import type { IfcReal } from '../types/IfcReal.js';

export interface IfcCartesianTransformationOperator3DnonUniform extends IfcCartesianTransformationOperator3D {
  Scale2?: IfcReal | null;
  Scale3?: IfcReal | null;
}
