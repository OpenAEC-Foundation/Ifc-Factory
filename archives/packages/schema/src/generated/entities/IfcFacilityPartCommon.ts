import type { IfcFacilityPart } from './IfcFacilityPart.js';
import type { IfcFacilityPartCommonTypeEnum } from '../enums/IfcFacilityPartCommonTypeEnum.js';

export interface IfcFacilityPartCommon extends IfcFacilityPart {
  PredefinedType?: IfcFacilityPartCommonTypeEnum | null;
}
