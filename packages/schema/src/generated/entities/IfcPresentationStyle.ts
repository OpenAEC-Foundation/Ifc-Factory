import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcPresentationStyle {
  readonly type: string;
  Name?: IfcLabel | null;
}
