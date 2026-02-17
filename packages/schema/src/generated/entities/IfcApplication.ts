import type { IfcOrganization } from './IfcOrganization.js';
import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcIdentifier } from '../types/IfcIdentifier.js';

export interface IfcApplication {
  readonly type: string;
  ApplicationDeveloper: IfcOrganization;
  Version: IfcLabel;
  ApplicationFullName: IfcLabel;
  ApplicationIdentifier: IfcIdentifier;
}
