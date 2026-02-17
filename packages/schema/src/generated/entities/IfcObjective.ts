import type { IfcConstraint } from './IfcConstraint.js';
import type { IfcLogicalOperatorEnum } from '../enums/IfcLogicalOperatorEnum.js';
import type { IfcObjectiveEnum } from '../enums/IfcObjectiveEnum.js';
import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcObjective extends IfcConstraint {
  BenchmarkValues?: IfcConstraint[] | null;
  LogicalAggregator?: IfcLogicalOperatorEnum | null;
  ObjectiveQualifier: IfcObjectiveEnum;
  UserDefinedQualifier?: IfcLabel | null;
}
