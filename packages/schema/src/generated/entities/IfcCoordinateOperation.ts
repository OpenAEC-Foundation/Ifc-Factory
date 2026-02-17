import type { IfcCoordinateReferenceSystemSelect } from '../selects/IfcCoordinateReferenceSystemSelect.js';
import type { IfcCoordinateReferenceSystem } from './IfcCoordinateReferenceSystem.js';

export interface IfcCoordinateOperation {
  readonly type: string;
  SourceCRS: IfcCoordinateReferenceSystemSelect;
  TargetCRS: IfcCoordinateReferenceSystem;
}
