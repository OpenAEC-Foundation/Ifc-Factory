import type { IfcBuiltElementType } from './IfcBuiltElementType.js';
import type { IfcPlateTypeEnum } from '../enums/IfcPlateTypeEnum.js';

export interface IfcPlateType extends IfcBuiltElementType {
  PredefinedType: IfcPlateTypeEnum;
}
