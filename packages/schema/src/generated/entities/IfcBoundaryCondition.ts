import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcBoundaryCondition {
  readonly type: string;
  Name?: IfcLabel | null;
}
