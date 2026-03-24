import type { IfcSolidModel } from './IfcSolidModel.js';
import type { IfcProfileDef } from './IfcProfileDef.js';
import type { IfcAxis2Placement3D } from './IfcAxis2Placement3D.js';

export interface IfcSweptAreaSolid extends IfcSolidModel {
  SweptArea: IfcProfileDef;
  Position?: IfcAxis2Placement3D | null;
}
