import type { IfcRelConnects } from './IfcRelConnects.js';
import type { IfcStructuralMember } from './IfcStructuralMember.js';
import type { IfcStructuralConnection } from './IfcStructuralConnection.js';
import type { IfcBoundaryCondition } from './IfcBoundaryCondition.js';
import type { IfcStructuralConnectionCondition } from './IfcStructuralConnectionCondition.js';
import type { IfcLengthMeasure } from '../types/IfcLengthMeasure.js';
import type { IfcAxis2Placement3D } from './IfcAxis2Placement3D.js';

export interface IfcRelConnectsStructuralMember extends IfcRelConnects {
  RelatingStructuralMember: IfcStructuralMember;
  RelatedStructuralConnection: IfcStructuralConnection;
  AppliedCondition?: IfcBoundaryCondition | null;
  AdditionalConditions?: IfcStructuralConnectionCondition | null;
  SupportedLength?: IfcLengthMeasure | null;
  ConditionCoordinateSystem?: IfcAxis2Placement3D | null;
}
