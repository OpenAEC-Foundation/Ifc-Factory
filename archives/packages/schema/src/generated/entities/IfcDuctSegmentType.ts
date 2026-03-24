import type { IfcFlowSegmentType } from './IfcFlowSegmentType.js';
import type { IfcDuctSegmentTypeEnum } from '../enums/IfcDuctSegmentTypeEnum.js';

export interface IfcDuctSegmentType extends IfcFlowSegmentType {
  PredefinedType: IfcDuctSegmentTypeEnum;
}
