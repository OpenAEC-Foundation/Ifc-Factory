import type { IfcElementComponentType } from './IfcElementComponentType.js';
import type { IfcBuildingElementPartTypeEnum } from '../enums/IfcBuildingElementPartTypeEnum.js';

export interface IfcBuildingElementPartType extends IfcElementComponentType {
  PredefinedType: IfcBuildingElementPartTypeEnum;
}
