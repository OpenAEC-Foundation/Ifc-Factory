import type { IfcMapConversion } from './IfcMapConversion.js';
import type { IfcReal } from '../types/IfcReal.js';

export interface IfcMapConversionScaled extends IfcMapConversion {
  FactorX: IfcReal;
  FactorY: IfcReal;
  FactorZ: IfcReal;
}
