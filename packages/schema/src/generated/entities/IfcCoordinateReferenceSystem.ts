import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcText } from '../types/IfcText.js';
import type { IfcIdentifier } from '../types/IfcIdentifier.js';

export interface IfcCoordinateReferenceSystem {
  readonly type: string;
  Name?: IfcLabel | null;
  Description?: IfcText | null;
  GeodeticDatum?: IfcIdentifier | null;
}
