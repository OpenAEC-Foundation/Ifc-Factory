import type { IfcStructuralMember } from './IfcStructuralMember.js';
import type { IfcStructuralSurfaceMemberTypeEnum } from '../enums/IfcStructuralSurfaceMemberTypeEnum.js';
import type { IfcPositiveLengthMeasure } from '../types/IfcPositiveLengthMeasure.js';

export interface IfcStructuralSurfaceMember extends IfcStructuralMember {
  PredefinedType: IfcStructuralSurfaceMemberTypeEnum;
  Thickness?: IfcPositiveLengthMeasure | null;
}
