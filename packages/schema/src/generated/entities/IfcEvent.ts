import type { IfcProcess } from './IfcProcess.js';
import type { IfcEventTypeEnum } from '../enums/IfcEventTypeEnum.js';
import type { IfcEventTriggerTypeEnum } from '../enums/IfcEventTriggerTypeEnum.js';
import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcEventTime } from './IfcEventTime.js';

export interface IfcEvent extends IfcProcess {
  PredefinedType?: IfcEventTypeEnum | null;
  EventTriggerType?: IfcEventTriggerTypeEnum | null;
  UserDefinedEventTriggerType?: IfcLabel | null;
  EventOccurenceTime?: IfcEventTime | null;
}
