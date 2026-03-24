import type { IfcFlowSegmentType } from './IfcFlowSegmentType.js';
import type { IfcCableSegmentTypeEnum } from '../enums/IfcCableSegmentTypeEnum.js';

export interface IfcCableSegmentType extends IfcFlowSegmentType {
  PredefinedType: IfcCableSegmentTypeEnum;
}
