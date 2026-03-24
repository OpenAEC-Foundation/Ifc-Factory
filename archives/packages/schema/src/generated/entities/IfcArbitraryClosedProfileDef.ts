import type { IfcProfileDef } from './IfcProfileDef.js';
import type { IfcCurve } from './IfcCurve.js';

export interface IfcArbitraryClosedProfileDef extends IfcProfileDef {
  OuterCurve: IfcCurve;
}
