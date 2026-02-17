import type { IfcStructuralActivity } from './IfcStructuralActivity.js';
import type { IfcBoolean } from '../types/IfcBoolean.js';

export interface IfcStructuralAction extends IfcStructuralActivity {
  DestabilizingLoad?: IfcBoolean | null;
}
