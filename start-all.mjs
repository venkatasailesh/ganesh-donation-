import { spawn } from "child_process";

const nextPort = process.env.PORT || "3000";
const whatsappPort = "5001";

console.log("==================================================");
console.log("🚀 Starting IRA Hill View Ganesh Utsav Platform");
console.log(`📱 WhatsApp Service on internal port: ${whatsappPort}`);
console.log(`🌐 Next.js App on public port: ${nextPort}`);
console.log("==================================================");

// 1. Spawn WhatsApp background service on port 5001
const whatsapp = spawn("node", ["whatsapp-service.mjs"], {
  stdio: "inherit",
  env: {
    ...process.env,
    PORT: whatsappPort,
    WHATSAPP_PORT: whatsappPort,
  },
});

whatsapp.on("error", (err) => {
  console.error("[WhatsApp Service Error]:", err);
});

// 2. Spawn Next.js production server on Render's public port
const nextCmd = process.platform === "win32" ? "npx.cmd" : "npx";
const nextApp = spawn(nextCmd, ["next", "start", "-p", nextPort], {
  stdio: "inherit",
  env: {
    ...process.env,
    PORT: nextPort,
    WHATSAPP_LOCAL_URL: `http://127.0.0.1:${whatsappPort}`,
  },
});

nextApp.on("error", (err) => {
  console.error("[Next.js App Error]:", err);
});

process.on("SIGINT", () => {
  whatsapp.kill();
  nextApp.kill();
  process.exit();
});

process.on("SIGTERM", () => {
  whatsapp.kill();
  nextApp.kill();
  process.exit();
});
