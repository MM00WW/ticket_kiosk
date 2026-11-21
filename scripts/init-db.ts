import { db } from "../src/server/db";
console.log("Database ready. Existing tickets and windows are preserved.");
db.close();
