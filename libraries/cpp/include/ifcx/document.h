#ifndef IFCX_DOCUMENT_H
#define IFCX_DOCUMENT_H

#include <cstdint>
#include <string>
#include <vector>

#include "ifcx/types.h"

namespace ifcx {

class IfcxDocument {
public:
    /// Construct an empty document with a default header.
    IfcxDocument();

    /// Allocate a new unique handle string.
    std::string alloc_handle();

    /// Add an entity, assigning a handle if empty. Returns the handle.
    std::string add_entity(Entity entity);

    /// Find all entities whose type matches the given string.
    std::vector<Entity*> find_by_type(const std::string& type);

    /// Find all entities on the given layer.
    std::vector<Entity*> find_by_layer(const std::string& layer);

    /// Serialize the document to an IfcxFile struct.
    IfcxFile to_json() const;

    /// Deserialize from an IfcxFile struct.
    static IfcxDocument from_json(const IfcxFile& file);

    // Public data members
    Header header;
    Tables tables;
    std::map<std::string, BlockDefinition> blocks;
    std::vector<Entity> entities;
    std::vector<DrawingObject> objects;
    nlohmann::json extensions = nlohmann::json::object();

private:
    uint64_t next_handle_ = 1;
};

} // namespace ifcx

#endif // IFCX_DOCUMENT_H
