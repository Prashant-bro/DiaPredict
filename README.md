# DiaPredict: Diabetes Risk Assessment System 🩺

DiaPredict is a sophisticated, AI-powered health platform designed to predict diabetes risk and provide personalized health insights. By combining Machine Learning (LightGBM) with GenAI (Google Gemini), it offers a comprehensive analysis of user health data and medical documents.

## 🚀 Key Features

- **AI-Powered Risk Prediction**: Uses a LightGBM Classifier to analyze health metrics and predict the probability of diabetes.
- **Intelligent Health Assistant**: A Gemini-powered chatbot for real-time health queries and personalized advice.
- **Deep Medical Insights**: Multi-stage prediction flow for refined accuracy based on detailed user input.
- **PDF Report Analysis**: Capability to process and analyze medical reports for contextual health assessments.
- **Secure Authentication**: Google OAuth integration and JWT-based session management.
- **Real-time Updates**: Live loading features for a seamless user experience.

## 🛠️ Technology Stack

### Frontend
- **Framework**: React.js (Vite)
- **Styling**: Tailwind CSS, Framer Motion (Animations)
- **Icons**: Lucide React
- **State Management**: React Context API

### Backend
- **Runtime**: Node.js & Express.js
- **Database**: MongoDB (Mongoose)
- **Security**: JWT, Helmet.js, Bcrypt.js, HTTP-only Cookies
- **Communication**: Socket.io (Live loading)

### Machine Learning & AI
- **Brain**: Python (FastAPI)
- **Model**: LightGBM Classifier
- **LLM**: Google Gemini API (Generative AI)

## 📦 Project Structure

```text
├── backend/          # Node.js/Express API
├── frontend/         # React/Vite Application
├── ml_api/           # FastAPI with ML Model & Gemini Integration
├── data.csv          # Dataset used for ML model training
└── README.md         # Project documentation
```

## ⚙️ Installation & Setup

### Prerequisites
- Node.js (v18+)
- Python (v3.9+)
- MongoDB Atlas account
- Google Gemini API Key

### 1. Clone the Repository
```bash
git clone https://github.com/YOUR_USERNAME/Diabetes-Risk-Bot.git
cd Diabetes-Risk-Bot
```

### 2. Backend Setup
```bash
cd backend
npm install
# Create a .env file with:
# PORT, MONGO_URI, JWT_SECRET, GEMINI_API_KEY
npm run dev
```

### 3. Frontend Setup
```bash
cd ../frontend
npm install
# Create a .env file with:
# VITE_API_URL, VITE_GOOGLE_CLIENT_ID
npm run dev
```

### 4. ML API Setup
```bash
cd ../ml_api
pip install -r requirements.txt
uvicorn main:app --reload
```

## 🛡️ Security
- All sensitive data is stored using environment variables.
- Password hashing using `Bcrypt.js`.
- CSRF protection and secure headers via `Helmet.js`.

## 📄 License
This project is for educational and health-awareness purposes.

---
*Built with ❤️ for a healthier future.*
