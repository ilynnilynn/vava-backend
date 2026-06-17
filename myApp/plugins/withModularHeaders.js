const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

/**
 * Config plugin to enable modular headers for Google pods that
 * don't define modules (required by Swift pod AppCheckCore).
 */
function withModularHeaders(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );
      let podfile = fs.readFileSync(podfilePath, "utf-8");

      // Add modular_headers for pods that AppCheckCore depends on
      const modularHeadersPatch = `
# Fix: AppCheckCore Swift pod requires modular headers for these dependencies
pod 'GoogleUtilities', :modular_headers => true
pod 'RecaptchaInterop', :modular_headers => true
`;

      // Insert after the "use_react_native!" or "config = use_native_modules!" line
      if (!podfile.includes("GoogleUtilities") && !podfile.includes("use_modular_headers!")) {
        // Insert before the first 'end' that closes the target block
        const targetMatch = podfile.match(/(use_expo_modules!.*?\n)/s);
        if (targetMatch) {
          podfile = podfile.replace(
            targetMatch[0],
            targetMatch[0] + modularHeadersPatch
          );
        }
      }

      fs.writeFileSync(podfilePath, podfile);
      return config;
    },
  ]);
}

module.exports = withModularHeaders;
