import type { IfcRevolvedAreaSolid } from './IfcRevolvedAreaSolid.js';
import type { IfcProfileDef } from './IfcProfileDef.js';

export interface IfcRevolvedAreaSolidTapered extends IfcRevolvedAreaSolid {
  EndSweptArea: IfcProfileDef;
}
