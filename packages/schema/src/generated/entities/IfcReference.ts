import type { IfcIdentifier } from '../types/IfcIdentifier.js';
import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcInteger } from '../types/IfcInteger.js';

export interface IfcReference {
  readonly type: string;
  TypeIdentifier?: IfcIdentifier | null;
  AttributeIdentifier?: IfcIdentifier | null;
  InstanceName?: IfcLabel | null;
  ListPositions?: IfcInteger[] | null;
  InnerReference?: IfcReference | null;
}
