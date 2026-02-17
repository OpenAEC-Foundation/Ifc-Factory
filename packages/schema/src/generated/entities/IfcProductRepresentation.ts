import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcText } from '../types/IfcText.js';
import type { IfcRepresentation } from './IfcRepresentation.js';

export interface IfcProductRepresentation {
  readonly type: string;
  Name?: IfcLabel | null;
  Description?: IfcText | null;
  Representations: IfcRepresentation[];
}
