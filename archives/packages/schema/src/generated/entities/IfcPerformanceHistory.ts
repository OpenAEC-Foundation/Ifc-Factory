import type { IfcControl } from './IfcControl.js';
import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcPerformanceHistoryTypeEnum } from '../enums/IfcPerformanceHistoryTypeEnum.js';

export interface IfcPerformanceHistory extends IfcControl {
  LifeCyclePhase: IfcLabel;
  PredefinedType?: IfcPerformanceHistoryTypeEnum | null;
}
