import type { IfcFlowSegmentType } from './IfcFlowSegmentType.js';
import type { IfcPipeSegmentTypeEnum } from '../enums/IfcPipeSegmentTypeEnum.js';

export interface IfcPipeSegmentType extends IfcFlowSegmentType {
  PredefinedType: IfcPipeSegmentTypeEnum;
}
