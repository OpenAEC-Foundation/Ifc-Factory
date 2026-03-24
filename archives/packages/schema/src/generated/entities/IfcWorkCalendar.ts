import type { IfcControl } from './IfcControl.js';
import type { IfcWorkTime } from './IfcWorkTime.js';
import type { IfcWorkCalendarTypeEnum } from '../enums/IfcWorkCalendarTypeEnum.js';

export interface IfcWorkCalendar extends IfcControl {
  WorkingTimes?: IfcWorkTime[] | null;
  ExceptionTimes?: IfcWorkTime[] | null;
  PredefinedType?: IfcWorkCalendarTypeEnum | null;
}
