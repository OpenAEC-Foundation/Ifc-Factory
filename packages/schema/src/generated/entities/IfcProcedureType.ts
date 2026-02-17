import type { IfcTypeProcess } from './IfcTypeProcess.js';
import type { IfcProcedureTypeEnum } from '../enums/IfcProcedureTypeEnum.js';

export interface IfcProcedureType extends IfcTypeProcess {
  PredefinedType: IfcProcedureTypeEnum;
}
