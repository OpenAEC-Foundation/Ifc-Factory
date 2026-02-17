import type { IfcResourceLevelRelationship } from './IfcResourceLevelRelationship.js';
import type { IfcOrganization } from './IfcOrganization.js';

export interface IfcOrganizationRelationship extends IfcResourceLevelRelationship {
  RelatingOrganization: IfcOrganization;
  RelatedOrganizations: IfcOrganization[];
}
