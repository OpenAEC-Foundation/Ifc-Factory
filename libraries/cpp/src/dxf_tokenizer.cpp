#include "ifcx/dxf_parser.h"

#include <algorithm>
#include <cctype>
#include <charconv>
#include <sstream>
#include <string_view>

namespace ifcx {

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

std::string dxf_value_to_string(const DxfValue& v) {
    if (auto* s = std::get_if<std::string>(&v)) return *s;
    if (auto* i = std::get_if<int>(&v)) return std::to_string(*i);
    if (auto* d = std::get_if<double>(&v)) {
        std::ostringstream oss;
        oss << *d;
        return oss.str();
    }
    if (auto* b = std::get_if<bool>(&v)) return *b ? "1" : "0";
    return "";
}

double dxf_value_to_double(const DxfValue& v) {
    if (auto* d = std::get_if<double>(&v)) return *d;
    if (auto* i = std::get_if<int>(&v)) return static_cast<double>(*i);
    if (auto* s = std::get_if<std::string>(&v)) {
        try { return std::stod(*s); } catch (...) { return 0.0; }
    }
    if (auto* b = std::get_if<bool>(&v)) return *b ? 1.0 : 0.0;
    return 0.0;
}

int dxf_value_to_int(const DxfValue& v) {
    if (auto* i = std::get_if<int>(&v)) return *i;
    if (auto* d = std::get_if<double>(&v)) return static_cast<int>(*d);
    if (auto* s = std::get_if<std::string>(&v)) {
        try { return std::stoi(*s); } catch (...) { return 0; }
    }
    if (auto* b = std::get_if<bool>(&v)) return *b ? 1 : 0;
    return 0;
}

// ---------------------------------------------------------------------------
// DxfTokenizer
// ---------------------------------------------------------------------------

std::string DxfTokenizer::value_type_for_code(int code) {
    if (code >= 0 && code <= 9) return "str";
    if (code >= 10 && code <= 39) return "float";
    if (code >= 40 && code <= 59) return "float";
    if (code >= 60 && code <= 79) return "int";
    if (code >= 90 && code <= 99) return "int";
    if (code == 100) return "str";
    if (code == 102) return "str";
    if (code == 105) return "str";
    if (code >= 110 && code <= 149) return "float";
    if (code >= 160 && code <= 169) return "int";
    if (code >= 170 && code <= 179) return "int";
    if (code >= 210 && code <= 239) return "float";
    if (code >= 270 && code <= 289) return "int";
    if (code >= 290 && code <= 299) return "bool";
    if (code >= 300 && code <= 309) return "str";
    if (code >= 310 && code <= 319) return "str";
    if (code >= 320 && code <= 369) return "str";
    if (code >= 370 && code <= 379) return "int";
    if (code >= 380 && code <= 389) return "int";
    if (code >= 390 && code <= 399) return "str";
    if (code >= 410 && code <= 419) return "str";
    if (code >= 420 && code <= 429) return "int";
    if (code >= 430 && code <= 439) return "str";
    if (code >= 440 && code <= 449) return "int";
    if (code == 999) return "str";
    if (code >= 1000 && code <= 1009) return "str";
    if (code >= 1010 && code <= 1059) return "float";
    if (code >= 1060 && code <= 1071) return "int";
    return "str";
}

DxfValue DxfTokenizer::cast_value(int code, const std::string& raw) {
    auto vtype = value_type_for_code(code);
    if (vtype == "float") {
        try { return std::stod(raw); } catch (...) { return 0.0; }
    }
    if (vtype == "int") {
        try { return std::stoi(raw); } catch (...) { return 0; }
    }
    if (vtype == "bool") {
        try { return static_cast<bool>(std::stoi(raw)); } catch (...) { return false; }
    }
    return raw;
}

static std::string trim(const std::string& s) {
    auto start = s.find_first_not_of(" \t\r\n");
    if (start == std::string::npos) return "";
    auto end = s.find_last_not_of(" \t\r\n");
    return s.substr(start, end - start + 1);
}

std::vector<DxfToken> DxfTokenizer::tokenize(const std::string& content) {
    std::vector<DxfToken> tokens;

    // Normalize line endings and split
    std::string normalized;
    normalized.reserve(content.size());
    for (size_t i = 0; i < content.size(); ++i) {
        if (content[i] == '\r') {
            normalized += '\n';
            if (i + 1 < content.size() && content[i + 1] == '\n') {
                ++i;
            }
        } else {
            normalized += content[i];
        }
    }

    // Split into lines
    std::vector<std::string> lines;
    {
        std::istringstream iss(normalized);
        std::string line;
        while (std::getline(iss, line)) {
            lines.push_back(line);
        }
    }

    size_t idx = 0;
    size_t length = lines.size();

    while (idx + 1 < length) {
        std::string code_str = trim(lines[idx]);
        std::string val_str = trim(lines[idx + 1]);
        idx += 2;

        if (code_str.empty()) continue;

        int code;
        try {
            code = std::stoi(code_str);
        } catch (...) {
            continue;
        }

        tokens.push_back({code, cast_value(code, val_str)});
    }

    return tokens;
}

} // namespace ifcx
