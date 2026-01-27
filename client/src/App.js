import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SocketProvider } from './contexts/SocketContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout/Layout';
import ErrorBoundary from './components/ErrorBoundary';

// Loading component for Suspense fallback
const LoadingFallback = () => (
  <div className="min-h-screen flex items-center justify-center bg-gray-50">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
      <p className="text-gray-600">جاري التحميل...</p>
    </div>
  </div>
);

// Lazy load pages for code splitting (improves initial load time)
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));
const TeacherDashboard = lazy(() => import('./pages/Teacher/Dashboard'));
const TeacherStudents = lazy(() => import('./pages/Teacher/Students'));
const StudentProfile = lazy(() => import('./pages/Teacher/StudentProfile'));
const TeacherExams = lazy(() => import('./pages/Teacher/Exams'));
const ExamGroups = lazy(() => import('./pages/Teacher/ExamGroups'));
const CreateExam = lazy(() => import('./pages/Teacher/CreateExam'));
const EditExam = lazy(() => import('./pages/Teacher/EditExam'));
const ViewExam = lazy(() => import('./pages/Teacher/ViewExam'));
const TeacherAnalytics = lazy(() => import('./pages/Teacher/Analytics'));
const ManageReviews = lazy(() => import('./pages/Teacher/ManageReviews'));
const StudentDashboard = lazy(() => import('./pages/Student/Dashboard'));
const TakeExam = lazy(() => import('./pages/Student/TakeExam'));
const TakeReviewExam = lazy(() => import('./pages/Student/TakeReviewExam'));
const ExamHistory = lazy(() => import('./pages/Student/ExamHistory'));
const PublicExam = lazy(() => import('./pages/PublicExam'));

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
    <ErrorBoundary>
      <AuthProvider>
        <SocketProvider>
          <Router>
            <div className="App">
            <Suspense fallback={<LoadingFallback />}>
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
              path="/teacher/exam-groups"
              element={
                <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                  <Layout>
                    <ExamGroups />
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
            <Route
              path="/teacher/reviews"
              element={
                <ProtectedRoute allowedRoles={['teacher', 'admin']}>
                  <Layout>
                    <ManageReviews />
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
            </Suspense>
          </div>
        </Router>
      </SocketProvider>
    </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
