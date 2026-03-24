import type { IfcBuiltElement } from './IfcBuiltElement.js';
import type { IfcRampFlightTypeEnum } from '../enums/IfcRampFlightTypeEnum.js';

export interface IfcRampFlight extends IfcBuiltElement {
  PredefinedType?: IfcRampFlightTypeEnum | null;
}
