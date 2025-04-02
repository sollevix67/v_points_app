import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './lib/supabase';
import Home from './pages/Home';
import PointDetail from './pages/PointDetail';
import Login from './pages/admin/Login';
import Points from './pages/admin/Points';
import AdminMap from './pages/admin/Map';
import { AuthState } from './types/types';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    user: null,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthState({
        isAuthenticated: !!session,
        user: session?.user || null,
      });
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setAuthState({
      isAuthenticated: !!session,
      user: session?.user || null,
    });
    setLoading(false);
  };

  if (loading) {
    return <div>Chargement...</div>;
  }

  return authState.isAuthenticated ? (
    <>{children}</>
  ) : (
    <Navigate to="/admin/login" replace />
  );
}

function App() {
  return (
    <Router>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<Home />} />
        <Route path="/point/:id" element={<PointDetail />} />
        
        {/* Admin routes */}
        <Route path="/admin/login" element={<Login />} />
        <Route
          path="/admin/points"
          element={
            <PrivateRoute>
              <Points />
            </PrivateRoute>
          }
        />
        <Route
          path="/admin/map"
          element={
            <PrivateRoute>
              <AdminMap />
            </PrivateRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;