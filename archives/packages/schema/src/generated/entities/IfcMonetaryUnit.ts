import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcMonetaryUnit {
  readonly type: string;
  Currency: IfcLabel;
}
