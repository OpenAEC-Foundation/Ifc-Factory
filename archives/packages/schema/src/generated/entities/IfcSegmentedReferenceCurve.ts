import type { IfcCompositeCurve } from './IfcCompositeCurve.js';
import type { IfcBoundedCurve } from './IfcBoundedCurve.js';
import type { IfcPlacement } from './IfcPlacement.js';

export interface IfcSegmentedReferenceCurve extends IfcCompositeCurve {
  BaseCurve: IfcBoundedCurve;
  EndPoint?: IfcPlacement | null;
}
