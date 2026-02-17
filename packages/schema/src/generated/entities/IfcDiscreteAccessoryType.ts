import type { IfcElementComponentType } from './IfcElementComponentType.js';
import type { IfcDiscreteAccessoryTypeEnum } from '../enums/IfcDiscreteAccessoryTypeEnum.js';

export interface IfcDiscreteAccessoryType extends IfcElementComponentType {
  PredefinedType: IfcDiscreteAccessoryTypeEnum;
}
