import type { IfcGroup } from './IfcGroup.js';
import type { IfcAnalysisTheoryTypeEnum } from '../enums/IfcAnalysisTheoryTypeEnum.js';
import type { IfcStructuralLoadGroup } from './IfcStructuralLoadGroup.js';
import type { IfcBoolean } from '../types/IfcBoolean.js';

export interface IfcStructuralResultGroup extends IfcGroup {
  TheoryType: IfcAnalysisTheoryTypeEnum;
  ResultForLoadGroup?: IfcStructuralLoadGroup | null;
  IsLinear: IfcBoolean;
}
