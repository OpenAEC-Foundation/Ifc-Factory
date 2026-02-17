import type { IfcReinforcingElementType } from './IfcReinforcingElementType.js';
import type { IfcTendonConduitTypeEnum } from '../enums/IfcTendonConduitTypeEnum.js';

export interface IfcTendonConduitType extends IfcReinforcingElementType {
  PredefinedType: IfcTendonConduitTypeEnum;
}
