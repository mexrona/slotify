import { execSync } from "node:child_process";
import path from "node:path";

async function globalSetup() {
  const backendDir = path.resolve(__dirname, "../backend");

  try {
    execSync("python seed.py", {
      cwd: backendDir,
      stdio: "inherit",
    });
  } catch {
    // Fallback for Windows setups where `python` alias is unavailable.
    execSync("py seed.py", {
      cwd: backendDir,
      stdio: "inherit",
    });
  }
}

export default globalSetup;
