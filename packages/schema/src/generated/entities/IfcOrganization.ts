import type { IfcIdentifier } from '../types/IfcIdentifier.js';
import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcText } from '../types/IfcText.js';
import type { IfcActorRole } from './IfcActorRole.js';
import type { IfcAddress } from './IfcAddress.js';

export interface IfcOrganization {
  readonly type: string;
  Identification?: IfcIdentifier | null;
  Name: IfcLabel;
  Description?: IfcText | null;
  Roles?: IfcActorRole[] | null;
  Addresses?: IfcAddress[] | null;
}
