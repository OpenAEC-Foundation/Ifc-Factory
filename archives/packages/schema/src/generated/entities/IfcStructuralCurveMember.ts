import type { IfcStructuralMember } from './IfcStructuralMember.js';
import type { IfcStructuralCurveMemberTypeEnum } from '../enums/IfcStructuralCurveMemberTypeEnum.js';
import type { IfcDirection } from './IfcDirection.js';

export interface IfcStructuralCurveMember extends IfcStructuralMember {
  PredefinedType: IfcStructuralCurveMemberTypeEnum;
  Axis: IfcDirection;
}
