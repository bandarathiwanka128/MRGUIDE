import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';

export default function AdminRoute({ user, children }) {
  const location = useLocation();
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  if (user.role !== 'admin') return <Navigate to="/" replace />;
  return children;
}
