import type { IfcIdentifier } from '../types/IfcIdentifier.js';
import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcActorRole } from './IfcActorRole.js';
import type { IfcAddress } from './IfcAddress.js';

export interface IfcPerson {
  readonly type: string;
  Identification?: IfcIdentifier | null;
  FamilyName?: IfcLabel | null;
  GivenName?: IfcLabel | null;
  MiddleNames?: IfcLabel[] | null;
  PrefixTitles?: IfcLabel[] | null;
  SuffixTitles?: IfcLabel[] | null;
  Roles?: IfcActorRole[] | null;
  Addresses?: IfcAddress[] | null;
}
