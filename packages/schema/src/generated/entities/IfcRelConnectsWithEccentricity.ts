import type { IfcRelConnectsStructuralMember } from './IfcRelConnectsStructuralMember.js';
import type { IfcConnectionGeometry } from './IfcConnectionGeometry.js';

export interface IfcRelConnectsWithEccentricity extends IfcRelConnectsStructuralMember {
  ConnectionConstraint: IfcConnectionGeometry;
}
