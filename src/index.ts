// Import Library
import "dotenv/config";
// Import Config
import { readPositiveIntegerEnv } from "./config/env";
// Import Routes
import app from "./app";

/* -------------------------------------- Server -------------------------------------- */

// Config port ที่ HTTP server ฟัง
const PORT = readPositiveIntegerEnv("PORT", 8080);

app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});
