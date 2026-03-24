import type { IfcSolidModel } from './IfcSolidModel.js';
import type { IfcCurve } from './IfcCurve.js';
import type { IfcProfileDef } from './IfcProfileDef.js';

export interface IfcSectionedSolid extends IfcSolidModel {
  Directrix: IfcCurve;
  CrossSections: IfcProfileDef[];
}
