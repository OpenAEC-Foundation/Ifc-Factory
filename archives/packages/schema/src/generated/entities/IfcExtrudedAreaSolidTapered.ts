import type { IfcExtrudedAreaSolid } from './IfcExtrudedAreaSolid.js';
import type { IfcProfileDef } from './IfcProfileDef.js';

export interface IfcExtrudedAreaSolidTapered extends IfcExtrudedAreaSolid {
  EndSweptArea: IfcProfileDef;
}
