import type { IfcConstructionResourceType } from './IfcConstructionResourceType.js';
import type { IfcConstructionMaterialResourceTypeEnum } from '../enums/IfcConstructionMaterialResourceTypeEnum.js';

export interface IfcConstructionMaterialResourceType extends IfcConstructionResourceType {
  PredefinedType: IfcConstructionMaterialResourceTypeEnum;
}
