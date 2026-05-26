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
    loading: boolean;
    login: (email: string, password: string) => Promise<void>;
    signup: (name: string, username: string, email: string, password: string) => Promise<void>;
    logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

async function extractErrorMessage(response: Response, fallback: string): Promise<string> {
    try {
        const data = await response.json();
        if (typeof data.error === "string") return data.error;
        if (Array.isArray(data.error) && data.error[0]?.message) {
            return data.error[0].message;
        }
        return fallback;
    } catch {
        return fallback;
    }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
    "use no memo";

    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("/api/users")
            .then((res) => {
                if (!res.ok) throw new Error("Not authenticated");
                return res.json();
            })
            .then((data) => setUser(data))
            .catch(async () => {
                await fetch("/api/auth/logout", { method: "POST" });
                setUser(null);
            })
            .finally(() => setLoading(false));
    }, []);

    async function login(email: string, password: string): Promise<void> {
        const response = await fetch("/api/auth/login", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email, password }),
        });

        if (!response.ok) {
            throw new Error(await extractErrorMessage(response, "Login failed"));
        }

        const { user } = await response.json();
        setUser(user);
    }

    async function signup(name: string, username: string, email: string, password: string): Promise<void> {
        const response = await fetch("/api/users", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, username, email, password }),
        });

        if (!response.ok) {
            throw new Error(await extractErrorMessage(response, "Signup failed"));
        }

        await login(email, password);
    }

    async function logout(): Promise<void> {
        await fetch("/api/auth/logout", { method: "POST" });
        setUser(null);
    }

    return (
        <AuthContext.Provider value={{ user, loading, login, signup, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) throw new Error("useAuth must be used within AuthProvider");
    return context;
}
