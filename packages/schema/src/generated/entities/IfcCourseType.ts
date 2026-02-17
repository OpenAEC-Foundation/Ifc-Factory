import type { IfcBuiltElementType } from './IfcBuiltElementType.js';
import type { IfcCourseTypeEnum } from '../enums/IfcCourseTypeEnum.js';

export interface IfcCourseType extends IfcBuiltElementType {
  PredefinedType: IfcCourseTypeEnum;
}
