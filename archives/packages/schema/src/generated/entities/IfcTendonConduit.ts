import type { IfcReinforcingElement } from './IfcReinforcingElement.js';
import type { IfcTendonConduitTypeEnum } from '../enums/IfcTendonConduitTypeEnum.js';

export interface IfcTendonConduit extends IfcReinforcingElement {
  PredefinedType?: IfcTendonConduitTypeEnum | null;
}
