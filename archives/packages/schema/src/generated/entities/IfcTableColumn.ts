import type { IfcIdentifier } from '../types/IfcIdentifier.js';
import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcText } from '../types/IfcText.js';
import type { IfcUnit } from '../selects/IfcUnit.js';
import type { IfcReference } from './IfcReference.js';

export interface IfcTableColumn {
  readonly type: string;
  Identifier?: IfcIdentifier | null;
  Name?: IfcLabel | null;
  Description?: IfcText | null;
  Unit?: IfcUnit | null;
  ReferencePath?: IfcReference | null;
}
