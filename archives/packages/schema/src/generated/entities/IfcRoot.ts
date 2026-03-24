import type { IfcGloballyUniqueId } from '../types/IfcGloballyUniqueId.js';
import type { IfcOwnerHistory } from './IfcOwnerHistory.js';
import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcText } from '../types/IfcText.js';

export interface IfcRoot {
  readonly type: string;
  GlobalId: IfcGloballyUniqueId;
  OwnerHistory?: IfcOwnerHistory | null;
  Name?: IfcLabel | null;
  Description?: IfcText | null;
}
