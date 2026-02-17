import type { IfcExternalReference } from './IfcExternalReference.js';
import type { IfcText } from '../types/IfcText.js';
import type { IfcDocumentInformation } from './IfcDocumentInformation.js';

export interface IfcDocumentReference extends IfcExternalReference {
  Description?: IfcText | null;
  ReferencedDocument?: IfcDocumentInformation | null;
}
