import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const API = "https://serverowned.onrender.com";

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  async function safeJson(res) {
    try {
      return await res.json();
    } catch {
      return null;
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setError("");
    setSuccess("");

    const cleanName = String(name || "").trim();
    const cleanEmail = String(email || "").trim().toLowerCase();

    if (!cleanName) {
      setError("Name is required");
      return;
    }

    if (!cleanEmail) {
      setError("Email is required");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    // optional but recommended
    if (String(password || "").length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    setLoading(true);

    try {
      // Step 1: register (this sets cookie token)
      const res = await fetch(`${API}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name: cleanName, email: cleanEmail, password }),
      });

      const data = await safeJson(res);

      if (!res.ok) {
        setError(data?.error || data?.message || "Registration failed");
        setLoading(false);
        return;
      }

      // Step 2: get user info (/api/me)
      const meRes = await fetch(`${API}/api/me`, {
        credentials: "include",
      });

      const meData = await safeJson(meRes);

      if (!meRes.ok || !meData) {
        setError("Could not verify user after registration");
        setLoading(false);
        return;
      }

      // ✅ store useful info for dashboards/header
      localStorage.setItem("userRole", meData.role || "client");
      localStorage.setItem("userEmail", meData.email || cleanEmail);

      // if your /api/me returns clientId (recommended), store it
      if (meData.clientId) {
        localStorage.setItem("clientId", meData.clientId);
      } else {
        // keep it predictable
        localStorage.removeItem("clientId");
      }

      setSuccess("✅ Account created! Redirecting...");

      // Step 3: redirect based on role
      if (meData.role === "admin") {
        navigate("/admin");
      } else {
        navigate("/client");
      }
    } catch (err) {
      console.error("❌ Register error:", err);
      setError("Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <form onSubmit={handleSubmit} className="bg-white shadow-md rounded-lg p-6 w-96">
        <h2 className="text-2xl font-bold mb-4 text-center">Create Account</h2>

        {error && <div className="bg-red-100 text-red-700 p-2 rounded mb-3">{error}</div>}
        {success && <div className="bg-green-100 text-green-700 p-2 rounded mb-3">{success}</div>}

        <div className="mb-3">
          <label className="block mb-1 font-medium">Name</label>
          <input
            type="text"
            className="w-full border rounded px-3 py-2"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            autoComplete="name"
          />
        </div>

        <div className="mb-3">
          <label className="block mb-1 font-medium">Email</label>
          <input
            type="email"
            className="w-full border rounded px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>

        <div className="mb-3 relative">
          <label className="block mb-1 font-medium">Password</label>
          <input
            type={showPassword ? "text" : "password"}
            className="w-full border rounded px-3 py-2"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
        </div>

        <div className="mb-4 relative">
          <label className="block mb-1 font-medium">Confirm Password</label>
          <input
            type={showPassword ? "text" : "password"}
            className="w-full border rounded px-3 py-2"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            autoComplete="new-password"
          />

          <div className="flex items-center mt-2">
            <input
              id="show-password"
              type="checkbox"
              checked={showPassword}
              onChange={() => setShowPassword(!showPassword)}
              className="mr-2"
            />
            <label htmlFor="show-password" className="text-sm">
              Show Password
            </label>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full rounded py-2 font-medium text-white ${
            loading ? "bg-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"
          }`}
        >
          {loading ? "Signing up..." : "Sign Up"}
        </button>

        <p className="text-center text-sm mt-4">
          Already have an account?{" "}
          <Link to="/" className="text-blue-600 hover:underline">
            Log in
          </Link>
        </p>
      </form>
    </div>
  );
}