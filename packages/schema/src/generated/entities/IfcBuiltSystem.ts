import type { IfcSystem } from './IfcSystem.js';
import type { IfcBuiltSystemTypeEnum } from '../enums/IfcBuiltSystemTypeEnum.js';
import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcBuiltSystem extends IfcSystem {
  PredefinedType?: IfcBuiltSystemTypeEnum | null;
  LongName?: IfcLabel | null;
}
