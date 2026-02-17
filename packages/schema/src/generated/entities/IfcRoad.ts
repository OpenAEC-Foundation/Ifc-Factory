import type { IfcFacility } from './IfcFacility.js';
import type { IfcRoadTypeEnum } from '../enums/IfcRoadTypeEnum.js';

export interface IfcRoad extends IfcFacility {
  PredefinedType?: IfcRoadTypeEnum | null;
}
