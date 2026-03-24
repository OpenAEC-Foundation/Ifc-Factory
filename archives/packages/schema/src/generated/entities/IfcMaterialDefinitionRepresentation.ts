import type { IfcProductRepresentation } from './IfcProductRepresentation.js';
import type { IfcMaterial } from './IfcMaterial.js';

export interface IfcMaterialDefinitionRepresentation extends IfcProductRepresentation {
  RepresentedMaterial: IfcMaterial;
}
