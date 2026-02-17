import type { IfcRelAssociates } from './IfcRelAssociates.js';
import type { IfcClassificationSelect } from '../selects/IfcClassificationSelect.js';

export interface IfcRelAssociatesClassification extends IfcRelAssociates {
  RelatingClassification: IfcClassificationSelect;
}
