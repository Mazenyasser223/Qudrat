import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout/Layout';

// Pages
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import TeacherDashboard from './pages/Teacher/Dashboard';
import TeacherStudents from './pages/Teacher/Students';
import StudentProfile from './pages/Teacher/StudentProfile';
import TeacherExams from './pages/Teacher/Exams';
import CreateExam from './pages/Teacher/CreateExam';
import EditExam from './pages/Teacher/EditExam';
import ViewExam from './pages/Teacher/ViewExam';
import TeacherAnalytics from './pages/Teacher/Analytics';
import StudentDashboard from './pages/Student/Dashboard';
import TakeExam from './pages/Student/TakeExam';
import TakeReviewExam from './pages/Student/TakeReviewExam';
import ExamHistory from './pages/Student/ExamHistory';
import PublicExam from './pages/PublicExam';

// Unauthorized page
const Unauthorized = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <h1 className="text-4xl font-bold text-gray-900 mb-4">403</h1>
      <p className="text-gray-600 mb-8">ليس لديك صلاحية للوصول إلى هذه الصفحة</p>
      <button
        onClick={() => window.history.back()}
        className="btn-primary"
      >
        العودة
      </button>
    </div>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <SocketProvider>
        <Router>
          <div className="App">
            <Routes>
            {/* Public Routes */}
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/public-exam/:examId" element={<PublicExam />} />
            <Route path="/unauthorized" element={<Unauthorized />} />

            {/* Teacher Routes */}
            <Route
              path="/teacher"
              element={
                <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                  <Layout>
                    <TeacherDashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/students"
              element={
                <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                  <Layout>
                    <TeacherStudents />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/students/:studentId"
              element={
                <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                  <Layout>
                    <StudentProfile />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/exams"
              element={
                <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                  <Layout>
                    <TeacherExams />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/exams/create"
              element={
                <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                  <Layout>
                    <CreateExam />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/exams/edit/:examId"
              element={
                <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                  <Layout>
                    <EditExam />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/exams/view/:examId"
              element={
                <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                  <Layout>
                    <ViewExam />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/teacher/analytics"
              element={
                <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                  <Layout>
                    <TeacherAnalytics />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Student Routes */}
            <Route
              path="/student"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <Layout>
                    <StudentDashboard />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/exam/:examId"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <Layout>
                    <TakeExam />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/review-exam/:reviewExamId"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <Layout>
                    <TakeReviewExam />
                  </Layout>
                </ProtectedRoute>
              }
            />
            <Route
              path="/student/exam-history/:examId"
              element={
                <ProtectedRoute allowedRoles={['student']}>
                  <Layout>
                    <ExamHistory />
                  </Layout>
                </ProtectedRoute>
              }
            />

            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>
        </Router>
      </SocketProvider>
    </AuthProvider>
  );
}

export default App;
