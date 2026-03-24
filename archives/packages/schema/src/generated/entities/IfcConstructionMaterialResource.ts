import type { IfcConstructionResource } from './IfcConstructionResource.js';
import type { IfcConstructionMaterialResourceTypeEnum } from '../enums/IfcConstructionMaterialResourceTypeEnum.js';

export interface IfcConstructionMaterialResource extends IfcConstructionResource {
  PredefinedType?: IfcConstructionMaterialResourceTypeEnum | null;
}
