import type { IfcMaterial } from './IfcMaterial.js';

export interface IfcMaterialList {
  readonly type: string;
  Materials: IfcMaterial[];
}
