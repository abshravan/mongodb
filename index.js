const { MongoClient } = require("mongodb");
const readlineSync = require("readline-sync");

const MONGO_URI = "mongodb://localhost:27017";
const DB_NAME = "mydatabase";

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

  // Build Date objects — start at beginning of day, end at end of day
  const from = new Date(`${startDate}T00:00:00.000Z`);
  const to = new Date(`${endDate}T23:59:59.999Z`);

  console.log(`\nQuerying calltime from ${from.toISOString()} to ${to.toISOString()} ...\n`);

  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    console.log("Connected to MongoDB successfully.\n");

    const db = client.db(DB_NAME);

    // Get collection name from user
    const collectionName = readlineSync.question("Enter collection name: ");
    const collection = db.collection(collectionName);

    // Query documents where calltime falls within the date range
    const query = {
      calltime: {
        $gte: from,
        $lte: to,
      },
    };

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
