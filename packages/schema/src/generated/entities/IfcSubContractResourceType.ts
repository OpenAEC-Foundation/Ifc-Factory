import type { IfcConstructionResourceType } from './IfcConstructionResourceType.js';
import type { IfcSubContractResourceTypeEnum } from '../enums/IfcSubContractResourceTypeEnum.js';

export interface IfcSubContractResourceType extends IfcConstructionResourceType {
  PredefinedType: IfcSubContractResourceTypeEnum;
}
