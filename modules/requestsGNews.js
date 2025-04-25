const {
  Article,
  NewsApiRequest,
  EntityWhoFoundArticle,
  NewsArticleAggregatorSource,
} = require("newsnexus07db");
const { writeResponseDataFromNewsAggregator } = require("./common");
// const fs = require("fs");
// const path = require("path");

async function makeGNewsApiRequestDetailed(
  sourceObj,
  startDate,
  endDate,
  andString,
  orString,
  notString
) {
  console.log("- in makeGNewsApiRequestDetailed");
  console.log(`andString: ${andString}`);

  function splitPreservingQuotes(str) {
    return str.match(/"[^"]+"|\S+/g)?.map((s) => s.trim()) || [];
  }

  const andArray = splitPreservingQuotes(andString ? andString : "");
  const orArray = splitPreservingQuotes(orString ? orString : "");
  const notArray = splitPreservingQuotes(notString ? notString : "");

  console.log(`andArray: ${andArray}`);

  // Step 1: prepare token and dates
  const token = sourceObj.apiKey;
  if (!endDate) {
    endDate = new Date().toISOString().split("T")[0];
  }
  if (!startDate) {
    // startDate should be 29 days prior to endDate - account limitation
    startDate = new Date(new Date().setDate(new Date().getDate() - 90))
      .toISOString()
      .split("T")[0];
  }

  let queryParams = [];

  console.log(`startDate: ${startDate}`);
  const andPart = andArray.length > 0 ? andArray.join(" AND ") : "";
  const orPart = orArray.length > 0 ? `(${orArray.join(" OR ")})` : "";
  const notPart =
    notArray.length > 0 ? notArray.map((k) => `NOT ${k}`).join(" AND ") : "";

  const fullQuery = [andPart, orPart, notPart].filter(Boolean).join(" AND ");
  console.log(`fullQuery: ${fullQuery}`);
  if (fullQuery) {
    queryParams.push(`q=${encodeURIComponent(fullQuery)}`);
  }

  if (startDate) {
    queryParams.push(`from=${startDate}`);
  }

  if (endDate) {
    queryParams.push(`to=${endDate}`);
  }
  queryParams.push(`max=100`);

  // Always required
  queryParams.push("lang=en");
  queryParams.push("country=us");
  queryParams.push(`apikey=${sourceObj.apiKey}`);

  const requestUrl = `${sourceObj.url}search?${queryParams.join("&")}`;
  console.log(` [in makeGNewsApiRequestDetailed] requestUrl: ${requestUrl}`);
  console.log(` [in makeGNewsApiRequestDetailed] queryParams: ${queryParams}`);

  let status = "success";
  let requestResponseData = null;
  let newsApiRequestObj = null;
  if (process.env.ACTIVATE_API_REQUESTS_TO_OUTSIDE_SOURCES === "true") {
    console.log(`🚧 This line executes before the error 🚧`);
    console.log(requestUrl);
    const response = await fetch(requestUrl);

    console.log(`response_statue: ${response.status}`);
    requestResponseData = await response.json();
    console.log(requestResponseData);

    if (!requestResponseData?.articles) {
      status = "error";
      console.log(`🚧 Here is the error 🚧`);
      writeResponseDataFromNewsAggregator(
        sourceObj.id,
        { id: "failed", url: requestUrl },
        requestResponseData,
        true
      );
      // ⛔ Kill the process immediately
      console.error("No articles received from GNews API. Exiting...");
      process.exit(1); // 👈 this ends the entire Node.js process
    }

    // Step 4: create new NewsApiRequest
    newsApiRequestObj = await NewsApiRequest.create({
      newsArticleAggregatorSourceId: sourceObj.id,
      dateStartOfRequest: startDate,
      dateEndOfRequest: new Date(),
      countOfArticlesReceivedFromRequest: requestResponseData.articles?.length,
      status,
      url: requestUrl,
      andString: andString,
      orString: orString,
      notString: notString,
    });
  } else {
    newsApiRequestObj = requestUrl;
  }

  return { requestResponseData, newsApiRequestObj };
}

// Store the articles of a single request in Aritcle and update NewsApiRequest
async function storeGNewsArticles(
  requestResponseData,
  newsApiRequestObj
  // keywordString
) {
  // leverages the hasOne association from the NewsArticleAggregatorSource model
  const gNewsSource = await NewsArticleAggregatorSource.findOne({
    where: { nameOfOrg: "GNews" },
    include: [{ model: EntityWhoFoundArticle }],
  });
  console.log("---> why is this firing before the others ???");

  const entityWhoFoundArticleId = gNewsSource.EntityWhoFoundArticle?.id;
  try {
    let countOfArticlesSavedToDbFromRequest = 0;
    for (let article of requestResponseData.articles) {
      // Append article

      const existingArticle = await Article.findOne({
        where: { url: article.url },
      });
      if (existingArticle) {
        continue;
      }

      await Article.create({
        publicationName: article.source.name,
        title: article.title,
        description: article.description,
        url: article.url,
        urlToImage: article.image,
        publishedDate: article.publishedAt,
        entityWhoFoundArticleId: entityWhoFoundArticleId,
        newsApiRequestId: newsApiRequestObj.id,
      });
      countOfArticlesSavedToDbFromRequest++;
    }
    // Append NewsApiRequest
    await newsApiRequestObj.update({
      countOfArticlesSavedToDbFromRequest: countOfArticlesSavedToDbFromRequest,
    });

    writeResponseDataFromNewsAggregator(
      gNewsSource.id,
      // keyword?.keywordId,
      newsApiRequestObj,
      requestResponseData,
      false
      // newsApiRequest.url
    );
  } catch (error) {
    console.error(error);

    writeResponseDataFromNewsAggregator(
      gNewsSource.id,
      newsApiRequestObj,
      requestResponseData,
      true
      // newsApiRequest.url
    );
  }
}

module.exports = {
  storeGNewsArticles,
  makeGNewsApiRequestDetailed,
};

// OBE
// // Make a single request to the API
// async function makeGNewsRequest(
//   source,
//   // keyword,
//   keywordString,
//   startDate = false,
//   endDate = false,
//   max = 10
// ) {
//   const token = source.apiKey;
//   if (!endDate) {
//     endDate = new Date().toISOString().split("T")[0];
//   }
//   if (!startDate) {
//     // startDate should be 160 days prior to endDate
//     startDate = new Date(
//       new Date().setDate(
//         new Date().getDate() - process.env.COUNT_OF_DAYS_HISTORY_LIMIT
//       )
//     )
//       .toISOString()
//       .split("T")[0];
//   }
//   const keywordLowerCase = keywordString.toLowerCase();

//   const urlGnews = `${source.url}search?q=${encodeURIComponent(
//     keywordLowerCase
//   )}&from=${startDate}&to=${endDate}&max=${max}&lang=en&token=${token}`;

//   let requestResponseData;
//   let newsApiRequestObj;

//   const requestResponse = await fetch(urlGnews);
//   requestResponseData = await requestResponse.json();

//   console.log(urlGnews);

//   // create new NewsApiRequest
//   newsApiRequestObj = await NewsApiRequest.create({
//     newsArticleAggregatorSourceId: source.id,
//     andString: keywordString,
//     dateStartOfRequest: startDate,
//     dateEndOfRequest: new Date(),
//     countOfArticlesReceivedFromRequest: requestResponseData.articles.length,
//   });

//   return { requestResponseData, newsApiRequestObj };
// }
