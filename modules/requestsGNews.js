const {
  Article,
  NewsApiRequest,
  EntityWhoFoundArticle,
  NewsArticleAggregatorSource,
} = require("newsnexus07db");
const { writeResponseDataFromNewsAggregator } = require("./common");

async function makeGNewsApiRequestDetailed(
  sourceObj,
  startDate,
  endDate,
  andString,
  orString,
  notString
) {
  function splitPreservingQuotes(str) {
    return str.match(/"[^"]+"|\S+/g)?.map((s) => s.trim()) || [];
  }

  const andArray = splitPreservingQuotes(andString ? andString : "");
  const orArray = splitPreservingQuotes(orString ? orString : "");
  const notArray = splitPreservingQuotes(notString ? notString : "");

  // Step 1: prepare token and dates
  if (!endDate) {
    console.log(" !!! no endDate !!!");
    endDate = new Date().toISOString().split("T")[0];
  }
  if (!startDate) {
    console.log(" !!! no startDate !!!");
    // startDate should be 90 days prior to endDate - account limitation
    startDate = new Date(new Date().setDate(new Date().getDate() - 90))
      .toISOString()
      .split("T")[0];
  }

  let queryParams = [];

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
    const formattedStartDate = new Date(startDate)
      .toISOString()
      .replace(".000", "");
    queryParams.push(`from=${formattedStartDate}`);
  }

  if (endDate) {
    const formattedEndDate = new Date(endDate)
      .toISOString()
      .replace(".000", "");
    queryParams.push(`to=${formattedEndDate}`);
  }
  queryParams.push(`max=100`);

  // Always required
  queryParams.push("lang=en");
  queryParams.push("country=us");
  queryParams.push(`apikey=${sourceObj.apiKey}`);

  const requestUrl = `${sourceObj.url}search?${queryParams.join("&")}`;

  let status = "success";
  let requestResponseData = null;
  let newsApiRequestObj = null;
  if (process.env.ACTIVATE_API_REQUESTS_TO_OUTSIDE_SOURCES === "true") {
    const response = await fetch(requestUrl);
    // console.log(`response_statue: ${response.status}`);
    requestResponseData = await response.json();

    if (!requestResponseData?.articles) {
      status = "error";
      console.log(`🚧 Here is the error 🚧`);
      writeResponseDataFromNewsAggregator(
        sourceObj.id,
        { id: "failed", url: requestUrl },
        requestResponseData,
        true
      );
      return { requestResponseData, newsApiRequestObj };
    }

    // Step 4: create new NewsApiRequest
    newsApiRequestObj = await NewsApiRequest.create({
      newsArticleAggregatorSourceId: sourceObj.id,
      dateStartOfRequest: startDate,
      dateEndOfRequest: endDate,
      countOfArticlesReceivedFromRequest: requestResponseData.articles?.length,
      countOfArticlesAvailableFromRequest: requestResponseData?.totalArticles,
      status,
      url: requestUrl,
      andString: andString,
      orString: orString,
      notString: notString,
      isFromAutomation: true,
    });
  } else {
    newsApiRequestObj = requestUrl;
  }

  return { requestResponseData, newsApiRequestObj };
}

// Store the articles of a single request in Aritcle and update NewsApiRequest
async function storeGNewsArticles(requestResponseData, newsApiRequestObj) {
  // leverages the hasOne association from the NewsArticleAggregatorSource model
  const gNewsSource = await NewsArticleAggregatorSource.findOne({
    where: { nameOfOrg: "GNews" },
    include: [{ model: EntityWhoFoundArticle }],
  });

  const entityWhoFoundArticleId = gNewsSource.EntityWhoFoundArticle?.id;
  try {
    let countOfArticlesSavedToDbFromRequest = 0;
    for (let article of requestResponseData.articles) {
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
      newsApiRequestObj,
      requestResponseData,
      false
    );
  } catch (error) {
    console.error(error);

    writeResponseDataFromNewsAggregator(
      gNewsSource.id,
      newsApiRequestObj,
      requestResponseData,
      true
    );
  }
}

async function checkRequestAndModifyDates(
  andString,
  orString,
  notString,
  startDate,
  endDate,
  gNewsSourceObj,
  requestWindowInDays
) {
  const existingRequests = await NewsApiRequest.findAll({
    where: {
      andString: andString,
      orString: orString,
      notString: notString,
      newsArticleAggregatorSourceId: gNewsSourceObj.id,
    },
    order: [["dateEndOfRequest", "DESC"]],
    limit: 1,
  });

  if (existingRequests.length > 0) {
    const latestEndDate = existingRequests[0].dateEndOfRequest;
    const newStartDate = latestEndDate;
    let newEndDate = new Date(
      new Date(newStartDate).getTime() +
        requestWindowInDays * 24 * 60 * 60 * 1000
    );

    const today = new Date();
    if (newEndDate > today) {
      newEndDate = today;
    }

    newEndDate = newEndDate.toISOString().split("T")[0];
    return { startDate: newStartDate, endDate: newEndDate };
  } else {
    return { startDate, endDate };
  }
}

module.exports = {
  storeGNewsArticles,
  makeGNewsApiRequestDetailed,
  checkRequestAndModifyDates,
};
