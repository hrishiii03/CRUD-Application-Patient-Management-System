const http = require("http");
const fs = require("fs");
const path = require("path");
const { URL } = require("url");
const { MongoClient, ObjectId } = require("mongodb");

const HOST = process.env.HOST || "127.0.0.1";
const PORT = Number(process.env.PORT || 3000);
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017";
const DB_NAME = process.env.DB_NAME || "hospital_management";
const COLLECTION_NAME = "patients";
const PUBLIC_DIR = __dirname;
const DB_RETRY_INTERVAL_MS = 5000;

const client = new MongoClient(MONGODB_URI);
let patientsCollection;
let isDbConnected = false;
let reconnectTimer = null;

async function connectToDatabase() {
  await client.connect();
  const db = client.db(DB_NAME);
  patientsCollection = db.collection(COLLECTION_NAME);
  await patientsCollection.createIndex({ patientId: 1 }, { unique: true });
  await patientsCollection.createIndex({ fullName: "text", disease: "text", doctorAssigned: "text" });
  isDbConnected = true;
}

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  });
  res.end(JSON.stringify(payload));
}

function sendFile(res, filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const contentTypes = {
    ".html": "text/html; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".jpeg": "image/jpeg",
    ".svg": "image/svg+xml",
    ".ico": "image/x-icon"
  };

  fs.readFile(filePath, (error, data) => {
    if (error) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("File not found");
      return;
    }

    res.writeHead(200, { "Content-Type": contentTypes[ext] || "application/octet-stream" });
    res.end(data);
  });
}

function getRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";

    req.on("data", (chunk) => {
      body += chunk.toString();
      if (body.length > 1e6) {
        reject(new Error("Request body too large"));
        req.destroy();
      }
    });

    req.on("end", () => {
      if (!body) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(body));
      } catch (error) {
        reject(new Error("Invalid JSON payload"));
      }
    });

    req.on("error", reject);
  });
}

function sanitizePatient(payload) {
  const patient = {
    patientId: String(payload.patientId || "").trim(),
    fullName: String(payload.fullName || "").trim(),
    age: Number(payload.age),
    gender: String(payload.gender || "").trim(),
    phone: String(payload.phone || "").trim(),
    address: String(payload.address || "").trim(),
    disease: String(payload.disease || "").trim(),
    doctorAssigned: String(payload.doctorAssigned || "").trim(),
    admissionDate: String(payload.admissionDate || "").trim(),
    roomNumber: String(payload.roomNumber || "").trim(),
    status: String(payload.status || "Admitted").trim()
  };

  const requiredFields = [
    "patientId",
    "fullName",
    "gender",
    "phone",
    "disease",
    "doctorAssigned",
    "admissionDate",
    "status"
  ];

  for (const field of requiredFields) {
    if (!patient[field]) {
      throw new Error(`${field} is required`);
    }
  }

  if (!Number.isFinite(patient.age) || patient.age <= 0) {
    throw new Error("age must be a positive number");
  }

  return patient;
}

async function handleApi(req, res, pathname, searchParams) {
  if (!patientsCollection || !isDbConnected) {
    sendJson(res, 503, { error: "Database connection is not ready yet. Start MongoDB and try again." });
    return;
  }

  if (req.method === "GET" && pathname === "/api/patients") {
    const search = String(searchParams.get("search") || "").trim();
    const status = String(searchParams.get("status") || "").trim();

    const query = {};
    if (search) {
      query.$or = [
        { patientId: { $regex: search, $options: "i" } },
        { fullName: { $regex: search, $options: "i" } },
        { disease: { $regex: search, $options: "i" } },
        { doctorAssigned: { $regex: search, $options: "i" } }
      ];
    }
    if (status) {
      query.status = status;
    }

    const patients = await patientsCollection
      .find(query)
      .sort({ createdAt: -1 })
      .toArray();

    sendJson(res, 200, patients);
    return;
  }

  if (req.method === "POST" && pathname === "/api/patients") {
    const payload = sanitizePatient(await getRequestBody(req));
    const document = {
      ...payload,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await patientsCollection.insertOne(document);
    sendJson(res, 201, { message: "Patient added successfully.", id: result.insertedId });
    return;
  }

  const patientIdMatch = pathname.match(/^\/api\/patients\/([a-f0-9]{24})$/i);
  if (patientIdMatch) {
    const id = new ObjectId(patientIdMatch[1]);

    if (req.method === "GET") {
      const patient = await patientsCollection.findOne({ _id: id });
      if (!patient) {
        sendJson(res, 404, { error: "Patient not found." });
        return;
      }
      sendJson(res, 200, patient);
      return;
    }

    if (req.method === "PUT") {
      const payload = sanitizePatient(await getRequestBody(req));
      const result = await patientsCollection.updateOne(
        { _id: id },
        {
          $set: {
            ...payload,
            updatedAt: new Date()
          }
        }
      );

      if (result.matchedCount === 0) {
        sendJson(res, 404, { error: "Patient not found." });
        return;
      }

      sendJson(res, 200, { message: "Patient updated successfully." });
      return;
    }

    if (req.method === "DELETE") {
      const result = await patientsCollection.deleteOne({ _id: id });
      if (result.deletedCount === 0) {
        sendJson(res, 404, { error: "Patient not found." });
        return;
      }

      sendJson(res, 200, { message: "Patient deleted successfully." });
      return;
    }
  }

  sendJson(res, 404, { error: "API route not found." });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  const pathname = parsedUrl.pathname;

  if (req.method === "OPTIONS") {
    res.writeHead(204, {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    res.end();
    return;
  }

  try {
    if (pathname.startsWith("/api/")) {
      await handleApi(req, res, pathname, parsedUrl.searchParams);
      return;
    }

    const targetPath = pathname === "/" ? "/index.html" : pathname;
    const normalizedPath = path.normalize(targetPath).replace(/^(\.\.[\/\\])+/, "");
    const filePath = path.join(PUBLIC_DIR, normalizedPath);

    if (!filePath.startsWith(PUBLIC_DIR)) {
      res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Forbidden");
      return;
    }

    sendFile(res, filePath);
  } catch (error) {
    if (error.code === 11000) {
      sendJson(res, 409, { error: "Patient ID already exists." });
      return;
    }

    sendJson(res, 500, { error: error.message || "Internal server error." });
  }
});

async function connectWithRetry() {
  try {
    await connectToDatabase();
    console.log(`MongoDB connected at ${MONGODB_URI}`);
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
  } catch (error) {
    isDbConnected = false;
    patientsCollection = null;
    console.error(`MongoDB connection failed: ${error.message}`);
    reconnectTimer = setTimeout(connectWithRetry, DB_RETRY_INTERVAL_MS);
  }
}

function start() {
  server.listen(PORT, HOST, () => {
    console.log(`Server running at http://${HOST}:${PORT}`);
    connectWithRetry();
  });
}

process.on("SIGINT", async () => {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
  }
  await client.close();
  process.exit(0);
});

start();
