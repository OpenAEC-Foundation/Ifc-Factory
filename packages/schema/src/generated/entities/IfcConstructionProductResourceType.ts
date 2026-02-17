import type { IfcConstructionResourceType } from './IfcConstructionResourceType.js';
import type { IfcConstructionProductResourceTypeEnum } from '../enums/IfcConstructionProductResourceTypeEnum.js';

export interface IfcConstructionProductResourceType extends IfcConstructionResourceType {
  PredefinedType: IfcConstructionProductResourceTypeEnum;
}
