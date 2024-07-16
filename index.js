const express = require("express");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
const jwt = require("jsonwebtoken");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 3000;

// Middleware
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

    // JWT API
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // Middleware to verify JWT token
    const verifyToken = (req, res, next) => {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).send({ message: "Forbidden access" });
      }
      const token = authHeader.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "Unauthorized access" });
        }
        req.user = decoded;
        next();
      });
    };

    // User registration route
    app.post("/users", async (req, res) => {
      const { name, pin, mobile, email, profileImage } = req.body;

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
        profileImage,
        balance: 0,
        status: "pending",
      };

      const result = await userCollection.insertOne(newUser);
      res.status(201).json(result);
    });

    // Get all users (for testing purposes)
    app.get("/users", async (req, res) => {
      const result = await userCollection.find().toArray();
      res.send(result);
    });

    // Login API
    app.post("/login", async (req, res) => {
      const { email, pin } = req.body;

      // Find user by email or mobile
      const user = await userCollection.findOne({
        $or: [{ email }, { mobile: email }],
      });
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Compare hashed PIN
      const isMatch = await bcrypt.compare(pin.toString(), user.pin);
      if (!isMatch) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      // Generate JWT token
      const token = jwt.sign(
        { id: user._id, email: user.email },
        process.env.ACCESS_TOKEN_SECRET,
        {
          expiresIn: "1h",
        }
      );

      // Return token and user data
      res.json({
        message: "Login successful",
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          mobile: user.mobile,
          balance: user.balance,
          status: user.status,
          profileImage: user.profileImage,
        },
      });
    });

    // Protected route example
    app.get("/protected", verifyToken, (req, res) => {
      res.send({ message: "This is a protected route", user: req.user });
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
