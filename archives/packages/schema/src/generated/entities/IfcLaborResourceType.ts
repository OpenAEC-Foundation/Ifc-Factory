import type { IfcConstructionResourceType } from './IfcConstructionResourceType.js';
import type { IfcLaborResourceTypeEnum } from '../enums/IfcLaborResourceTypeEnum.js';

export interface IfcLaborResourceType extends IfcConstructionResourceType {
  PredefinedType: IfcLaborResourceTypeEnum;
}
