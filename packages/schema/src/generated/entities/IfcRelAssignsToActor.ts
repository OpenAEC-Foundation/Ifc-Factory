import type { IfcRelAssigns } from './IfcRelAssigns.js';
import type { IfcActor } from './IfcActor.js';
import type { IfcActorRole } from './IfcActorRole.js';

export interface IfcRelAssignsToActor extends IfcRelAssigns {
  RelatingActor: IfcActor;
  ActingRole?: IfcActorRole | null;
}
