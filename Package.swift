// swift-tools-version: 5.9
import PackageDescription

let package = Package(
    name: "NotapsUnifiedLanguageLearning",
    platforms: [
        .iOS(.v17)
    ],
    products: [
        .executable(
            name: "NotapsUnifiedLanguageLearning",
            targets: ["NotapsUnifiedLanguageLearning"])
    ],
    dependencies: [
        // No external dependencies - using only iOS native frameworks
    ],
    targets: [
        .executableTarget(
            name: "NotapsUnifiedLanguageLearning",
            dependencies: [],
            path: "Sources",
            resources: [
                .copy("Resources")
            ]
        )
    ]
)