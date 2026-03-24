import type { IfcSolidModel } from './IfcSolidModel.js';
import type { IfcCsgSelect } from '../selects/IfcCsgSelect.js';

export interface IfcCsgSolid extends IfcSolidModel {
  TreeRootExpression: IfcCsgSelect;
}
