import type { IfcDerivedUnitElement } from './IfcDerivedUnitElement.js';
import type { IfcDerivedUnitEnum } from '../enums/IfcDerivedUnitEnum.js';
import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcDerivedUnit {
  readonly type: string;
  Elements: IfcDerivedUnitElement[];
  UnitType: IfcDerivedUnitEnum;
  UserDefinedType?: IfcLabel | null;
  Name?: IfcLabel | null;
}
