import type { IfcReinforcingElement } from './IfcReinforcingElement.js';
import type { IfcTendonAnchorTypeEnum } from '../enums/IfcTendonAnchorTypeEnum.js';

export interface IfcTendonAnchor extends IfcReinforcingElement {
  PredefinedType?: IfcTendonAnchorTypeEnum | null;
}
