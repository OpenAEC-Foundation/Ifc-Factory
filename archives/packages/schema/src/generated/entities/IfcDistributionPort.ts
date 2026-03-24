import type { IfcPort } from './IfcPort.js';
import type { IfcFlowDirectionEnum } from '../enums/IfcFlowDirectionEnum.js';
import type { IfcDistributionPortTypeEnum } from '../enums/IfcDistributionPortTypeEnum.js';
import type { IfcDistributionSystemEnum } from '../enums/IfcDistributionSystemEnum.js';

export interface IfcDistributionPort extends IfcPort {
  FlowDirection?: IfcFlowDirectionEnum | null;
  PredefinedType?: IfcDistributionPortTypeEnum | null;
  SystemType?: IfcDistributionSystemEnum | null;
}
