import type { IfcEarthworksElement } from './IfcEarthworksElement.js';
import type { IfcEarthworksFillTypeEnum } from '../enums/IfcEarthworksFillTypeEnum.js';

export interface IfcEarthworksFill extends IfcEarthworksElement {
  PredefinedType?: IfcEarthworksFillTypeEnum | null;
}
