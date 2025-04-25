// NewsNexusGNewsRequester - Basic keyword requester
require("dotenv").config();
const { NewsArticleAggregatorSource } = require("newsnexus07db");
const {
  storeGNewsArticles,
  makeGNewsApiRequestDetailed,
} = require("./modules/requestsGNews");
const keyword = ["hazard", "choke", "injury", "atv", "sports"];

let index = 0;
console.log(process.env.APP_NAME);

async function makeRequest() {
  const keywordsAnd = keyword[index];
  console.log(`keywordAnd: ${keywordsAnd}`);

  const gNewsSourceObj = await NewsArticleAggregatorSource.findOne({
    where: { nameOfOrg: "GNews" },
    raw: true, // Returns data without all the database gibberish
  });

  let startDate = null;
  let endDate = null;
  // //   console.log(`Making request to https://gnews.io/api/v4/search?q=${keyword}`);
  // const { requestResponseData, newsApiRequestObj } =
  //   makeGNewsApiRequestDetailed(gNewsSourceObj, keywordAnd, startDate, endDate);

  // --- MODIFIED CODE ---
  // NOTE: This is necessary to account for asynchronicity of makeGNewsApiRequestDetailed
  let requestResponseData = null;
  let newsApiRequestObj = null;

  try {
    ({ requestResponseData, newsApiRequestObj } =
      await makeGNewsApiRequestDetailed(
        gNewsSourceObj,
        startDate,
        endDate,
        keywordsAnd,
        null,
        null
      ));
  } catch (error) {
    console.error("Error during GNews API request:", error);
    return; // prevent proceeding to storeGNewsArticles if request failed
  }
  // --- MODIFIED CODE (end) ---

  // Move to the next keyword, wrap around at the end
  index = (index + 1) % keywordsAnd.length;

  // Store articles and update NewsApiRequest
  await storeGNewsArticles(requestResponseData, newsApiRequestObj);
  console.log("Request completed");
  console.log(`newsApiRequestObj: ${newsApiRequestObj}`);
}

// Start the interval to run once per second
setInterval(makeRequest, 1000);
