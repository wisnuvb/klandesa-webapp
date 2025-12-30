// Load environment variables at runtime
import fs from "fs";
import path from "path";

const envFile = path.join(process.cwd(), ".env");

if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, "utf-8");
  envContent.split("\n").forEach((line) => {
    const [key, ...valueParts] = line.split("=");
    const value = valueParts
      .join("=")
      .trim()
      .replace(/^["']|["']$/g, "");

    if (key && !key.startsWith("#") && !process.env[key]) {
      process.env[key] = value;
    }
  });
}
