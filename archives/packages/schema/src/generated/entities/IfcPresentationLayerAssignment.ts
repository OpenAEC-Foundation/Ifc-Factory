import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcText } from '../types/IfcText.js';
import type { IfcLayeredItem } from '../selects/IfcLayeredItem.js';
import type { IfcIdentifier } from '../types/IfcIdentifier.js';

export interface IfcPresentationLayerAssignment {
  readonly type: string;
  Name: IfcLabel;
  Description?: IfcText | null;
  AssignedItems: IfcLayeredItem[];
  Identifier?: IfcIdentifier | null;
}
