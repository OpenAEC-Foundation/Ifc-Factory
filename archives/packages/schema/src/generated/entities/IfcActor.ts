import type { IfcObject } from './IfcObject.js';
import type { IfcActorSelect } from '../selects/IfcActorSelect.js';

export interface IfcActor extends IfcObject {
  TheActor: IfcActorSelect;
}
