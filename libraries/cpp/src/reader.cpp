#include "ifcx/reader.h"

#include <fstream>
#include <sstream>
#include <stdexcept>

namespace ifcx {

IfcxDocument IfcxReader::from_string(const std::string& json_str) {
    nlohmann::json j = nlohmann::json::parse(json_str);
    IfcxFile file = j.get<IfcxFile>();
    return IfcxDocument::from_json(file);
}

IfcxDocument IfcxReader::from_file(const std::filesystem::path& path) {
    std::ifstream ifs(path);
    if (!ifs.is_open()) {
        throw std::runtime_error("Failed to open file: " + path.string());
    }

    std::ostringstream ss;
    ss << ifs.rdbuf();
    return from_string(ss.str());
}

} // namespace ifcx
