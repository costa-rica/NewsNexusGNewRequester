// NewsNexusGNewsRequester - Basic keyword requester
require("dotenv").config();
const { NewsArticleAggregatorSource } = require("newsnexus07db");
const {
  storeGNewsArticles,
  makeGNewsApiRequestDetailed,
} = require("./modules/requestsGNews");
const keywords = ["hazard", "choke", "injury", "atv", "sports"];
const source = {
  id: 1,
  name: "GNews",
  url: "https://gnews.io/api/v4/",
  apiKey: process.env.GNEWS_API_KEY,
};
let index = 0;
console.log(process.env.APP_NAME);
async function makeRequest() {
  const keyword = keywords[index];

  const gNewsSourceObj = await NewsArticleAggregatorSource.findOne({
    where: { nameOfOrg: "GNews" },
    raw: true, // Returns data without all the database gibberish
  });

  let startDate = null;
  let endDate = null;
  //   console.log(`Making request to https://gnews.io/api/v4/search?q=${keyword}`);
  const { requestResponseData, newsApiRequestObj } =
    makeGNewsApiRequestDetailed(gNewsSourceObj, keyword, startDate, endDate);

  // Move to the next keyword, wrap around at the end
  index = (index + 1) % keywords.length;

  // Store articles and update NewsApiRequest
  await storeGNewsArticles(requestResponseData, newsApiRequestObj);
  console.log("Request completed");
  console.log(`newsApiRequestObj: ${newsApiRequestObj}`);
}

// Start the interval to run once per second
setInterval(makeRequest, 1000);
