cmake_minimum_required(VERSION 3.14)
project(ifcx VERSION 1.0.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
set(CMAKE_CXX_EXTENSIONS OFF)

# Dependencies
find_package(nlohmann_json 3.11.0 REQUIRED)
find_package(zstd REQUIRED)

# Library sources
set(IFCX_SOURCES
    src/document.cpp
    src/reader.cpp
    src/writer.cpp
    src/binary.cpp
    src/dxf_tokenizer.cpp
    src/dxf_parser.cpp
    src/dxf_import.cpp
    src/dxf_export.cpp
    src/dxf_writer.cpp
    src/dwg_bitreader.cpp
    src/dwg_parser.cpp
    src/dwg_import.cpp
    src/dgn_parser.cpp
    src/dgn_import.cpp
)

# Library target
add_library(ifcx ${IFCX_SOURCES})
add_library(ifcx::ifcx ALIAS ifcx)

target_include_directories(ifcx
    PUBLIC
        $<BUILD_INTERFACE:${CMAKE_CURRENT_SOURCE_DIR}/include>
        $<INSTALL_INTERFACE:include>
)

target_link_libraries(ifcx
    PUBLIC
        nlohmann_json::nlohmann_json
    PRIVATE
        $<TARGET_NAME_IF_EXISTS:zstd::libzstd_shared>
        $<TARGET_NAME_IF_EXISTS:zstd::libzstd_static>
)

# Install rules
include(GNUInstallDirs)

install(TARGETS ifcx
    EXPORT ifcxTargets
    LIBRARY DESTINATION ${CMAKE_INSTALL_LIBDIR}
    ARCHIVE DESTINATION ${CMAKE_INSTALL_LIBDIR}
    RUNTIME DESTINATION ${CMAKE_INSTALL_BINDIR}
)

install(DIRECTORY include/ifcx
    DESTINATION ${CMAKE_INSTALL_INCLUDEDIR}
)

install(EXPORT ifcxTargets
    FILE ifcxTargets.cmake
    NAMESPACE ifcx::
    DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/ifcx
)

# Package config
include(CMakePackageConfigHelpers)

configure_package_config_file(
    ${CMAKE_CURRENT_SOURCE_DIR}/cmake/ifcxConfig.cmake.in
    ${CMAKE_CURRENT_BINARY_DIR}/ifcxConfig.cmake
    INSTALL_DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/ifcx
)

write_basic_package_version_file(
    ${CMAKE_CURRENT_BINARY_DIR}/ifcxConfigVersion.cmake
    VERSION ${PROJECT_VERSION}
    COMPATIBILITY SameMajorVersion
)

install(FILES
    ${CMAKE_CURRENT_BINARY_DIR}/ifcxConfig.cmake
    ${CMAKE_CURRENT_BINARY_DIR}/ifcxConfigVersion.cmake
    DESTINATION ${CMAKE_INSTALL_LIBDIR}/cmake/ifcx
)
