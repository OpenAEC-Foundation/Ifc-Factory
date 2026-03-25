# IfcX Attribute Namespaces

IfcX uses the IFC5 node-based data model where all data is stored as attributes
on nodes, keyed by `publisher::domain::name` namespaces.

## Attribute Registry

### Geometry (`ifcx::geom::*`)

| Attribute Key | Value Type | Description | DXF Equivalent |
|---------------|------------|-------------|----------------|
| `ifcx::geom::line` | `{points: [[x,y,z],[x,y,z]]}` | Line segment | LINE |
| `ifcx::geom::polyline` | `{points: [...], closed: bool}` | Polyline (points only) | LWPOLYLINE (no bulge) |
| `ifcx::geom::compositeCurve` | `{segments: [...], closed: bool}` | Mixed line/arc segments | LWPOLYLINE (with bulge) |
| `ifcx::geom::circle` | `{center: [x,y,z], radius: r}` | Full circle | CIRCLE |
| `ifcx::geom::trimmedCurve` | `{center, radius, startAngle, endAngle}` | Arc / trimmed curve | ARC |
| `ifcx::geom::ellipse` | `{center, semiAxis1, semiAxis2, rotation}` | Full or partial ellipse | ELLIPSE |
| `ifcx::geom::bspline` | `{degree, controlPoints, knots, weights}` | NURBS / B-spline curve | SPLINE |
| `ifcx::geom::indexedPolyCurve` | `{points, segments: [{line/arc}]}` | Indexed polyline+arc | IfcIndexedPolyCurve |
| `ifcx::geom::mesh` | `{points, faceVertexIndices, normals}` | 3D mesh (USD-style) | MESH, 3DFACE |
| `ifcx::geom::solid` | `{data: "..."}` | Solid geometry (ACIS/BRep) | 3DSOLID, REGION |
| `ifcx::geom::point` | `{position: [x,y,z]}` | Point entity | POINT |
| `ifcx::geom::ray` | `{origin, direction}` | Semi-infinite line | RAY |
| `ifcx::geom::constructionLine` | `{origin, direction}` | Infinite construction line | XLINE |

### Transform (`ifcx::xform::*`)

| Attribute Key | Value Type | Description |
|---------------|------------|-------------|
| `ifcx::xform::matrix` | `[[4x4 matrix]]` | Full 4x4 transform (USD-style) |
| `ifcx::xform::translate` | `[x, y, z]` | Translation only |
| `ifcx::xform::rotate` | `number (radians)` | Rotation around Z axis |
| `ifcx::xform::scale` | `[sx, sy, sz]` | Scale factors |
| `ifcx::xform::mirror` | `{axis: "x"|"y", origin: [x,y]}` | Mirror transform |

### Presentation (`ifcx::style::*`)

| Attribute Key | Value Type | Description | DXF/CSS Equivalent |
|---------------|------------|-------------|---------------------|
| `ifcx::style::curveStyle` | `{colour, width, pattern}` | Line appearance | Color + linetype + lineweight |
| `ifcx::style::fillStyle` | `{colour, pattern, opacity}` | Fill appearance | Solid fill / hatch fill |
| `ifcx::style::textStyle` | `{font, size, weight, colour}` | Text appearance | STYLE table |
| `ifcx::style::colour` | `{r, g, b, a}` | RGBA colour (0-1) | IfcColourRgb |
| `ifcx::style::dashPattern` | `[visible, gap, ...]` | Dash pattern (mm) | IfcCurveStyleFontPattern |
| `ifcx::style::lineWeight` | `number (mm)` | Line width | DXF lineweight |
| `ifcx::style::opacity` | `number (0-1)` | Transparency | DXF transparency |
| `ifcx::style::visible` | `boolean` | Visibility | DXF visibility flag |

### SVG/CSS Presentation (`ifcx::svg::*`)

Extends presentation with SVG/CSS properties for Bonsai/INB compatibility:

