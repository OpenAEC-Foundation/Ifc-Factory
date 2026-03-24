import type { IfcExternalInformation } from './IfcExternalInformation.js';
import type { IfcIdentifier } from '../types/IfcIdentifier.js';
import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcText } from '../types/IfcText.js';
import type { IfcURIReference } from '../types/IfcURIReference.js';
import type { IfcActorSelect } from '../selects/IfcActorSelect.js';
import type { IfcDateTime } from '../types/IfcDateTime.js';
import type { IfcDate } from '../types/IfcDate.js';
import type { IfcDocumentConfidentialityEnum } from '../enums/IfcDocumentConfidentialityEnum.js';
import type { IfcDocumentStatusEnum } from '../enums/IfcDocumentStatusEnum.js';

export interface IfcDocumentInformation extends IfcExternalInformation {
  Identification: IfcIdentifier;
  Name: IfcLabel;
  Description?: IfcText | null;
  Location?: IfcURIReference | null;
  Purpose?: IfcText | null;
  IntendedUse?: IfcText | null;
  Scope?: IfcText | null;
  Revision?: IfcLabel | null;
  DocumentOwner?: IfcActorSelect | null;
  Editors?: IfcActorSelect[] | null;
  CreationTime?: IfcDateTime | null;
  LastRevisionTime?: IfcDateTime | null;
  ElectronicFormat?: IfcIdentifier | null;
  ValidFrom?: IfcDate | null;
  ValidUntil?: IfcDate | null;
  Confidentiality?: IfcDocumentConfidentialityEnum | null;
  Status?: IfcDocumentStatusEnum | null;
}
