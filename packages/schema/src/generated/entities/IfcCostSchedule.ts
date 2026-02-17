import type { IfcControl } from './IfcControl.js';
import type { IfcCostScheduleTypeEnum } from '../enums/IfcCostScheduleTypeEnum.js';
import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcDateTime } from '../types/IfcDateTime.js';

export interface IfcCostSchedule extends IfcControl {
  PredefinedType?: IfcCostScheduleTypeEnum | null;
  Status?: IfcLabel | null;
  SubmittedOn?: IfcDateTime | null;
  UpdateDate?: IfcDateTime | null;
}
