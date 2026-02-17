import type { IfcRelAssociates } from './IfcRelAssociates.js';
import type { IfcProfileDef } from './IfcProfileDef.js';

export interface IfcRelAssociatesProfileDef extends IfcRelAssociates {
  RelatingProfileDef: IfcProfileDef;
}
