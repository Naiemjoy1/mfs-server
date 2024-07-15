const express = require("express");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ccm0dfs.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();
    const userCollection = client.db("mfsDB").collection("users");

    // User registration route
    app.post("/users", async (req, res) => {
      const { name, pin, mobile, email } = req.body;

      // Check if user already exists
      const existingUser = await userCollection.findOne({
        $or: [{ mobile }, { email }],
      });
      if (existingUser) {
        return res.status(400).json({ message: "User already exists" });
      }

      // Hash the PIN
      const salt = await bcrypt.genSalt(10);
      const hashedPin = await bcrypt.hash(pin.toString(), salt);

      // Create new user
      const newUser = {
        name,
        pin: hashedPin,
        mobile,
        email,
        balance: 0,
        status: "pending",
      };

      const result = await userCollection.insertOne(newUser);
      res.status(201).json(result);
    });

    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    console.log("Connected to MongoDB successfully!");
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("MFS server running");
});

app.listen(port, () => {
  console.log(`MFS running on port ${port}`);
});
