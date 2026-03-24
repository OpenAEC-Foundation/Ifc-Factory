import type { IfcTypeProcess } from './IfcTypeProcess.js';
import type { IfcEventTypeEnum } from '../enums/IfcEventTypeEnum.js';
import type { IfcEventTriggerTypeEnum } from '../enums/IfcEventTriggerTypeEnum.js';
import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcEventType extends IfcTypeProcess {
  PredefinedType: IfcEventTypeEnum;
  EventTriggerType: IfcEventTriggerTypeEnum;
  UserDefinedEventTriggerType?: IfcLabel | null;
}
