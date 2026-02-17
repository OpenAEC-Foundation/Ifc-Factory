import type { IfcBoundaryCondition } from './IfcBoundaryCondition.js';
import type { IfcModulusOfSubgradeReactionSelect } from '../selects/IfcModulusOfSubgradeReactionSelect.js';

export interface IfcBoundaryFaceCondition extends IfcBoundaryCondition {
  TranslationalStiffnessByAreaX?: IfcModulusOfSubgradeReactionSelect | null;
  TranslationalStiffnessByAreaY?: IfcModulusOfSubgradeReactionSelect | null;
  TranslationalStiffnessByAreaZ?: IfcModulusOfSubgradeReactionSelect | null;
}
