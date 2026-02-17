import type { IfcPerson } from './IfcPerson.js';
import type { IfcOrganization } from './IfcOrganization.js';
import type { IfcActorRole } from './IfcActorRole.js';

export interface IfcPersonAndOrganization {
  readonly type: string;
  ThePerson: IfcPerson;
  TheOrganization: IfcOrganization;
  Roles?: IfcActorRole[] | null;
}
