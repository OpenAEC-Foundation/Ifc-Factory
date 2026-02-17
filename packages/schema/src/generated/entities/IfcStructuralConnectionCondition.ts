import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcStructuralConnectionCondition {
  readonly type: string;
  Name?: IfcLabel | null;
}
