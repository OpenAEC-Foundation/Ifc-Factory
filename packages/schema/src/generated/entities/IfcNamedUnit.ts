import type { IfcDimensionalExponents } from './IfcDimensionalExponents.js';
import type { IfcUnitEnum } from '../enums/IfcUnitEnum.js';

export interface IfcNamedUnit {
  readonly type: string;
  Dimensions: IfcDimensionalExponents;
  UnitType: IfcUnitEnum;
}
