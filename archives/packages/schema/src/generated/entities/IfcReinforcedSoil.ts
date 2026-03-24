import type { IfcEarthworksElement } from './IfcEarthworksElement.js';
import type { IfcReinforcedSoilTypeEnum } from '../enums/IfcReinforcedSoilTypeEnum.js';

export interface IfcReinforcedSoil extends IfcEarthworksElement {
  PredefinedType?: IfcReinforcedSoilTypeEnum | null;
}
