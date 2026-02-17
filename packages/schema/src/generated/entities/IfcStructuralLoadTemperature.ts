import type { IfcStructuralLoadStatic } from './IfcStructuralLoadStatic.js';
import type { IfcThermodynamicTemperatureMeasure } from '../types/IfcThermodynamicTemperatureMeasure.js';

export interface IfcStructuralLoadTemperature extends IfcStructuralLoadStatic {
  DeltaTConstant?: IfcThermodynamicTemperatureMeasure | null;
  DeltaTY?: IfcThermodynamicTemperatureMeasure | null;
  DeltaTZ?: IfcThermodynamicTemperatureMeasure | null;
}
