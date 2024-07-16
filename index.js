const express = require("express");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const { MongoClient, ObjectId, ServerApiVersion } = require("mongodb");
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
    const transactionCollection = client.db("mfsDB").collection("transactions");

    //log api
    const logTransaction = async (type, sender, receiver, amount) => {
      const transaction = {
        type,
        sender,
        receiver,
        amount,
        timestamp: new Date(),
      };
      await transactionCollection.insertOne(transaction);
    };

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
      const { name, pin, mobile, email, profileImage, userType } = req.body;

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

      // Set initial balance based on user type
      let initialBalance = 0;
      if (userType === "user") {
        initialBalance = 40;
      } else if (userType === "agent") {
        initialBalance = 10000;
      }

      // Create new user
      const newUser = {
        name,
        pin: hashedPin,
        mobile,
        email,
        profileImage,
        userType,
        balance: initialBalance,
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

    // Delete user route
    app.delete("/users/:id", async (req, res) => {
      const id = req.params.id;
      const result = await userCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // Backend route to update user status
    app.patch("/users/status/:email", async (req, res) => {
      const email = req.params.email;
      const { status } = req.body;

      try {
        const updatedUser = await userCollection.updateOne(
          { email },
          { $set: { status } }
        );

        if (updatedUser.modifiedCount > 0) {
          res.send({ modifiedCount: updatedUser.modifiedCount });
        } else {
          res
            .status(404)
            .send({ message: "User not found or status not updated" });
        }
      } catch (error) {
        console.error("Error updating user status:", error);
        res.status(500).send({ message: "Internal server error" });
      }
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
          userType: user.userType,
          profileImage: user.profileImage,
        },
      });
    });

    // Send money route
    app.post("/send-money", async (req, res) => {
      const { receiverIdentifier, amount, pin } = req.body;
      const senderEmail = req.body.senderEmail; // Assuming sender's email is passed from frontend

      try {
        // Find sender's and receiver's information
        const sender = await userCollection.findOne({ email: senderEmail });
        let receiver;

        // Determine if receiverIdentifier is email or mobile
        if (receiverIdentifier.includes("@")) {
          receiver = await userCollection.findOne({
            email: receiverIdentifier,
          });
        } else {
          receiver = await userCollection.findOne({
            mobile: receiverIdentifier,
          });
        }

        if (!sender || !receiver) {
          return res.status(404).json({ message: "Receiver not found" });
        }

        // Check user types
        if (sender.userType !== "user" || receiver.userType !== "user") {
          return res
            .status(403)
            .json({ message: "Users can only send to other users" });
        }

        // Verify sender's PIN
        const isPinMatch = await bcrypt.compare(pin.toString(), sender.pin);
        if (!isPinMatch) {
          return res.status(401).json({ message: "Invalid PIN" });
        }

        // Validate amount
        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
          return res.status(400).json({ message: "Invalid amount" });
        }

        // Check if sender has sufficient balance
        if (sender.balance < numericAmount) {
          return res.status(400).json({ message: "Insufficient balance" });
        }

        // Perform the transaction
        const updatedSenderBalance = parseFloat(sender.balance) - numericAmount;
        const updatedReceiverBalance =
          parseFloat(receiver.balance) + numericAmount;

        // Update balances in the database
        await userCollection.updateOne(
          { _id: sender._id },
          { $set: { balance: updatedSenderBalance } }
        );

        await userCollection.updateOne(
          { _id: receiver._id },
          { $set: { balance: updatedReceiverBalance } }
        );

        // Log the transaction
        await logTransaction(
          "send-money",
          sender.email,
          receiver.email,
          numericAmount
        );

        res.json({
          message: "Money sent successfully",
          sender: sender.email,
          receiver: receiver.email,
        });
      } catch (error) {
        console.error("Error sending money:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    // Cash Out route
    app.post("/cash-out", async (req, res) => {
      const { receiverIdentifier, amount, pin } = req.body;
      const senderEmail = req.body.senderEmail;

      try {
        const sender = await userCollection.findOne({ email: senderEmail });
        let receiver;

        if (receiverIdentifier.includes("@")) {
          receiver = await userCollection.findOne({
            email: receiverIdentifier,
          });
        } else {
          receiver = await userCollection.findOne({
            mobile: receiverIdentifier,
          });
        }

        if (!sender || !receiver) {
          return res
            .status(404)
            .json({ message: "Sender or receiver not found" });
        }

        if (sender.userType !== "user") {
          return res
            .status(403)
            .json({ message: "Only users can perform cash out" });
        }

        if (receiver.userType !== "agent") {
          return res
            .status(403)
            .json({ message: "Users can only send money to agents" });
        }

        const isPinMatch = await bcrypt.compare(pin.toString(), sender.pin);
        if (!isPinMatch) {
          return res.status(401).json({ message: "Invalid PIN" });
        }

        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
          return res.status(400).json({ message: "Invalid amount" });
        }

        if (sender.balance < numericAmount) {
          return res.status(400).json({ message: "Insufficient balance" });
        }

        const updatedSenderBalance = sender.balance - numericAmount;
        const updatedReceiverBalance = receiver.balance + numericAmount;

        await userCollection.updateOne(
          { _id: sender._id },
          { $set: { balance: updatedSenderBalance } }
        );
        await userCollection.updateOne(
          { _id: receiver._id },
          { $set: { balance: updatedReceiverBalance } }
        );

        // Log the transaction
        await logTransaction(
          "cash-out",
          sender.email,
          receiver.email,
          numericAmount
        );

        res.json({
          message: "Cash Out successfully done",
          sender: sender.email,
          receiver: receiver.email,
        });
      } catch (error) {
        console.error("Error sending money:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    // Cash In route
    app.post("/cash-in", async (req, res) => {
      const { receiverIdentifier, amount, pin } = req.body;
      const senderEmail = req.body.senderEmail; // Assuming sender's email is passed from frontend

      try {
        // Find sender's and receiver's information
        const sender = await userCollection.findOne({ email: senderEmail });
        let receiver;

        // Determine if receiverIdentifier is email or mobile
        if (receiverIdentifier.includes("@")) {
          receiver = await userCollection.findOne({
            email: receiverIdentifier,
          });
        } else {
          receiver = await userCollection.findOne({
            mobile: receiverIdentifier,
          });
        }

        // Check if sender and receiver exist
        if (!sender || !receiver) {
          return res.status(404).json({ message: "Receiver not found" });
        }

        // Check if the sender is an agent
        if (sender.userType !== "agent") {
          return res
            .status(403)
            .json({ message: "Only agents can do cash-in" });
        }

        // Ensure the receiver is a user and not an agent
        if (receiver.userType !== "user") {
          return res
            .status(403)
            .json({ message: "Agents can only send to users" });
        }

        // Verify sender's PIN
        const isPinMatch = await bcrypt.compare(pin.toString(), sender.pin);
        if (!isPinMatch) {
          return res.status(401).json({ message: "Invalid PIN" });
        }

        // Validate amount
        const numericAmount = parseFloat(amount);
        if (isNaN(numericAmount) || numericAmount <= 0) {
          return res.status(400).json({ message: "Invalid amount" });
        }

        // Check if sender has sufficient balance
        if (sender.balance < numericAmount) {
          return res.status(400).json({ message: "Insufficient balance" });
        }

        // Perform the transaction
        const updatedSenderBalance = parseFloat(sender.balance) - numericAmount;
        const updatedReceiverBalance =
          parseFloat(receiver.balance) + numericAmount;

        // Update balances in the database
        await userCollection.updateOne(
          { _id: sender._id },
          { $set: { balance: updatedSenderBalance } }
        );

        await userCollection.updateOne(
          { _id: receiver._id },
          { $set: { balance: updatedReceiverBalance } }
        );

        // Log the transaction
        await logTransaction(
          "cash-in",
          sender.email,
          receiver.email,
          numericAmount
        );

        res.json({
          message: "Money sent successfully",
          sender: sender.email,
          receiver: receiver.email,
        });
      } catch (error) {
        console.error("Error sending money:", error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

    // Get transaction history
    app.get("/history", async (req, res) => {
      const result = await transactionCollection.find().toArray();
      res.send(result);
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
