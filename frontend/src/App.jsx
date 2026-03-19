import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { GoogleOAuthProvider } from '@react-oauth/google';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';

function App() {
  // Client ID for demonstration / local dev. Should be in .env for production.
  const GOOGLE_CLIENT_ID = "672797424971-m2u49iko5jttdde4kfo9bo6iujvjg2kd.apps.googleusercontent.com";

  return (
    <div className="min-h-screen relative flex flex-col bg-white font-sans selection:bg-slate-200 selection:text-slate-900">

      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <Router>
          <AuthProvider>
            <Navbar />
            <main className="flex-1 relative z-10">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
                <Route
                  path="/dashboard"
                  element={
                    <ProtectedRoute>
                      <Dashboard />
                    </ProtectedRoute>
                  }
                />
              </Routes>
            </main>
          </AuthProvider>
        </Router>
      </GoogleOAuthProvider>
    </div>
  );
}

export default App;
