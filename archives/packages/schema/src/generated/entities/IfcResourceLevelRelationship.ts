import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcText } from '../types/IfcText.js';

export interface IfcResourceLevelRelationship {
  readonly type: string;
  Name?: IfcLabel | null;
  Description?: IfcText | null;
}
