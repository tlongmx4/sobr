"use client";

import { createContext, useContext, useState, useEffect } from "react";

type User = {
    id: string;
    email: string;
    name: string;
    username: string;
};

type AuthContextType = {
    user: User | null;
    token: string | null;
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (name: string, username: string, email: string, password: string) => Promise<void>;
    logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
    "use no memo";

    const [user, setUser] = useState<User | null>(null);
    const [token, setToken] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    function clearAuth() {
        localStorage.removeItem("token");
        setToken(null);
        setUser(null);
    }

    useEffect(() => {
        const storedToken = localStorage.getItem("token");
        if (storedToken) {
            // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time SSR-safe hydration from localStorage; the follow-up effect verifies the token
            setToken(storedToken);
        } else {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!token) return;

        fetch("/api/users", {
            headers: { Authorization: `Bearer ${token}` },
        })
            .then((res) => {
                if (!res.ok) throw new Error("Invalid token");
                return res.json();
            })
            .then((data) => setUser(data))
            .catch(() => clearAuth())
            .finally(() => setLoading(false));
    }, [token]);

    async function login(email: string, password: string): Promise<void> {
        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
            throw new Error(`Login failed with status: ${response.status}`);
        }

        const { token, user } = await response.json();

        localStorage.setItem("token", token);
        setToken(token);
        setUser(user);
    }

    async function signup(name: string, username: string, email: string, password: string): Promise<void> {
        const response = await fetch("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, username, email, password }),
        });

        if (!response.ok) {
            throw new Error(`Signup failed with status: ${response.status}`);
        }

        await login(email, password);
    }

    function logout() {
        clearAuth();
    }

    return (
        <AuthContext.Provider value={{ user, token, loading, login, signup, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within AuthProvider");
    return context;
}