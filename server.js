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

// Time check: Only run between 5:50 AM and 6:10 AM UTC (time of the Ubuntu server)
const now = new Date();
const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
const startMinutes = 5 * 60 + 50; // 5:50 AM UTC
const endMinutes = 6 * 60 + 10; // 6:10 AM UTC

if (currentMinutes >= startMinutes && currentMinutes <= endMinutes) {
  console.log(`Running NewsNexusGNewRequester between 5:50 and 6:10 AM UTC`);
  require("./index");
} else {
  console.log(
    `Not within allowed time window (5:50–6:10 AM UTC), exiting. Current UTC time: ${now.toISOString()}`
  );
  process.exit(0);
}
