const { expo } = require("./app.json");

/**
 * Keep account-owned identifiers out of source while still making signed builds
 * deterministic. EAS_PROJECT_ID is a protected GitHub/Expo environment value.
 */
module.exports = () => {
  const projectId = (process.env.EAS_PROJECT_ID ?? "").trim();

  return {
    ...expo,
    extra: {
      ...expo.extra,
      ...(projectId ? { eas: { projectId } } : {}),
    },
  };
};
