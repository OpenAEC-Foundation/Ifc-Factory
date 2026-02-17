import type { IfcFacilityPart } from './IfcFacilityPart.js';
import type { IfcMarinePartTypeEnum } from '../enums/IfcMarinePartTypeEnum.js';

export interface IfcMarinePart extends IfcFacilityPart {
  PredefinedType?: IfcMarinePartTypeEnum | null;
}
