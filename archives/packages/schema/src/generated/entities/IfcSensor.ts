import type { IfcDistributionControlElement } from './IfcDistributionControlElement.js';
import type { IfcSensorTypeEnum } from '../enums/IfcSensorTypeEnum.js';

export interface IfcSensor extends IfcDistributionControlElement {
  PredefinedType?: IfcSensorTypeEnum | null;
}
