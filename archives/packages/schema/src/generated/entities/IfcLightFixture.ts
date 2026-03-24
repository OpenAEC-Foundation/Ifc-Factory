import type { IfcFlowTerminal } from './IfcFlowTerminal.js';
import type { IfcLightFixtureTypeEnum } from '../enums/IfcLightFixtureTypeEnum.js';

export interface IfcLightFixture extends IfcFlowTerminal {
  PredefinedType?: IfcLightFixtureTypeEnum | null;
}
