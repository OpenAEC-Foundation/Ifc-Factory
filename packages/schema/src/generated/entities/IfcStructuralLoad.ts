import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcStructuralLoad {
  readonly type: string;
  Name?: IfcLabel | null;
}
