import type { IfcPropertyAbstraction } from './IfcPropertyAbstraction.js';
import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcValue } from '../selects/IfcValue.js';
import type { IfcUnit } from '../selects/IfcUnit.js';

export interface IfcPropertyEnumeration extends IfcPropertyAbstraction {
  Name: IfcLabel;
  EnumerationValues: IfcValue[];
  Unit?: IfcUnit | null;
}
