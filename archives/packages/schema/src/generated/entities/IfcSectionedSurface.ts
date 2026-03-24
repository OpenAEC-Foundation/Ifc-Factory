import type { IfcSurface } from './IfcSurface.js';
import type { IfcCurve } from './IfcCurve.js';
import type { IfcAxis2PlacementLinear } from './IfcAxis2PlacementLinear.js';
import type { IfcProfileDef } from './IfcProfileDef.js';

export interface IfcSectionedSurface extends IfcSurface {
  Directrix: IfcCurve;
  CrossSectionPositions: IfcAxis2PlacementLinear[];
  CrossSections: IfcProfileDef[];
}
