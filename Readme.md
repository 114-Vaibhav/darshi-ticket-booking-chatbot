# 🏛️ Online Chatbot-Based Ticketing System

This project is a multilingual, AI-powered ticketing system for museums and parks across India. It supports both **Rule-Based** and **NLP-based** chatbot interfaces, integrated with **Dialogflow ES**, **MySQL**, **Razorpay**, and **Google Authentication**.

---

## 📁 Project Structure

```
project-root/
├── backend/       # Node.js backend with Google Auth, Razorpay, MySQL
│   └── server.js
│
├── webhook1/      # Dialogflow ES webhook (Node.js + MySQL)
│   └── index.js
│
├── chatbot/       # React + Vite chatbot frontend (ChatNLP.jsx)
│   └── ChatNLP.jsx
```

---

## 🔧 Setup Instructions

### 1. Clone the repository

```bash
git clone <your-repo-url>
cd <your-project-folder>
```

### 2. Install dependencies in all folders

Go to each folder and run:

```bash
npm install
```

Folders:

- `/chatbot`
- `/backend`
- `/webhook1`

---

## 🔑 Environment Setup

### 🛠️ Backend (`/backend`)

Create a `.env` file inside the `/backend` folder with:

```env
DB_HOST=your_mysql_host
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=your_db_name

GOOGLE_CLIENT_ID=your_google_auth_client_id
RAZORPAY_KEY=your_razorpay_key
```

### 🔗 Webhook (`/webhook1`)

Create a `.env` file inside the `/webhook1` folder with:

```env
DB_HOST=your_mysql_host
DB_USER=your_mysql_user
DB_PASSWORD=your_mysql_password
DB_NAME=your_db_name
```

> ⚠️ Make sure database credentials are the same in both places.

---

## 🚀 Running the Project

Start services in the following order:

### 1. Start Chatbot UI

```bash
cd chatbot
npm run dev
```

### 2. Start Backend Server

```bash
cd backend
node server.js
```

### 3. Start Dialogflow Webhook

```bash
cd webhook1
node index.js
```

---

## ✅ Features

- ✅ Rule-Based Chatbot
- ✅ NLP Chatbot with Dialogflow ES
- ✅ MySQL Integration
- ✅ Google OAuth Login
- ✅ Razorpay Payment Gateway
- ✅ Admin Panel for Museums/Parks
- ✅ Ticket Booking and History

---

## 📌 Notes

- Use `ngrok` or deploy webhook to a public server to connect with Dialogflow.
- Make sure all `.env` files are properly configured.
- Never commit `.env` files to version control.

---

## 📃 License

MIT License © 2025
