import type { IfcConstructionResource } from './IfcConstructionResource.js';
import type { IfcLaborResourceTypeEnum } from '../enums/IfcLaborResourceTypeEnum.js';

export interface IfcLaborResource extends IfcConstructionResource {
  PredefinedType?: IfcLaborResourceTypeEnum | null;
}
