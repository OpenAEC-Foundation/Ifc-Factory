import type { IfcProfileDef } from './IfcProfileDef.js';
import type { IfcBoundedCurve } from './IfcBoundedCurve.js';

export interface IfcArbitraryOpenProfileDef extends IfcProfileDef {
  Curve: IfcBoundedCurve;
}
