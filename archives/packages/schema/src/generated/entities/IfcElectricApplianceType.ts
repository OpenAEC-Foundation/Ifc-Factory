import type { IfcFlowTerminalType } from './IfcFlowTerminalType.js';
import type { IfcElectricApplianceTypeEnum } from '../enums/IfcElectricApplianceTypeEnum.js';

export interface IfcElectricApplianceType extends IfcFlowTerminalType {
  PredefinedType: IfcElectricApplianceTypeEnum;
}
