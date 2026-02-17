import type { IfcCartesianTransformationOperator2D } from './IfcCartesianTransformationOperator2D.js';
import type { IfcReal } from '../types/IfcReal.js';

export interface IfcCartesianTransformationOperator2DnonUniform extends IfcCartesianTransformationOperator2D {
  Scale2?: IfcReal | null;
}
