import type { IfcExternalReference } from './IfcExternalReference.js';
import type { IfcClassificationReferenceSelect } from '../selects/IfcClassificationReferenceSelect.js';
import type { IfcText } from '../types/IfcText.js';
import type { IfcIdentifier } from '../types/IfcIdentifier.js';

export interface IfcClassificationReference extends IfcExternalReference {
  ReferencedSource?: IfcClassificationReferenceSelect | null;
  Description?: IfcText | null;
  Sort?: IfcIdentifier | null;
}
