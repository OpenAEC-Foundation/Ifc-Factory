import type { IfcExternalInformation } from './IfcExternalInformation.js';
import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcActorSelect } from '../selects/IfcActorSelect.js';
import type { IfcDateTime } from '../types/IfcDateTime.js';
import type { IfcURIReference } from '../types/IfcURIReference.js';
import type { IfcText } from '../types/IfcText.js';

export interface IfcLibraryInformation extends IfcExternalInformation {
  Name: IfcLabel;
  Version?: IfcLabel | null;
  Publisher?: IfcActorSelect | null;
  VersionDate?: IfcDateTime | null;
  Location?: IfcURIReference | null;
  Description?: IfcText | null;
}