| Attribute Key | Value Type | Description |
|---------------|------------|-------------|
| `ifcx::svg::class` | `string` | CSS class names (e.g. "cut IfcWall material-beton") |
| `ifcx::svg::style` | `string` | Inline CSS style |
| `ifcx::svg::stroke` | `string` | SVG stroke color |
| `ifcx::svg::strokeWidth` | `number` | SVG stroke width |
| `ifcx::svg::strokeDasharray` | `string` | SVG dash pattern |
| `ifcx::svg::fill` | `string` | SVG fill color or pattern reference |
| `ifcx::svg::fillRule` | `"evenodd" | "nonzero"` | SVG fill rule |
| `ifcx::svg::marker` | `string` | SVG marker reference |
| `ifcx::svg::markerStart` | `string` | SVG start marker (arrows) |
| `ifcx::svg::markerEnd` | `string` | SVG end marker |
| `ifcx::svg::fontFamily` | `string` | Font family |
| `ifcx::svg::fontSize` | `string` | Font size with unit (e.g. "2.5mm") |

### Hatching (`ifcx::hatch::*`)

| Attribute Key | Value Type | Description |
|---------------|------------|-------------|
| `ifcx::hatch::pattern` | `{name, angle, scale, lines: [...]}` | Hatch pattern definition |
| `ifcx::hatch::boundary` | `{outer: "path-ref", inner: ["path-ref"]}` | Hatch boundary references |
| `ifcx::hatch::solid` | `{colour: {r,g,b,a}}` | Solid colour fill |
| `ifcx::hatch::gradient` | `{type, colour1, colour2, angle}` | Gradient fill |
| `ifcx::hatch::svg` | `{patternId, patternTransform}` | SVG pattern reference (INB/NEN47) |
| `ifcx::hatch::material` | `{standard, code, scale}` | Material hatching per national/regional standard |

### Annotation (`ifcx::annotation::*`)

| Attribute Key | Value Type | Description | DXF Equivalent |
|---------------|------------|-------------|----------------|
| `ifcx::annotation::text` | `{value, placement, alignment}` | Text annotation | TEXT / MTEXT |
| `ifcx::annotation::richText` | `{spans: [{text, font, bold, ...}]}` | Formatted text | MTEXT with codes |
| `ifcx::annotation::dimension` | See dimension schema below | Measurement dimension | DIMENSION |
| `ifcx::annotation::leader` | `{path, arrowhead, content}` | Leader/callout | LEADER / MULTILEADER |
| `ifcx::annotation::tolerance` | `{frames: [{symbol, value, datums}]}` | GD&T tolerance | TOLERANCE |
| `ifcx::annotation::table` | `{rows, columns, cells: [...]}` | Data table | TABLE |
| `ifcx::annotation::tag` | `{symbol, label, position}` | Element tag (INB-style) | -- |
| `ifcx::annotation::symbol` | `{name, position, rotation, scale}` | Symbol marker | -- |

### Dimension Schema (`ifcx::annotation::dimension`)

```json
{
  "subtype": "linear|aligned|angular|radius|diameter|ordinate|arc",
  "measurePoints": [[x1,y1], [x2,y2]],
  "dimensionLine": [x, y],
  "value": 4500.0,
  "text": "4500",
  "textPosition": [x, y],
  "style": {
    "arrowType": "closed|open|tick|dot|none",
    "arrowSize": 2.5,
    "textHeight": 2.5,
    "textStyle": "ref-to-style",
    "extensionOffset": 1.5,
    "extensionExtend": 1.25,
    "precision": 0,
    "prefix": "",
    "suffix": "",
    "tolerance": { "upper": 0.5, "lower": -0.5 }
  },
  "associatedGeometry": [{"ref": "wall-guid"}, {"ref": "column-guid"}]
}
```

### Layer/Classification (`ifcx::layer::*`)

| Attribute Key | Value Type | Description |
|---------------|------------|-------------|
| `ifcx::layer::assignment` | `{name, description}` | Layer assignment (replaces DXF layer) |
| `ifcx::layer::style` | `{colour, lineWeight, dashPattern, visible, frozen, locked, plot}` | Layer default style |
| `ifcx::layer::viewportOverride` | `{viewport: "ref", frozen: bool, colour: ...}` | Per-viewport overrides |

