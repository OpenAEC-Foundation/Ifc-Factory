# Viewer Inspiration: IFC Graph Viewers & Schema Visualization

Research notes for improving our IfcX schema graph viewer (`schema-graph.html`).

## Sources Studied

- [IFC Graph Viewer (Render)](https://ifcgraphviewer.onrender.com/) -- web-based IFC entity-relationship graph viewer
- [OSArch: Graph viewer of IFC structure in Bonsai](https://community.osarch.org/discussion/2921/graph-viewer-of-ifc-structure-in-bonsai-interested-features) -- community discussion on IFC graph viewer features
- [kiyuka829/ifc-graph-viewer (GitHub)](https://github.com/kiyuka829/ifc-graph-viewer) -- open-source IFC graph viewer using GraphViz
- [vasturiano/force-graph](https://github.com/vasturiano/force-graph) -- force-directed graph on HTML5 canvas
- [IFCWebServer](https://ifcwebserver.org/) -- cloud BIM server with graph database backend
- [Open IFC Viewer](https://openifcviewer.com/) -- tree-based IFC hierarchy viewer
- Our existing viewer: `docs/schema-graph.html`

---

## What IFC Graph Viewers Typically Show

1. **Entity hierarchy** -- spatial decomposition (Project > Site > Building > Storey > Element)
2. **Type relationships** -- which elements inherit from which types
3. **Cross-references** -- style assignments, layer memberships, material associations
4. **Properties/attributes** -- displayed on click/hover as key-value lists
5. **Schema metadata** -- namespace prefixes, class names, attribute types

Our existing `schema-graph.html` already covers items 1-5 for the IfcX schema. The areas below focus on what we can improve.

---

## Visualization Approaches Observed

| Approach | Used by | Strengths | Weaknesses |
|---|---|---|---|
| **Force-directed (D3/canvas)** | vasturiano/force-graph, IFCWebServer | Organic layout, good for exploring unknown structures | Unstable with many nodes, slow convergence |
| **Static positioned (canvas)** | Our schema-graph.html | Deterministic layout, fast rendering | Manual positioning, hard to maintain |
| **GraphViz (DOT)** | kiyuka829/ifc-graph-viewer | Automatic layout, handles large graphs | Not interactive, requires server-side rendering |
| **Tree/hierarchy (DOM)** | Open IFC Viewer, Bonsai | Familiar UX, good for deep hierarchies | Poor at showing cross-references |

---

## UI/UX Ideas to Adopt or Adapt

### 1. Improved Filtering (Priority: High)

Our current filter buttons (Alles, IFC5 Basis, Tekeningen, etc.) are a good start. Improvements:

- **Multi-select filters**: Allow combining filters (e.g., show Drawing + Style simultaneously) instead of radio-button style. Use toggle buttons or checkboxes.
- **Search/filter by name**: Add a text input that highlights matching nodes and dims non-matching ones. IFCWebServer and Open IFC Viewer both provide search.
- **Filter by edge type**: Let users show/hide specific relationship types (children, inherits, connects) independently.

### 2. Better Tooltip / Detail Panel (Priority: High)

Current behavior: tooltip appears on mousedown and follows cursor. Improvements:

- **Fixed side panel**: On click, pin a detail panel to the right side showing all attributes, connected nodes, and the node's path in the hierarchy. The OSArch discussion specifically calls out wanting "clicking on nodes to select elements."
- **Hover preview vs. click detail**: Light tooltip on hover (just name + type), full detail on click.
- **Show incoming and outgoing edges**: List what connects TO this node, not just its own attributes.

### 3. Visual Hierarchy Depth (Priority: Medium)

- **Collapsible subtrees**: Click a parent node to collapse/expand its children. This is the top feature request in the OSArch Bonsai discussion ("graph recursion depth").
- **Semantic zoom**: At low zoom levels, cluster leaf nodes into their parent and show a count badge. At high zoom, expand fully.
- **Breadcrumb trail**: Show the path from root to the currently selected node.

### 4. Edge Rendering Improvements (Priority: Medium)

Our current edge types (solid = children, dashed = inherits, dotted-curved = connects) work but could be clearer:

- **Arrowheads**: Add directional arrows to show parent-to-child flow and reference direction.
- **Edge labels on hover only**: Currently all edge labels render at once, creating visual clutter. Show labels only when hovering near an edge or when its connected node is selected.
- **Highlight connected edges**: When a node is selected, highlight all its edges and dim everything else.

### 5. Color and Styling Refinements (Priority: Low)

Our current palette (blue, purple, green, orange, red, yellow, teal, pink, grey) for 10 categories is already well-differentiated. Minor tweaks:

- **Increase node glow on hover** (not just on drag) to give immediate visual feedback.
- **Dim unrelated nodes** when a node is selected -- "focus + context" technique.
- **Dark background with subtle grid** to help users judge distances and alignment.

### 6. Layout Options (Priority: Medium)

- **Auto-layout toggle**: Add a button to switch between manual (current static) and auto (force-directed) layout. Force-directed is better for exploration; static is better for documentation.
- **Snap-to-grid**: When dragging nodes in static mode, snap to an invisible grid for cleaner alignment.
- **Export positions**: Save node positions to JSON so manual layouts can be preserved across page reloads.

### 7. Large Graph Handling (Priority: Future)

The OSArch discussion and the kiyuka829 viewer both note that large IFC files (thousands of entities) overwhelm graph viewers. Strategies:

- **Entity blacklists**: Let users hide common low-value entity types (e.g., IfcOwnerHistory, IfcCartesianPoint) that create noise. The OSArch discussion explicitly mentions this.
- **Level-of-detail**: At overview zoom, show only top-level containers. Progressive disclosure as the user zooms in.
- **Virtual viewport rendering**: Only render nodes visible in the current viewport (our canvas approach already supports this naturally).

---

## Implementation Priorities for schema-graph.html

| Priority | Feature | Effort |
|---|---|---|
| 1 | Search/highlight by name | Small -- add input + filter logic |
| 2 | Click-to-pin detail panel (right side) | Medium -- add DOM panel + click handler |
| 3 | Hover glow + dim unrelated nodes | Small -- modify draw loop |
| 4 | Multi-select category filters | Small -- change filter logic from single to set |
| 5 | Collapsible subtrees | Medium -- add expand/collapse state per node |
| 6 | Arrowheads on edges | Small -- add arrow drawing in edge render |
| 7 | Auto-layout (force-directed) toggle | Large -- implement force simulation |
| 8 | Export/import node positions | Medium -- localStorage or JSON download |

---

## Key Takeaway

The most impactful improvement is **interactivity depth**: moving from "look at a static diagram" to "explore a living graph." The three pillars are:

1. **Search** -- find what you are looking for
2. **Focus** -- click to isolate a node and its neighborhood
3. **Collapse** -- manage complexity by hiding subtrees

Our canvas-based renderer is already performant. The improvements above are additive and can be implemented incrementally without changing the rendering architecture.
