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

// Time check to only run at 1AM
const now = new Date();
const currentHour = now.getHours();

if (currentHour === 1) {
  // Only run at 1AM
  console.log(`Running NewsNexusGNewRequester at 1AM`);
  require("./index");
} else {
  console.log(`Not 1AM yet (current hour: ${currentHour}), exiting.`);
  process.exit(0);
}
