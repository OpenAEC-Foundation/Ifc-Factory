import type { IfcBuiltElementType } from './IfcBuiltElementType.js';
import type { IfcMemberTypeEnum } from '../enums/IfcMemberTypeEnum.js';

export interface IfcMemberType extends IfcBuiltElementType {
  PredefinedType: IfcMemberTypeEnum;
}
