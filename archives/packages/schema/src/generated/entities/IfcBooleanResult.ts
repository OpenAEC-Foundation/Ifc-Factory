import type { IfcGeometricRepresentationItem } from './IfcGeometricRepresentationItem.js';
import type { IfcBooleanOperator } from '../enums/IfcBooleanOperator.js';
import type { IfcBooleanOperand } from '../selects/IfcBooleanOperand.js';

export interface IfcBooleanResult extends IfcGeometricRepresentationItem {
  Operator: IfcBooleanOperator;
  FirstOperand: IfcBooleanOperand;
  SecondOperand: IfcBooleanOperand;
}
