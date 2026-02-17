import type { IfcResourceLevelRelationship } from './IfcResourceLevelRelationship.js';
import type { IfcDocumentInformation } from './IfcDocumentInformation.js';
import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcDocumentInformationRelationship extends IfcResourceLevelRelationship {
  RelatingDocument: IfcDocumentInformation;
  RelatedDocuments: IfcDocumentInformation[];
  RelationshipType?: IfcLabel | null;
}
