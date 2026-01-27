const { MongoClient } = require("mongodb");
const readlineSync = require("readline-sync");

const MONGO_URI = "mongodb://localhost:27017";
const DB_NAME = "mydatabase";
const COLLECTION_NAME = "callhistory";

async function main() {
  // Get date range input from user
  const startDate = readlineSync.question(
    "Enter start date (YYYY-MM-DD e.g. 2024-04-01): "
  );
  const endDate = readlineSync.question(
    "Enter end date   (YYYY-MM-DD e.g. 2024-04-30): "
  );

  // Validate inputs
  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    console.error("Invalid date format. Please use YYYY-MM-DD.");
    process.exit(1);
  }

  const fromStr = `${startDate}T00:00:00.000+00:00`;
  const toStr = `${endDate}T23:59:59.999+00:00`;
  const fromDate = new Date(fromStr);
  const toDate = new Date(toStr);

  console.log(`\nQuerying calltime from ${startDate} to ${endDate} ...\n`);

  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log("Connected to MongoDB successfully.\n");

    const db = client.db(DB_NAME);

    const collection = db.collection(COLLECTION_NAME);

    // Check the type of calltime in a sample document
    const sample = await collection.findOne({ calltime: { $exists: true } });

    if (!sample) {
      console.log("No documents with 'calltime' field found in this collection.");
      return;
    }

    const calltimeType = typeof sample.calltime;
    console.log(`Detected calltime type: ${calltimeType} (value: ${sample.calltime})\n`);

    let query;

    if (sample.calltime instanceof Date) {
      // calltime is stored as ISODate — use Date objects
      query = {
        calltime: { $gte: fromDate, $lte: toDate },
      };
    } else {
      // calltime is stored as a string — use string comparison
      query = {
        calltime: { $gte: fromStr, $lte: toStr },
      };
    }

    const results = await collection.find(query).toArray();

    if (results.length === 0) {
      console.log("No documents found in the given date range.");
    } else {
      console.log(`Found ${results.length} document(s):\n`);
      results.forEach((doc, index) => {
        console.log(`--- Document ${index + 1} ---`);
        console.log(JSON.stringify(doc, null, 2));
        console.log();
      });
    }
  } catch (err) {
    console.error("Error:", err.message);
  } finally {
    await client.close();
    console.log("Connection closed.");
  }
}

function isValidDate(dateStr) {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(dateStr)) return false;
  const d = new Date(dateStr);
  return !isNaN(d.getTime());
}

main();
