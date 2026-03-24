import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcRepresentationContext {
  readonly type: string;
  ContextIdentifier?: IfcLabel | null;
  ContextType?: IfcLabel | null;
}
