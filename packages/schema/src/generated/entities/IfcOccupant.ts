import type { IfcActor } from './IfcActor.js';
import type { IfcOccupantTypeEnum } from '../enums/IfcOccupantTypeEnum.js';

export interface IfcOccupant extends IfcActor {
  PredefinedType?: IfcOccupantTypeEnum | null;
}
