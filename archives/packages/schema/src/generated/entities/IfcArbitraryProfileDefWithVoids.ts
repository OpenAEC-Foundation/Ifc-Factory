import type { IfcArbitraryClosedProfileDef } from './IfcArbitraryClosedProfileDef.js';
import type { IfcCurve } from './IfcCurve.js';

export interface IfcArbitraryProfileDefWithVoids extends IfcArbitraryClosedProfileDef {
  InnerCurves: IfcCurve[];
}
