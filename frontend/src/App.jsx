import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import ProtectedRoute from './components/ProtectedRoute';

import HomePage from './pages/HomePage';
import AdminLoginPage from './pages/AdminLoginPage';
import AdminDashboard from './pages/AdminDashboard';
import LearningPage from './pages/LearningPage';
import DidYouKnowPage from './pages/DidYouKnowPage';
import JoinGamePage from './pages/JoinGamePage';
import GamePage from './pages/GamePage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import AdminRegisterPage from './pages/AdminRegisterPage';
import NotFoundPage from './pages/NotFoundPage';

// VITE_APP_MODE = 'admin' or 'student'
// Set this in Vercel environment variables for each deployment
const MODE = import.meta.env.VITE_APP_MODE || 'student';

function App() {
  return (
    <BrowserRouter>
      <LanguageProvider mode={MODE}>
        <AuthProvider>
          <Routes>
          {MODE === 'admin' ? (
            // ── ADMIN DEPLOYMENT ──
            <>
              <Route path="/" element={<AdminLoginPage />} />
              <Route path="/admin/login" element={<AdminLoginPage />} />
              <Route path="/admin/forgot-password" element={<ForgotPasswordPage />} />
              <Route path="/admin/dashboard" element={
                <ProtectedRoute><AdminDashboard /></ProtectedRoute>
              } />
              <Route path="/admin/register" element={<AdminRegisterPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </>
          ) : (
            // ── STUDENT DEPLOYMENT ──
            <>
              <Route path="/" element={<HomePage />} />
              <Route path="/learning" element={<LearningPage />} />
              <Route path="/did-you-know" element={<DidYouKnowPage />} />
              <Route path="/join" element={<JoinGamePage />} />
              <Route path="/join/:code" element={<JoinGamePage />} />
              <Route path="/game/:token" element={<GamePage />} />
              <Route path="*" element={<NotFoundPage />} />
            </>
          )}
        </Routes>
        </AuthProvider>
      </LanguageProvider>
    </BrowserRouter>
  );
}

export default App;
