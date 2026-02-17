import type { IfcClassificationSelect } from '../selects/IfcClassificationSelect.js';
import type { IfcMaterial } from './IfcMaterial.js';

export interface IfcMaterialClassificationRelationship {
  readonly type: string;
  MaterialClassifications: IfcClassificationSelect[];
  ClassifiedMaterial: IfcMaterial;
}
