import type { IfcOrganization } from '../entities/IfcOrganization.js';
import type { IfcPerson } from '../entities/IfcPerson.js';
import type { IfcPersonAndOrganization } from '../entities/IfcPersonAndOrganization.js';

export type IfcActorSelect = IfcOrganization | IfcPerson | IfcPersonAndOrganization;
