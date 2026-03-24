import type { IfcGroup } from './IfcGroup.js';
import type { IfcLoadGroupTypeEnum } from '../enums/IfcLoadGroupTypeEnum.js';
import type { IfcActionTypeEnum } from '../enums/IfcActionTypeEnum.js';
import type { IfcActionSourceTypeEnum } from '../enums/IfcActionSourceTypeEnum.js';
import type { IfcRatioMeasure } from '../types/IfcRatioMeasure.js';
import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcStructuralLoadGroup extends IfcGroup {
  PredefinedType: IfcLoadGroupTypeEnum;
  ActionType: IfcActionTypeEnum;
  ActionSource: IfcActionSourceTypeEnum;
  Coefficient?: IfcRatioMeasure | null;
  Purpose?: IfcLabel | null;
}
