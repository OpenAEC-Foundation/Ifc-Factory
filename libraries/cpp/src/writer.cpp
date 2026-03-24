#include "ifcx/writer.h"

#include <fstream>
#include <stdexcept>

namespace ifcx {

std::string IfcxWriter::to_string(const IfcxDocument& doc, int indent) {
    IfcxFile file = doc.to_json();
    nlohmann::json j = file;
    return j.dump(indent);
}

void IfcxWriter::to_file(const IfcxDocument& doc,
                          const std::filesystem::path& path,
                          int indent) {
    std::ofstream ofs(path);
    if (!ofs.is_open()) {
        throw std::runtime_error("Failed to open file for writing: " + path.string());
    }

    IfcxFile file = doc.to_json();
    nlohmann::json j = file;
    ofs << j.dump(indent) << '\n';
}

} // namespace ifcx
