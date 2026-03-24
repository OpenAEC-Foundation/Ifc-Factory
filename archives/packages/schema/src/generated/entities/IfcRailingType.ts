import type { IfcBuiltElementType } from './IfcBuiltElementType.js';
import type { IfcRailingTypeEnum } from '../enums/IfcRailingTypeEnum.js';

export interface IfcRailingType extends IfcBuiltElementType {
  PredefinedType: IfcRailingTypeEnum;
}
