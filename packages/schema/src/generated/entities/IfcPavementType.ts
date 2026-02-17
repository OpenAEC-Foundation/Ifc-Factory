import type { IfcBuiltElementType } from './IfcBuiltElementType.js';
import type { IfcPavementTypeEnum } from '../enums/IfcPavementTypeEnum.js';

export interface IfcPavementType extends IfcBuiltElementType {
  PredefinedType: IfcPavementTypeEnum;
}
