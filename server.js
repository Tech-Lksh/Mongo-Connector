const express = require("express");
const cors = require("cors");
const { MongoClient } = require("mongodb");

const app = express();
app.use(cors());
app.use(express.json({ limit: "100kb" }));

// Sirf MongoDB Atlas hosts allow
const ATLAS_HOST = /^[a-z0-9-]+(\.[a-z0-9-]+)*\.mongodb\.net$/i;
const SAFE_NAME = /^[A-Za-z0-9_-]{1,64}$/;

app.get("/", (_req, res) => res.json({ ok: true, service: "mongo-extension-backend" }));

app.post("/save", async (req, res) => {
  // Optional API key: deploy platform pe API_KEY env var set karo
  if (process.env.API_KEY && req.get("x-api-key") !== process.env.API_KEY) {
    return res.status(401).json({ ok: false, error: "Invalid API key" });
  }

  const { host, dbName, username, password, collection = "entries", inputField } = req.body || {};

  if (!host || !dbName || !username || !password || inputField === undefined) {
    return res.status(400).json({ ok: false, error: "host, dbName, username, password, inputField required" });
  }
  if (!ATLAS_HOST.test(host)) {
    return res.status(400).json({ ok: false, error: "Host Atlas ka hona chahiye (xyz.mongodb.net)" });
  }
  if (!SAFE_NAME.test(dbName) || !SAFE_NAME.test(collection)) {
    return res.status(400).json({ ok: false, error: "DB/collection name me sirf letters, numbers, _ , - allowed" });
  }

  const uri =
    `mongodb+srv://${encodeURIComponent(username)}:${encodeURIComponent(password)}` +
    `@${host}/${dbName}?retryWrites=true&w=majority`;

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
  try {
    await client.connect();
    const result = await client
      .db(dbName)
      .collection(collection)
      .insertOne({ inputField: String(inputField), createdAt: new Date() });
    res.json({ ok: true, id: result.insertedId });
  } catch (err) {
    res.status(400).json({ ok: false, error: err.message });
  } finally {
    await client.close().catch(() => {});
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));