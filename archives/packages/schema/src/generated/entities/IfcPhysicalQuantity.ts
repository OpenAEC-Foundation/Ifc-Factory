import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcText } from '../types/IfcText.js';

export interface IfcPhysicalQuantity {
  readonly type: string;
  Name: IfcLabel;
  Description?: IfcText | null;
}
