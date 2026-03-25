#ifndef IFCX_V2_CONVERTER_H
#define IFCX_V2_CONVERTER_H

#include "ifcx/document.h"

#include <map>
#include <string>
#include <vector>

#include <nlohmann/json.hpp>

namespace ifcx {

/// Converts between v1 IfcxDocument and v2 IFC5-node-based JSON format.
class V2Converter {
public:
    /// Convert a v1 IfcxDocument to a v2 JSON structure.
    /// Returns a JSON object with keys: header, imports, data, media.
    static nlohmann::json from_v1(const IfcxDocument& doc);

    /// Convert a v2 JSON structure back to a v1 IfcxDocument.
    static IfcxDocument to_v1(const nlohmann::json& v2_data);

private:
    // ---- from_v1 helpers ----

    static std::string uid();
    static nlohmann::json ensure_3d(const nlohmann::json& pt);
    static nlohmann::json ensure_3d_array(const nlohmann::json& arr);
    static nlohmann::json build_insert_matrix(
        const nlohmann::json& insert_pt,
        double x_scale, double y_scale, double z_scale,
        double rotation);
    static nlohmann::json aci_to_rgb(const nlohmann::json& aci);

    static nlohmann::json entity_to_node(
        const nlohmann::json& ent,
        const std::string& path,
        const std::map<std::string, std::string>& layer_paths,
        const std::map<std::string, std::string>& style_paths,
        const std::map<std::string, std::string>& block_paths);

    static nlohmann::json lwpoly_to_segments(const nlohmann::json& ent);

    // ---- to_v1 helpers ----

    static int rgb_to_aci(const nlohmann::json& rgb);
    static nlohmann::json node_to_entity(
        const nlohmann::json& node,
        const std::map<std::string, nlohmann::json>& nodes_by_path,
        const std::map<std::string, std::string>& layer_name_by_path);

    static std::pair<std::vector<nlohmann::json>, std::vector<double>>
        segments_to_lwpoly(const nlohmann::json& segments);
};

} // namespace ifcx

#endif // IFCX_V2_CONVERTER_H
