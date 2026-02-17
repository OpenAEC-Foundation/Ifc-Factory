import type { IfcSurface } from './IfcSurface.js';
import type { IfcProfileDef } from './IfcProfileDef.js';
import type { IfcAxis2Placement3D } from './IfcAxis2Placement3D.js';

export interface IfcSweptSurface extends IfcSurface {
  SweptCurve: IfcProfileDef;
  Position?: IfcAxis2Placement3D | null;
}
