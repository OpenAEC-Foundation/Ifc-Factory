import type { IfcBuiltElementType } from './IfcBuiltElementType.js';
import type { IfcFootingTypeEnum } from '../enums/IfcFootingTypeEnum.js';

export interface IfcFootingType extends IfcBuiltElementType {
  PredefinedType: IfcFootingTypeEnum;
}
