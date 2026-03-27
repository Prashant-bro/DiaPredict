"use client";
import { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';

// For Next.js unified project, API is on the same host
const API_URL = ''; 

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem('token');
        const savedUser = localStorage.getItem('user');
        if (token && savedUser) {
            try {
                setUser(JSON.parse(savedUser));
                axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
            } catch (e) {
                console.error("Failed to parse saved user", e);
            }
        }
        setLoading(false);
    }, []);

    const login = async (email, password) => {
        try {
            const res = await axios.post(`${API_URL}/api/auth/login`, { email, password });
            const { token, user } = res.data;
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            setUser(user);
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } catch (err) {
            console.error("Login Error:", err.response?.data?.message || err.message);
            throw err;
        }
    };

    const register = async (name, email, password) => {
        try {
            const res = await axios.post(`${API_URL}/api/auth/register`, { name, email, password });
            const { token, user } = res.data;
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            setUser(user);
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } catch (err) {
            console.error("Registration Error:", err.response?.data?.message || err.message);
            throw err;
        }
    };

    const googleLogin = async (credential) => {
        try {
            const res = await axios.post(`${API_URL}/api/auth/google`, { credential });
            const { token, user } = res.data;
            localStorage.setItem('token', token);
            localStorage.setItem('user', JSON.stringify(user));
            setUser(user);
            axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        } catch (err) {
            console.error("Google Auth Error:", err.response?.data?.message || err.message);
            throw err;
        }
    };

    const logout = () => {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        setUser(null);
        if (axios.defaults.headers.common['Authorization']) {
            delete axios.defaults.headers.common['Authorization'];
        }
    };

    return (
        <AuthContext.Provider value={{ user, login, register, googleLogin, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};
