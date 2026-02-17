import type { IfcFacility } from './IfcFacility.js';
import type { IfcMarineFacilityTypeEnum } from '../enums/IfcMarineFacilityTypeEnum.js';

export interface IfcMarineFacility extends IfcFacility {
  PredefinedType?: IfcMarineFacilityTypeEnum | null;
}
