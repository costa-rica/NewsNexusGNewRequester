// NewsNexusGNewsRequester - Basic keyword requester
require("dotenv").config();
const { NewsArticleAggregatorSource } = require("newsnexus07db");
const {
  storeGNewsArticles,
  makeGNewsApiRequestDetailed,
  checkRequestAndModifyDates,
} = require("./modules/requestsGNews");
const {
  readQueryParametersFromXlsxFile,
} = require("./modules/utilitiesReadFiles");

let index = 0;
console.log(process.env.APP_NAME);
console.log(
  `--------------------------------------------------------------------------------`
);
console.log(`- Start NewsNexusGNewsRequester ${new Date().toISOString()} --`);
console.log(
  `--------------------------------------------------------------------------------`
);
let intervalId;

async function makeRequestAutomated() {
  const queryArgumentObjectsArray = readQueryParametersFromXlsxFile(
    process.env.PATH_AND_FILENAME_FOR_QUERY_SPREADSHEET_AUTOMATED
  );
  const requestWindowInDays = 14; // how many days from startDate to endDate
  const andString = queryArgumentObjectsArray[index].andString;
  const orString = queryArgumentObjectsArray[index].orString;
  const notString = queryArgumentObjectsArray[index].notString;
  const startDate = queryArgumentObjectsArray[index].startDate;
  const endDate = new Date(
    new Date(startDate).setDate(
      new Date(startDate).getDate() + requestWindowInDays
    )
  )
    .toISOString()
    .split("T")[0];

  const gNewsSourceObj = await NewsArticleAggregatorSource.findOne({
    where: { nameOfOrg: "GNews" },
    raw: true, // Returns data without all the database gibberish
  });

  const { startDate: adjustedStartDate, endDate: adjustedEndDate } =
    await checkRequestAndModifyDates(
      andString,
      orString,
      notString,
      startDate,
      endDate,
      gNewsSourceObj,
      requestWindowInDays
    );
  console.log(
    `-> Working on request for query object id: ${queryArgumentObjectsArray[index]?.id}, startDate: ${adjustedStartDate} - ${adjustedEndDate}`
  );

  // --- MODIFIED CODE ---
  // NOTE: This is necessary to account for asynchronicity of makeGNewsApiRequestDetailed
  let requestResponseData = null;
  let newsApiRequestObj = null;

  try {
    ({ requestResponseData, newsApiRequestObj } =
      await makeGNewsApiRequestDetailed(
        gNewsSourceObj,
        adjustedStartDate,
        adjustedEndDate,
        andString,
        orString,
        notString
      ));
  } catch (error) {
    console.error("Error during GNews API request:", error);
    return; // prevent proceeding to storeGNewsArticles if request failed
  }
  // --- MODIFIED CODE (end) ---
  if (!requestResponseData?.articles) {
    console.log("No articles received from GNews API");
  } else {
    // Store articles and update NewsApiRequest
    await storeGNewsArticles(requestResponseData, newsApiRequestObj);
    console.log(`completed NewsApiRequest.id: ${newsApiRequestObj.id}`);
  }
  // Move to the next keyword, wrap around at the end
  index = (index + 1) % queryArgumentObjectsArray.length;

  // Check if adjustedEndDate is today or in the future and if index has looped through all queries
  const today = new Date().toISOString().split("T")[0];
  if (adjustedEndDate >= today && index === 0) {
    console.log("All queries processed up to current date. Stopping requests.");
    clearInterval(intervalId);
  }
}

// Start the interval to run once per second
intervalId = setInterval(makeRequestAutomated, 1000);
