import type { IfcProfileDef } from './IfcProfileDef.js';
import type { IfcCartesianTransformationOperator2D } from './IfcCartesianTransformationOperator2D.js';
import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcDerivedProfileDef extends IfcProfileDef {
  ParentProfile: IfcProfileDef;
  Operator: IfcCartesianTransformationOperator2D;
  Label?: IfcLabel | null;
}
