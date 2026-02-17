import type { IfcFlowSegmentType } from './IfcFlowSegmentType.js';
import type { IfcCableCarrierSegmentTypeEnum } from '../enums/IfcCableCarrierSegmentTypeEnum.js';

export interface IfcCableCarrierSegmentType extends IfcFlowSegmentType {
  PredefinedType: IfcCableCarrierSegmentTypeEnum;
}
