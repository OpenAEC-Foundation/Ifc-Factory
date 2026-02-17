import type { IfcSystem } from './IfcSystem.js';
import type { IfcBuildingSystemTypeEnum } from '../enums/IfcBuildingSystemTypeEnum.js';
import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcBuildingSystem extends IfcSystem {
  PredefinedType?: IfcBuildingSystemTypeEnum | null;
  LongName?: IfcLabel | null;
}
