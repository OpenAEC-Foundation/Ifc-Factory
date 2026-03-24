import type { IfcWorkControl } from './IfcWorkControl.js';
import type { IfcWorkScheduleTypeEnum } from '../enums/IfcWorkScheduleTypeEnum.js';

export interface IfcWorkSchedule extends IfcWorkControl {
  PredefinedType?: IfcWorkScheduleTypeEnum | null;
}
