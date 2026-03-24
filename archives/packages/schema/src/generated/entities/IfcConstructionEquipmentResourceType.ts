import type { IfcConstructionResourceType } from './IfcConstructionResourceType.js';
import type { IfcConstructionEquipmentResourceTypeEnum } from '../enums/IfcConstructionEquipmentResourceTypeEnum.js';

export interface IfcConstructionEquipmentResourceType extends IfcConstructionResourceType {
  PredefinedType: IfcConstructionEquipmentResourceTypeEnum;
}
