import type { IfcExternalInformation } from './IfcExternalInformation.js';
import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcDate } from '../types/IfcDate.js';
import type { IfcText } from '../types/IfcText.js';
import type { IfcURIReference } from '../types/IfcURIReference.js';
import type { IfcIdentifier } from '../types/IfcIdentifier.js';

export interface IfcClassification extends IfcExternalInformation {
  Source?: IfcLabel | null;
  Edition?: IfcLabel | null;
  EditionDate?: IfcDate | null;
  Name: IfcLabel;
  Description?: IfcText | null;
  Specification?: IfcURIReference | null;
  ReferenceTokens?: IfcIdentifier[] | null;
}
