import type { IfcIdentifier } from '../types/IfcIdentifier.js';
import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcText } from '../types/IfcText.js';
import type { IfcDateTime } from '../types/IfcDateTime.js';
import type { IfcActorSelect } from '../selects/IfcActorSelect.js';

export interface IfcApproval {
  readonly type: string;
  Identifier?: IfcIdentifier | null;
  Name?: IfcLabel | null;
  Description?: IfcText | null;
  TimeOfApproval?: IfcDateTime | null;
  Status?: IfcLabel | null;
  Level?: IfcLabel | null;
  Qualifier?: IfcText | null;
  RequestingApproval?: IfcActorSelect | null;
  GivingApproval?: IfcActorSelect | null;
}
