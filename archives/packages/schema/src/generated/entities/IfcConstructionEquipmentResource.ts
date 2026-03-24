import type { IfcConstructionResource } from './IfcConstructionResource.js';
import type { IfcConstructionEquipmentResourceTypeEnum } from '../enums/IfcConstructionEquipmentResourceTypeEnum.js';

export interface IfcConstructionEquipmentResource extends IfcConstructionResource {
  PredefinedType?: IfcConstructionEquipmentResourceTypeEnum | null;
}
