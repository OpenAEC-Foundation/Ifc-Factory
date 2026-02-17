import type { IfcConstructionResourceType } from './IfcConstructionResourceType.js';
import type { IfcCrewResourceTypeEnum } from '../enums/IfcCrewResourceTypeEnum.js';

export interface IfcCrewResourceType extends IfcConstructionResourceType {
  PredefinedType: IfcCrewResourceTypeEnum;
}
