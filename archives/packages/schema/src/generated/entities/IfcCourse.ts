import type { IfcBuiltElement } from './IfcBuiltElement.js';
import type { IfcCourseTypeEnum } from '../enums/IfcCourseTypeEnum.js';

export interface IfcCourse extends IfcBuiltElement {
  PredefinedType?: IfcCourseTypeEnum | null;
}
