#include "ifcx/document.h"

#include <algorithm>
#include <iomanip>
#include <sstream>

namespace ifcx {

IfcxDocument::IfcxDocument() {
    header.version = "1.0";
    header.application = "ifcx-cpp";

    // Create default layer "0"
    tables.layers["0"] = Layer{};
}

std::string IfcxDocument::alloc_handle() {
    std::ostringstream oss;
    oss << std::uppercase << std::hex << next_handle_++;
    return oss.str();
}

std::string IfcxDocument::add_entity(Entity entity) {
    if (entity.handle.empty()) {
        entity.handle = alloc_handle();
    }
    std::string handle = entity.handle;
    entities.push_back(std::move(entity));
    return handle;
}

std::vector<Entity*> IfcxDocument::find_by_type(const std::string& type) {
    std::vector<Entity*> result;
    for (auto& ent : entities) {
        if (ent.type == type) {
            result.push_back(&ent);
        }
    }
    return result;
}

std::vector<Entity*> IfcxDocument::find_by_layer(const std::string& layer) {
    std::vector<Entity*> result;
    for (auto& ent : entities) {
        if (ent.layer == layer) {
            result.push_back(&ent);
        }
    }
    return result;
}

IfcxFile IfcxDocument::to_json() const {
    IfcxFile file;
    file.ifcx = "1.0";
    file.header = header;
    file.tables = tables;
    file.blocks = blocks;
    file.entities = entities;
    file.objects = objects;
    file.extensions = extensions;
    return file;
}

IfcxDocument IfcxDocument::from_json(const IfcxFile& file) {
    IfcxDocument doc;
    doc.header = file.header;
    doc.tables = file.tables;
    doc.blocks = file.blocks;
    doc.entities = file.entities;
    doc.objects = file.objects;
    doc.extensions = file.extensions;

    // Compute next_handle_ from existing entity handles
    uint64_t max_handle = 0;
    for (const auto& ent : doc.entities) {
        if (!ent.handle.empty()) {
            try {
                uint64_t h = std::stoull(ent.handle, nullptr, 16);
                if (h > max_handle) {
                    max_handle = h;
                }
            } catch (...) {
                // Non-hex handle, skip
            }
        }
    }
    doc.next_handle_ = max_handle + 1;

    return doc;
}

} // namespace ifcx
