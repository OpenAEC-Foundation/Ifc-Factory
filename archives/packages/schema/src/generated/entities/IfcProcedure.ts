import type { IfcProcess } from './IfcProcess.js';
import type { IfcProcedureTypeEnum } from '../enums/IfcProcedureTypeEnum.js';

export interface IfcProcedure extends IfcProcess {
  PredefinedType?: IfcProcedureTypeEnum | null;
}
