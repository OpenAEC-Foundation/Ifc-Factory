import type { IfcBuiltElementType } from './IfcBuiltElementType.js';
import type { IfcRoofTypeEnum } from '../enums/IfcRoofTypeEnum.js';

export interface IfcRoofType extends IfcBuiltElementType {
  PredefinedType: IfcRoofTypeEnum;
}
