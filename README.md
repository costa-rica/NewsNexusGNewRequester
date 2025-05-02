# NewsNexusGNewsRequester - OBE

This project is no longer in use. This has been replaced by [NewsNexusGNewsRequester01](https://github.com/costa-rica/NewsNexusGNewsRequester01)

## chatgpt prompt:

Let's create a JavaScript microservice that will make requests to the GNews API. It should do it once a second.

For starters would you show me a script that will have an array defined inside that will be 5 different keywords like hazard, choke, injury, atv, and sports. Then it will print to the console something like “making request to https://gnews.io/api/v4/q=${keyword}”. Let's call this microservice NewsNexusGNewsRequester.

## .env

```
APP_NAME=NewsNexusGNewsRequester
NAME_DB=newsnexus07.db
PATH_DATABASE=/Users/nick/Documents/_databases/NewsNexus07/
PATH_DB_BACKUPS=/Users/nick/Documents/_project_resources/NewsNexus07/db_backups
PATH_PROJECT_RESOURCES=/Users/nick/Documents/_project_resources/NewsNexus07
PATH_PROJECT_RESOURCES_REPORTS=/Users/nick/Documents/_project_resources/NewsNexus07/reports
PATH_TO_API_RESPONSE_JSON_FILES=/Users/nick/Documents/_project_resources/NewsNexus07/api_response_json_files
NODE_ENV=workstation
AUTHENTIFICATION_TURNED_OFF=false
ACTIVATE_API_REQUESTS_TO_OUTSIDE_SOURCES=false
PATH_AND_FILENAME_FOR_QUERY_SPREADSHEET_AUTOMATED=/Users/nickrodriguez/Downloads/NewsApiRequestAutmationSmall.xlsx
PATH_AND_FILENAME_FOR_QUERY_SPREADSHEET_MANUAL=/Users/nickrodriguez/Downloads/NewsApiRequestAutmationSmall.xlsx
```

## Usage

1. create an excel (.xlsx) file that has columns: id, andString, orString, notString, startDate
2. place path and filename in .env PATH_AND_FILENAME_FOR_QUERY_SPREADSHEET_AUTOMATED
3. run `node index.js`
4. This will create requests for each row from startDate to startDate + 7 days -- or whatever amount of days assign in `requestWindowInDays`
5. Loops over list of `queryArgumentObjectsArray` and checks the NewsApiRequest table for last reques to similar type then uses the dates of last request to create new startDate and endDate for search the api.

## GNews reqeusts

- GNews uses Europe / Zurich timezone to track reqeust limits
- 9pm UTC is 11pm Zurich time
- this time is decided because it will allow the KM team to submit requests during day and the execess reqeusts will be used by the automation.
