import type { IfcTypeProcess } from './IfcTypeProcess.js';
import type { IfcTaskTypeEnum } from '../enums/IfcTaskTypeEnum.js';
import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcTaskType extends IfcTypeProcess {
  PredefinedType: IfcTaskTypeEnum;
  WorkMethod?: IfcLabel | null;
}
