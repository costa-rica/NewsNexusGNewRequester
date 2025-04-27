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

require("./index");
