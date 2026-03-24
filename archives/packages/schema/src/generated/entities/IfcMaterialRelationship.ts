import type { IfcResourceLevelRelationship } from './IfcResourceLevelRelationship.js';
import type { IfcMaterial } from './IfcMaterial.js';
import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcMaterialRelationship extends IfcResourceLevelRelationship {
  RelatingMaterial: IfcMaterial;
  RelatedMaterials: IfcMaterial[];
  MaterialExpression?: IfcLabel | null;
}
