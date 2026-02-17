import type { IfcFlowTerminal } from './IfcFlowTerminal.js';
import type { IfcElectricApplianceTypeEnum } from '../enums/IfcElectricApplianceTypeEnum.js';

export interface IfcElectricAppliance extends IfcFlowTerminal {
  PredefinedType?: IfcElectricApplianceTypeEnum | null;
}
