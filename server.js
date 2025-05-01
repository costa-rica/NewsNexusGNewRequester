require("dotenv").config();
const originalLog = console.log;
const originalError = console.error;
const prefix = `[${process.env.APP_NAME}] `;

console.log = (...args) => {
  originalLog(prefix, ...args);
};

console.error = (...args) => {
  originalError(prefix, ...args);
};

// require("./index");

// Time check: Only run between 20:50 and 21:10 UTC (time of the Ubuntu server)
const targetTimeToStartAutomation = 21;
const now = new Date();
const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
const startMinutes = (targetTimeToStartAutomation - 1) * 60 + 55; // 20:50 UTC
const endMinutes = targetTimeToStartAutomation * 60 + 5; // 21:10 UTC

if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
  console.log(`Running NewsNexusGNewRequester between 20:55 and 21:05 UTC`);
  require("./indexAutomated");
} else {
  console.log(
    `Not within allowed time window (20:55–21:05 UTC), exiting. Current UTC time: ${now.toISOString()}`
  );
  // // Stay alive doing nothing — keep PM2 app in 'online' state
  // setInterval(() => {
  //   // Optional: you can add a very light heartbeat log every hour
  //   console.log("Idle - waiting for next cron window...");
  // }, 1000 * 60 * 60); // 1 hour interval
}
