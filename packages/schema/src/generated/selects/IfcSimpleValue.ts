import type { IfcBinary } from '../types/IfcBinary.js';
import type { IfcBoolean } from '../types/IfcBoolean.js';
import type { IfcDate } from '../types/IfcDate.js';
import type { IfcDateTime } from '../types/IfcDateTime.js';
import type { IfcDuration } from '../types/IfcDuration.js';
import type { IfcIdentifier } from '../types/IfcIdentifier.js';
import type { IfcInteger } from '../types/IfcInteger.js';
import type { IfcLabel } from '../types/IfcLabel.js';
import type { IfcLogical } from '../types/IfcLogical.js';
import type { IfcPositiveInteger } from '../types/IfcPositiveInteger.js';
import type { IfcReal } from '../types/IfcReal.js';
import type { IfcText } from '../types/IfcText.js';
import type { IfcTime } from '../types/IfcTime.js';
import type { IfcTimeStamp } from '../types/IfcTimeStamp.js';
import type { IfcURIReference } from '../types/IfcURIReference.js';

export type IfcSimpleValue = IfcBinary | IfcBoolean | IfcDate | IfcDateTime | IfcDuration | IfcIdentifier | IfcInteger | IfcLabel | IfcLogical | IfcPositiveInteger | IfcReal | IfcText | IfcTime | IfcTimeStamp | IfcURIReference;
