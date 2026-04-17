# Hospital Patient Management System

A simple CRUD web development project built with Node.js, MongoDB, and JavaScript. This version uses Node's built-in `http` module, so it does not require Express.

## Features

- Add a new patient
- View all patients
- Search by patient ID, name, disease, or doctor
- Filter by patient status
- Edit existing patient details
- Delete patient records

## Tech Stack

- Node.js
- MongoDB
- HTML
- CSS
- Vanilla JavaScript

## Project Structure

```text
hospital-patient-management/
|--app.js
|--index.html
|--styles.css
|-- package.json
|-- README.md
`-- server.js
```

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Make sure MongoDB is running locally on:

   ```text
   mongodb://127.0.0.1:27017
   ```

3. Start the project:

   ```bash
   npm start
   ```

4. Open the app in your browser:

   ```text
   http://127.0.0.1:3000
   ```

## Optional Environment Variables

- `HOST` default: `127.0.0.1`
- `PORT` default: `3000`
- `MONGODB_URI` default: `mongodb://127.0.0.1:27017`
- `DB_NAME` default: `hospital_management`

## Patient Fields

- Patient ID
- Full Name
- Age
- Gender
- Phone
- Address
- Disease
- Doctor Assigned
- Admission Date
- Room Number
- Status


