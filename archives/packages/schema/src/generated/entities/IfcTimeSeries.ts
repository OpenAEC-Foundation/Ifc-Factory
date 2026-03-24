import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcText } from '../types/IfcText.js';
import type { IfcDateTime } from '../types/IfcDateTime.js';
import type { IfcTimeSeriesDataTypeEnum } from '../enums/IfcTimeSeriesDataTypeEnum.js';
import type { IfcDataOriginEnum } from '../enums/IfcDataOriginEnum.js';
import type { IfcUnit } from '../selects/IfcUnit.js';

export interface IfcTimeSeries {
  readonly type: string;
  Name: IfcLabel;
  Description?: IfcText | null;
  StartTime: IfcDateTime;
  EndTime: IfcDateTime;
  TimeSeriesDataType: IfcTimeSeriesDataTypeEnum;
  DataOrigin: IfcDataOriginEnum;
  UserDefinedDataOrigin?: IfcLabel | null;
  Unit?: IfcUnit | null;
}
