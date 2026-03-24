import type { IfcBuiltElementType } from './IfcBuiltElementType.js';
import type { IfcKerbTypeEnum } from '../enums/IfcKerbTypeEnum.js';

export interface IfcKerbType extends IfcBuiltElementType {
  PredefinedType: IfcKerbTypeEnum;
}
