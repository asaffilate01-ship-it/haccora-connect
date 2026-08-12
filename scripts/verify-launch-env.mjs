import { nativeReleaseEnvironmentFailures } from "../mobile/scripts/native-release-environment.mjs";
import { evaluateLaunchReadiness, formatLaunchReadiness } from "./launch-requirements.mjs";

const result = await evaluateLaunchReadiness({
  environment: process.env,
  nativeFailures: nativeReleaseEnvironmentFailures(process.env),
});

if (!result.ready) {
  console.error(formatLaunchReadiness(result));
  process.exit(1);
}

console.log(formatLaunchReadiness(result));
