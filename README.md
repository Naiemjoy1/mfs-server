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
   git clone https://github.com/Naiemjoy1/mfs-server
   cd mfs-server
   ```
````

2. Install the dependencies:

   ```bash
   npm install
   ```

3. Create a `.env` file in the root directory and add your MongoDB URI and JWT secret:

   ```plaintext
   DB_USER=Your_MongoDB_USER
   DB_PASS=Your_MongoDB_PASS
   ACCESS_TOKEN_SECRET=your_jwt_secret
   ```

4. Start the server:
   ```bash
   npm start
   ```

## Contributing

Feel free to fork this project, create a feature branch, and submit a pull request.
