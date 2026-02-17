export type IfcId = number;

export interface IfcGenericEntity {
  expressID: IfcId;
  type: string;
  [key: string]: unknown;
}
