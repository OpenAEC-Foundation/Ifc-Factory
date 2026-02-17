import type { IfcBoundaryCondition } from './IfcBoundaryCondition.js';
import type { IfcModulusOfTranslationalSubgradeReactionSelect } from '../selects/IfcModulusOfTranslationalSubgradeReactionSelect.js';
import type { IfcModulusOfRotationalSubgradeReactionSelect } from '../selects/IfcModulusOfRotationalSubgradeReactionSelect.js';

export interface IfcBoundaryEdgeCondition extends IfcBoundaryCondition {
  TranslationalStiffnessByLengthX?: IfcModulusOfTranslationalSubgradeReactionSelect | null;
  TranslationalStiffnessByLengthY?: IfcModulusOfTranslationalSubgradeReactionSelect | null;
  TranslationalStiffnessByLengthZ?: IfcModulusOfTranslationalSubgradeReactionSelect | null;
  RotationalStiffnessByLengthX?: IfcModulusOfRotationalSubgradeReactionSelect | null;
  RotationalStiffnessByLengthY?: IfcModulusOfRotationalSubgradeReactionSelect | null;
  RotationalStiffnessByLengthZ?: IfcModulusOfRotationalSubgradeReactionSelect | null;
}
