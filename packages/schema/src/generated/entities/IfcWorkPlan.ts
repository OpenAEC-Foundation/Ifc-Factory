import type { IfcWorkControl } from './IfcWorkControl.js';
import type { IfcWorkPlanTypeEnum } from '../enums/IfcWorkPlanTypeEnum.js';

export interface IfcWorkPlan extends IfcWorkControl {
  PredefinedType?: IfcWorkPlanTypeEnum | null;
}
