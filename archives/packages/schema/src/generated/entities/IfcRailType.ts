import type { IfcBuiltElementType } from './IfcBuiltElementType.js';
import type { IfcRailTypeEnum } from '../enums/IfcRailTypeEnum.js';

export interface IfcRailType extends IfcBuiltElementType {
  PredefinedType: IfcRailTypeEnum;
}
