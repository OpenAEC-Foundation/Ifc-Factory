import type { IfcSystem } from './IfcSystem.js';
import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcDistributionSystemEnum } from '../enums/IfcDistributionSystemEnum.js';

export interface IfcDistributionSystem extends IfcSystem {
  LongName?: IfcLabel | null;
  PredefinedType?: IfcDistributionSystemEnum | null;
}
