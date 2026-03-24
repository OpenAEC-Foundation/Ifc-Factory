import type { IfcDistributionControlElement } from './IfcDistributionControlElement.js';
import type { IfcAlarmTypeEnum } from '../enums/IfcAlarmTypeEnum.js';

export interface IfcAlarm extends IfcDistributionControlElement {
  PredefinedType?: IfcAlarmTypeEnum | null;
}