### IFC Classification (`bsi::ifc::*`)

Reuses IFC5 attribute namespaces for BIM data:

| Attribute Key | Value Type | Description |
|---------------|------------|-------------|
| `bsi::ifc::class` | `{code: "IfcWall", uri: "..."}` | IFC entity classification |
| `bsi::ifc::material` | `{code: "Concrete", uri: "..."}` | Material assignment |
| `bsi::ifc::prop::*` | `value` | IFC properties (Height, Width, etc.) |
| `bsi::ifc::guid` | `string` | IFC GlobalId for round-tripping |

### Sheet/Layout (`ifcx::sheet::*`)

| Attribute Key | Value Type | Description | DXF Equivalent |
|---------------|------------|-------------|----------------|
| `ifcx::sheet::paper` | `{width, height, margins, orientation}` | Paper/sheet definition | LAYOUT |
| `ifcx::sheet::titleBlock` | `{ref: "block-path", position}` | Title block reference | -- |
| `ifcx::sheet::viewport` | See viewport schema below | View window into model | VIEWPORT |
| `ifcx::sheet::viewTitle` | `{name, number, scale, position}` | View title annotation | -- |
| `ifcx::sheet::plotSettings` | `{scale, area, styleTable}` | Print configuration | PLOTSETTINGS |

### Viewport Schema (`ifcx::sheet::viewport`)

```json
{
  "center": [x, y],
  "width": 200,
  "height": 150,
  "viewTarget": [model_x, model_y, model_z],
  "viewDirection": [0, 0, 1],
  "viewScale": 0.01,
  "twistAngle": 0,
  "frozenLayers": ["Construction"],
  "clipBoundary": {"ref": "clip-path-guid"},
  "locked": true
}
```

### Block/Component (`ifcx::component::*`)

| Attribute Key | Value Type | Description | DXF Equivalent |
|---------------|------------|-------------|----------------|
| `ifcx::component::definition` | `{basePoint, description}` | Block definition metadata | BLOCK header |
| `ifcx::component::reference` | `{definition: "ref", transform}` | Block instance | INSERT |
| `ifcx::component::attribute` | `{tag, value, prompt, position}` | Block attribute | ATTRIB / ATTDEF |

### Raster Image (`ifcx::image::*`)

| Attribute Key | Value Type | Description |
|---------------|------------|-------------|
| `ifcx::image::raster` | `{mediaId, insertionPoint, pixelSize, rotation, clipBoundary}` | Embedded/linked raster image |
| `ifcx::image::wipeout` | `{boundary: [...]}` | Masking area |

### GIS/Geo (`ifcx::geo::*`)

| Attribute Key | Value Type | Description |
|---------------|------------|-------------|
| `ifcx::geo::position` | `{latitude, longitude, altitude}` | Geographic position |
| `ifcx::geo::crs` | `{epsg, wkt}` | Coordinate reference system |
| `ifcx::geo::feature` | `{type: "Point|Line|Polygon", coordinates}` | GeoJSON-compatible geometry |

### Versioning / GitDiff (`ifcx::revision::*`)

Built-in version control. Every change is stored as node overrides.
The file IS the repository - no external VCS needed.

| Attribute Key | Value Type | Description |
|---------------|------------|-------------|
| `ifcx::revision::info` | `{id, parent, timestamp, author, message, tag}` | Revision metadata (like a git commit) |
| `ifcx::revision::stats` | `{nodesAdded, nodesModified, nodesRemoved}` | Change statistics |
| `ifcx::revision::created` | `string (revision-id)` | Revision in which this node was created |
| `ifcx::revision::modified` | `{revision, previous: {attr: old_value}}` | Change record with undo data |
| `ifcx::revision::deleted` | `{revision, previous: {attr: old_value}}` | Deletion record with undo data |
| `ifcx::revision::branch` | `string` | Branch name (for parallel development) |
| `ifcx::revision::merge` | `{source, sourceBranch, conflicts, strategy}` | Merge information |

Operations: checkout (any revision), diff (between revisions), branch, merge with conflict resolution.
See [versioning.md](../docs/versioning.md) for full documentation.
