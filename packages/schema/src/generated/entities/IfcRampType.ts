import type { IfcBuiltElementType } from './IfcBuiltElementType.js';
import type { IfcRampTypeEnum } from '../enums/IfcRampTypeEnum.js';

export interface IfcRampType extends IfcBuiltElementType {
  PredefinedType: IfcRampTypeEnum;
}
