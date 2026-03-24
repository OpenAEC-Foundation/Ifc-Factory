import type { IfcLabel } from '../types/IfcLabel.js';

export interface IfcAlignmentParameterSegment {
  readonly type: string;
  StartTag?: IfcLabel | null;
  EndTag?: IfcLabel | null;
}
