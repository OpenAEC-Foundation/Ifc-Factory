import type { IfcRelAssociates } from './IfcRelAssociates.js';
import type { IfcMaterialSelect } from '../selects/IfcMaterialSelect.js';

export interface IfcRelAssociatesMaterial extends IfcRelAssociates {
  RelatingMaterial: IfcMaterialSelect;
}
