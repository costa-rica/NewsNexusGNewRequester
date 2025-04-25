const xlsx = require("xlsx");
require("dotenv").config();
const path = require("path");
const fs = require("fs");

function readQueryParametersFromXlsxFile() {
  const filePath = process.env.PATH_AND_FILENAME_FOR_QUERY_SPREADSHEET;

  if (!filePath || !fs.existsSync(filePath)) {
    throw new Error(`Excel file not found at path: ${filePath}`);
  }

  // Read the workbook
  const workbook = xlsx.readFile(filePath);
  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];

  // Convert to JSON
  const jsonData = xlsx.utils.sheet_to_json(worksheet, { defval: "" });

  // Map to array of clean query objects
  const queryObjects = jsonData.map((row) => {
    // console.log("Raw Excel row:", row);
    const parsedDate = row.startDate
      ? new Date((row.startDate - 25569) * 86400 * 1000)
          .toISOString()
          .split("T")[0]
      : "";
    // console.log(`Parsed startDate for row ID ${row.id}: ${parsedDate}`);

    return {
      id: row.id,
      andString: row.andString || "",
      orString: row.orString || "",
      notString: row.notString || "",
      startDate: parsedDate || "",
    };
  });

  return queryObjects;
}

module.exports = {
  readQueryParametersFromXlsxFile,
};
