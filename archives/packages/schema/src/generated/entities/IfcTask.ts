import type { IfcProcess } from './IfcProcess.js';
import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcBoolean } from '../types/IfcBoolean.js';
import type { IfcInteger } from '../types/IfcInteger.js';
import type { IfcTaskTime } from './IfcTaskTime.js';
import type { IfcTaskTypeEnum } from '../enums/IfcTaskTypeEnum.js';

export interface IfcTask extends IfcProcess {
  Status?: IfcLabel | null;
  WorkMethod?: IfcLabel | null;
  IsMilestone: IfcBoolean;
  Priority?: IfcInteger | null;
  TaskTime?: IfcTaskTime | null;
  PredefinedType?: IfcTaskTypeEnum | null;
}
