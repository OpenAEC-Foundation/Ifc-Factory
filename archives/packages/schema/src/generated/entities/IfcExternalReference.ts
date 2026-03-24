import type { IfcURIReference } from '../types/IfcURIReference.js';
import type { IfcIdentifier } from '../types/IfcIdentifier.js';
import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcExternalReference {
  readonly type: string;
  Location?: IfcURIReference | null;
  Identification?: IfcIdentifier | null;
  Name?: IfcLabel | null;
}
