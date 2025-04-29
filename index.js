// NewsNexusGNewsRequester - Manual query requester
require("dotenv").config();
const { NewsArticleAggregatorSource } = require("newsnexus07db");
const {
  storeGNewsArticles,
  makeGNewsApiRequestDetailed,
} = require("./modules/requestsGNews");
const {
  readQueryParametersFromXlsxFile,
} = require("./modules/utilitiesReadFiles");

let index = 0;
let currentStartDates = [];

console.log(process.env.APP_NAME);
console.log(
  `--------------------------------------------------------------------------------`
);
console.log(`- Start NewsNexusGNewsRequester ${new Date().toISOString()} --`);
console.log(
  `--------------------------------------------------------------------------------`
);

async function makeRequest() {
  const queryArgumentObjectsArray = readQueryParametersFromXlsxFile();
  const requestWindowInDays = 30; // How many days from startDate to endDate

  if (currentStartDates.length === 0) {
    currentStartDates = queryArgumentObjectsArray.map((obj) => obj.startDate);
  }

  const andString = queryArgumentObjectsArray[index].andString;
  const orString = queryArgumentObjectsArray[index].orString;
  const notString = queryArgumentObjectsArray[index].notString;
  const startDate = currentStartDates[index];

  const today = new Date();
  const todayStr = today.toISOString().split("T")[0];
  const startDateObj = new Date(startDate);
  const todayObj = new Date(todayStr);

  if (startDateObj >= todayObj) {
    console.log(
      `Start date ${startDate} is today or after ${todayStr}. Exiting...`
    );
    process.exit(0);
  }

  let endDate = new Date(
    new Date(startDate).setDate(
      new Date(startDate).getDate() + requestWindowInDays
    )
  );

  if (endDate > today) {
    console.log(
      `Capping endDate to today. Original endDate: ${
        endDate.toISOString().split("T")[0]
      }`
    );
    endDate = today;
  }

  endDate = endDate.toISOString().split("T")[0];

  const gNewsSourceObj = await NewsArticleAggregatorSource.findOne({
    where: { nameOfOrg: "GNews" },
    raw: true,
  });

  let requestResponseData = null;
  let newsApiRequestObj = null;

  try {
    ({ requestResponseData, newsApiRequestObj } =
      await makeGNewsApiRequestDetailed(
        gNewsSourceObj,
        startDate,
        endDate,
        andString,
        orString,
        notString
      ));
  } catch (error) {
    console.error("Error during GNews API request:", error);
    return; // prevent proceeding to storeGNewsArticles if request failed
  }

  if (!requestResponseData?.articles) {
    console.log("No articles received from GNews API");
  } else {
    await storeGNewsArticles(requestResponseData, newsApiRequestObj);
    console.log("Request completed");
    console.log(`newsApiRequestObj: ${newsApiRequestObj}`);
  }

  // Update the startDate for this keyword to be the old endDate
  currentStartDates[index] = endDate;

  // Move to the next keyword, wrap around
  index = (index + 1) % queryArgumentObjectsArray.length;
}

// Start the interval to run once per second
setInterval(makeRequest, 1000);

// // NewsNexusGNewsRequester - Basic keyword requester
// require("dotenv").config();
// const { NewsArticleAggregatorSource } = require("newsnexus07db");
// const {
//   storeGNewsArticles,
//   makeGNewsApiRequestDetailed,
// } = require("./modules/requestsGNews");
// const {
//   readQueryParametersFromXlsxFile,
// } = require("./modules/utilitiesReadFiles");

// let index = 0;
// let currentStartDates = [];

// console.log(process.env.APP_NAME);
// console.log(
//   `--------------------------------------------------------------------------------`
// );
// console.log(`- Start NewsNexusGNewsRequester ${new Date().toISOString()} --`);
// console.log(
//   `--------------------------------------------------------------------------------`
// );

// async function makeRequest() {
//   const queryArgumentObjectsArray = readQueryParametersFromXlsxFile();
//   const requestWindowInDays = 30; // how many days from startDate to endDate
//   if (currentStartDates.length === 0) {
//     currentStartDates = queryArgumentObjectsArray.map((obj) => obj.startDate);
//   }

//   const andString = queryArgumentObjectsArray[index].andString;
//   const orString = queryArgumentObjectsArray[index].orString;
//   const notString = queryArgumentObjectsArray[index].notString;
//   const startDate = currentStartDates[index];
//   // const today = new Date();

//   // // Check if adjustedEndDate is today or in the future and if index has looped through all queries
//   // const todayString = today.toISOString().split("T")[0];
//   // if (startDate > todayString) {
//   //   console.log("All queries processed up to current date. Exiting...");
//   //   process.exit(0);
//   // }

//   // let endDate = null;

//   // if (startDate + requestWindowInDays > today) {
//   //   endDate = today;
//   // } else {
//   //   endDate = new Date(
//   //     new Date(startDate).setDate(
//   //       new Date(startDate).getDate() + requestWindowInDays
//   //     )
//   //   );
//   // }

//   // endDate = endDate.toISOString().split("T")[0];

//   const today = new Date();
//   const todayStr = today.toISOString().split("T")[0];

//   if (new Date(startDate) > today) {
//     console.log(`Start date ${startDate} is after today ${todayStr}. Exiting.`);
//     process.exit(0);
//   }

//   // Calculate endDate normally
//   let endDate = new Date(
//     new Date(startDate).setDate(new Date(startDate).getDate() + requestWindowInDays)
//   );

//   // ✅ If endDate > today, cap it to today
//   if (endDate > today) {
//     console.log(`Capping endDate to today. Original endDate: ${endDate.toISOString().split("T")[0]}`);
//     endDate = today;
//   }

//   endDate = endDate.toISOString().split("T")[0];

//   const gNewsSourceObj = await NewsArticleAggregatorSource.findOne({
//     where: { nameOfOrg: "GNews" },
//     raw: true, // Returns data without all the database gibberish
//   });

//   let requestResponseData = null;
//   let newsApiRequestObj = null;

//   try {
//     ({ requestResponseData, newsApiRequestObj } =
//       await makeGNewsApiRequestDetailed(
//         gNewsSourceObj,
//         startDate,
//         endDate,
//         andString,
//         orString,
//         notString
//       ));
//   } catch (error) {
//     console.error("Error during GNews API request:", error);
//     return; // prevent proceeding to storeGNewsArticles if request failed
//   }
//   if (!requestResponseData?.articles) {
//     console.log("No articles received from GNews API");
//   } else {
//     // Store articles and update NewsApiRequest
//     await storeGNewsArticles(requestResponseData, newsApiRequestObj);
//     console.log("Request completed");
//     console.log(`newsApiRequestObj: ${newsApiRequestObj}`);
//   }

//   // Update startDate for the next cycle
//   currentStartDates[index] = endDate;

//   // Move to next keyword, wrap around
//   index = (index + 1) % queryArgumentObjectsArray.length;
// }

// // Start the interval to run once per second
// setInterval(makeRequest, 1000);
