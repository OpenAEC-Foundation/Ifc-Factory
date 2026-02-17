import type { IfcBuiltElementType } from './IfcBuiltElementType.js';
import type { IfcChimneyTypeEnum } from '../enums/IfcChimneyTypeEnum.js';

export interface IfcChimneyType extends IfcBuiltElementType {
  PredefinedType: IfcChimneyTypeEnum;
}
