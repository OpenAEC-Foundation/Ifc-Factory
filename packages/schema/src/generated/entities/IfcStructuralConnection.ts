import type { IfcStructuralItem } from './IfcStructuralItem.js';
import type { IfcBoundaryCondition } from './IfcBoundaryCondition.js';

export interface IfcStructuralConnection extends IfcStructuralItem {
  AppliedCondition?: IfcBoundaryCondition | null;
}
