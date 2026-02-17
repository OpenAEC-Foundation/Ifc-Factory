import type { IfcProfileDef } from './IfcProfileDef.js';
import type { IfcAxis2Placement2D } from './IfcAxis2Placement2D.js';

export interface IfcParameterizedProfileDef extends IfcProfileDef {
  Position?: IfcAxis2Placement2D | null;
}
