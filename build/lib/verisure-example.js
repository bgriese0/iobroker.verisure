"use strict";
var import_verisure_client = require("./verisure-client");
var import_verisure_operations = require("./verisure-operations");
async function basicExample() {
  const verisure = new import_verisure_client.Verisure("your@email.com", "your-password");
  const cookies = await verisure.getToken();
  console.log("Authenticated with cookies:", cookies);
  const installations = await verisure.getInstallations();
  console.log(`Found ${installations.length} installation(s)`);
  const [installation] = installations;
  console.log("Installation:", installation.config);
}
async function cookieExample() {
  const verisure = new import_verisure_client.Verisure("your@email.com", "", [
    "vid=myTopSecretToken",
    "vs-access=myAccessToken",
    "vs-refresh=myRefreshToken"
  ]);
  const installations = await verisure.getInstallations();
  console.log(`Found ${installations.length} installation(s)`);
}
async function overviewExample() {
  const verisure = new import_verisure_client.Verisure("your@email.com", "your-password");
  await verisure.getToken();
  const installations = await verisure.getInstallations();
  const [installation] = installations;
  const { installation: overview } = await installation.client(import_verisure_operations.overviewOperation);
  console.log("Alarm state:", overview.armState);
  console.log("Climate sensors:", overview.climates);
  console.log("Door/Window sensors:", overview.doorWindows);
  console.log("Smart plugs:", overview.smartplugs);
  console.log("Door locks:", overview.doorlocks);
}
async function alarmControlExample() {
  const verisure = new import_verisure_client.Verisure("your@email.com", "your-password");
  await verisure.getToken();
  const installations = await verisure.getInstallations();
  const [installation] = installations;
  const alarmCode = "1234";
  const { transactionId } = await installation.client((0, import_verisure_operations.armAwayOperation)(alarmCode));
  console.log("Alarm arming initiated, transaction ID:", transactionId);
}
async function mfaExample() {
  const verisure = new import_verisure_client.Verisure("your@email.com", "your-password");
  await verisure.getToken();
  console.log("MFA code sent to your device");
  const mfaCode = "123456";
  const cookies = await verisure.getToken(mfaCode);
  console.log("Authenticated with MFA. Save these cookies for future use:");
  console.log(cookies);
}
//# sourceMappingURL=verisure-example.js.map
