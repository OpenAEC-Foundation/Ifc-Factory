import type { IfcConstructionResource } from './IfcConstructionResource.js';
import type { IfcSubContractResourceTypeEnum } from '../enums/IfcSubContractResourceTypeEnum.js';

export interface IfcSubContractResource extends IfcConstructionResource {
  PredefinedType?: IfcSubContractResourceTypeEnum | null;
}
