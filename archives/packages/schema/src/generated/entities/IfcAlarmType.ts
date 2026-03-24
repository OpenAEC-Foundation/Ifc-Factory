import type { IfcDistributionControlElementType } from './IfcDistributionControlElementType.js';
import type { IfcAlarmTypeEnum } from '../enums/IfcAlarmTypeEnum.js';

export interface IfcAlarmType extends IfcDistributionControlElementType {
  PredefinedType: IfcAlarmTypeEnum;
}
