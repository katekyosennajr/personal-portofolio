import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { SunIcon, MoonIcon } from '@heroicons/react/24/solid';
import { Toaster, toast } from 'react-hot-toast';
import Login from './components/Login';
import Register from './components/Register';
import ProductTable from './components/ProductTable';
import ProductCharts from './components/ProductCharts';
import './App.css';

function App() {
  console.log('App component rendering...');
  
  const [darkMode, setDarkMode] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('Initial useEffect running...');
    // Check for existing auth token
    const token = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    
    console.log('Token:', token);
    console.log('Saved user:', savedUser);
    
    if (token && savedUser) {
      setIsAuthenticated(true);
      setUser(JSON.parse(savedUser));
    }
    
    setLoading(false);

    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setDarkMode(true);
    }
  }, []);

  useEffect(() => {
    console.log('Dark mode effect running:', darkMode);
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  const handleLogin = (data) => {
    console.log('Login handler called with:', data);
    setIsAuthenticated(true);
    setUser(data.user);
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
  };

  const handleLogout = () => {
    console.log('Logout handler called');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setIsAuthenticated(false);
    setUser(null);
    toast.success('Logged out successfully');
  };

  if (loading) {
    console.log('Showing loading state...');
    return <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="text-xl text-gray-600 dark:text-gray-300">Loading...</div>
    </div>;
  }

  console.log('Rendering main app UI. Auth state:', isAuthenticated);

  return (
    <Router>
      <div className={`min-h-screen transition-colors duration-200 ${darkMode ? 'dark bg-gray-900' : 'bg-gray-50'}`}>
        <Toaster position="top-right" />
        
        <Routes>
          {/* Root route */}
          <Route 
            path="/" 
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Navigate to="/login" replace />
              )
            } 
          />
          
          <Route 
            path="/login" 
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Login onLogin={handleLogin} />
              )
            } 
          />
          
          <Route 
            path="/register" 
            element={
              isAuthenticated ? (
                <Navigate to="/dashboard" replace />
              ) : (
                <Register />
              )
            } 
          />
          
          <Route 
            path="/dashboard" 
            element={
              !isAuthenticated ? (
                <Navigate to="/login" replace />
              ) : (
                <div className="container mx-auto px-4 py-8">
                  <div className="flex justify-between items-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                      Product Management System
                    </h1>
                    <div className="flex items-center space-x-4">
                      <span className="text-gray-600 dark:text-gray-300">
                        Welcome, {user?.username}!
                      </span>
                      <button
                        onClick={() => setDarkMode(!darkMode)}
                        className="p-2 rounded-lg bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                      >
                        {darkMode ? (
                          <SunIcon className="h-5 w-5 text-gray-600 dark:text-gray-300" />
                        ) : (
                          <MoonIcon className="h-5 w-5 text-gray-600" />
                        )}
                      </button>
                      <button
                        onClick={handleLogout}
                        className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                      >
                        Logout
                      </button>
                    </div>
                  </div>

                  <ProductCharts />
                  <ProductTable />
                </div>
              )
            } 
          />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
