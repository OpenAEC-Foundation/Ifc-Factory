"""In-memory representation of an IFCX document."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from typing import Any


@dataclass
class IfcxDocument:
    """IFCX drawing document."""

    ifcx: str = "1.0"
    header: dict[str, Any] = field(default_factory=lambda: {
        "units": {"measurement": "metric", "linear": "millimeters"}
    })
    tables: dict[str, Any] = field(default_factory=lambda: {
        "layers": {"0": {}},
        "linetypes": {},
        "textStyles": {},
        "dimStyles": {},
    })
    blocks: dict[str, Any] = field(default_factory=dict)
    entities: list[dict[str, Any]] = field(default_factory=list)
    objects: list[dict[str, Any]] = field(default_factory=list)
    extensions: dict[str, Any] = field(default_factory=dict)

    _next_handle: int = field(default=1, repr=False)

    def alloc_handle(self) -> str:
        """Generate a unique hex handle."""
        handle = format(self._next_handle, "X")
        self._next_handle += 1
        return handle

    def add_layer(self, name: str, **props: Any) -> None:
        """Add a layer to the document."""
        self.tables.setdefault("layers", {})[name] = props

    def add_linetype(self, name: str, **props: Any) -> None:
        """Add a linetype definition."""
        self.tables.setdefault("linetypes", {})[name] = props

    def add_text_style(self, name: str, **props: Any) -> None:
        """Add a text style."""
        self.tables.setdefault("textStyles", {})[name] = props

    def add_dim_style(self, name: str, **props: Any) -> None:
        """Add a dimension style."""
        self.tables.setdefault("dimStyles", {})[name] = props

    def add_entity(self, entity: dict[str, Any]) -> str:
        """Add an entity and auto-assign handle."""
        handle = self.alloc_handle()
        entity["handle"] = handle
        self.entities.append(entity)
        return handle

    def add_block(self, name: str, **props: Any) -> None:
        """Add a block definition."""
        props["name"] = name
        self.blocks[name] = props

    def find_by_type(self, entity_type: str) -> list[dict[str, Any]]:
        """Find all entities of a given type."""
        return [e for e in self.entities if e.get("type") == entity_type]

    def find_by_layer(self, layer: str) -> list[dict[str, Any]]:
        """Find all entities on a given layer."""
        return [e for e in self.entities if e.get("layer") == layer]

    def get_by_handle(self, handle: str) -> dict[str, Any] | None:
        """Get entity by handle."""
        for e in self.entities:
            if e.get("handle") == handle:
                return e
        return None

    def to_dict(self) -> dict[str, Any]:
        """Serialize to dictionary."""
        return {
            "ifcx": self.ifcx,
            "header": self.header,
            "tables": self.tables,
            "blocks": self.blocks,
            "entities": self.entities,
            "objects": self.objects,
            "extensions": self.extensions,
        }

    def to_json(self, indent: int = 2) -> str:
        """Serialize to JSON string."""
        return json.dumps(self.to_dict(), indent=indent)

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> IfcxDocument:
        """Create from dictionary."""
        return cls(
            ifcx=data.get("ifcx", "1.0"),
            header=data.get("header", {}),
            tables=data.get("tables", {}),
            blocks=data.get("blocks", {}),
            entities=data.get("entities", []),
            objects=data.get("objects", []),
            extensions=data.get("extensions", {}),
        )

    @classmethod
    def from_json(cls, json_str: str) -> IfcxDocument:
        """Create from JSON string."""
        return cls.from_dict(json.loads(json_str))
