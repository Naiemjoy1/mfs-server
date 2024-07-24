### Server Side README

````markdown
# Mobile Financial Service (MFS) Server

This is the server-side application for a basic Mobile Financial Service (MFS) like bKash or Nagad. It is built using Node.js, Express.js, and MongoDB.

## Features

- User and Agent Registration and Login
- Send Money
- Cash-Out
- Balance Inquiry
- Transaction History
- Admin Management
- Secure Endpoints with JWT Authentication

## Tech Stack

- Node.js
- Express.js
- MongoDB
- Mongoose
- JWT
- Bcrypt.js

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/mfs-server.git
   cd mfs-server
   ```
````

2. Install the dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and add your MongoDB URI and JWT secret:

   ```plaintext
   MONGODB_URI=your_mongodb_uri
   JWT_SECRET=your_jwt_secret
   ```

4. Start the server:
   ```bash
   npm start
   ```

## Dependencies

- bcryptjs: ^2.4.3
- body-parser: ^1.20.2
- cors: ^2.8.5
- dotenv: ^16.4.5
- express: ^4.19.2
- jsonwebtoken: ^9.0.2
- mongodb: ^6.8.0
- mongoose: ^8.5.1

## API Endpoints

- `POST /register`: Register a new user or agent
- `POST /login`: User or agent login
- `POST /send-money`: Send money to another user
- `POST /cash-out`: Cash out money through an agent
- `GET /balance`: Get account balance
- `GET /transactions`: Get transaction history
- `GET /admin/users`: Admin view all users
- `POST /admin/approve`: Admin approve user or agent registration
- `POST /admin/block`: Admin block user or agent

## Folder Structure

```plaintext
src/
├── controllers/
├── models/
├── routes/
├── middleware/
├── utils/
├── server.js
└── ...
```

## Contributing

Feel free to fork this project, create a feature branch, and submit a pull request.

## License

This project is licensed under the MIT License.

```

These README files provide a clear overview of the client and server applications, including their features, tech stacks, installation instructions, dependencies, folder structures, and contribution guidelines. Feel free to adjust the content to better fit your specific needs.
```
