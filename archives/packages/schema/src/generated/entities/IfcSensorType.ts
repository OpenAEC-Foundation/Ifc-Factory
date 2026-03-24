import type { IfcDistributionControlElementType } from './IfcDistributionControlElementType.js';
import type { IfcSensorTypeEnum } from '../enums/IfcSensorTypeEnum.js';

export interface IfcSensorType extends IfcDistributionControlElementType {
  PredefinedType: IfcSensorTypeEnum;
}
