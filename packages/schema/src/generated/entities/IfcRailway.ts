import type { IfcFacility } from './IfcFacility.js';
import type { IfcRailwayTypeEnum } from '../enums/IfcRailwayTypeEnum.js';

export interface IfcRailway extends IfcFacility {
  PredefinedType?: IfcRailwayTypeEnum | null;
}
