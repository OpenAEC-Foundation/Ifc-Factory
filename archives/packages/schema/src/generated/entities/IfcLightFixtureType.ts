import type { IfcFlowTerminalType } from './IfcFlowTerminalType.js';
import type { IfcLightFixtureTypeEnum } from '../enums/IfcLightFixtureTypeEnum.js';

export interface IfcLightFixtureType extends IfcFlowTerminalType {
  PredefinedType: IfcLightFixtureTypeEnum;
}
