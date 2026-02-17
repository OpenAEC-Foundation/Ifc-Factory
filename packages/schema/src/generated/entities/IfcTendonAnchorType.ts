import type { IfcReinforcingElementType } from './IfcReinforcingElementType.js';
import type { IfcTendonAnchorTypeEnum } from '../enums/IfcTendonAnchorTypeEnum.js';

export interface IfcTendonAnchorType extends IfcReinforcingElementType {
  PredefinedType: IfcTendonAnchorTypeEnum;
}
