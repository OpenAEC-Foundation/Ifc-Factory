export interface IfcObjectPlacement {
  readonly type: string;
  PlacementRelTo?: IfcObjectPlacement | null;
}
