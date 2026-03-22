import React, { useState } from 'react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut } from 'firebase/auth';
import { useAuth } from '../AuthContext';
import { Settings as SettingsIcon, LogIn, LogOut, ShieldCheck, User as UserIcon, Lock } from 'lucide-react';
import { motion } from 'framer-motion';

const Settings = () => {
  const { user, isAdmin } = useAuth();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    // Map 'admin' to 'felbel05@gmail.com' internally
    const loginEmail = username.toLowerCase() === 'admin' ? 'felbel05@gmail.com' : username;
    const loginPass = password;

    try {
      await signInWithEmailAndPassword(auth, loginEmail, loginPass);
    } catch (err: any) {
      setError('Invalid username or password. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-2xl mx-auto">
      <header className="mb-8 md:mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight flex items-center gap-3">
          <SettingsIcon size={32} className="text-emerald-500 md:w-9 md:h-9" />
          Settings
        </h1>
        <p className="text-zinc-500 mt-1 md:mt-2 text-sm md:base">Manage your account and app preferences.</p>
      </header>

      <div className="space-y-8">
        <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-xl flex items-center justify-center">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Admin Authentication</h2>
              <p className="text-sm text-zinc-500">Sign in to unlock management features.</p>
            </div>
          </div>

          {user ? (
            <div className="space-y-6">
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl">
                <p className="text-sm text-emerald-500 font-medium">You are currently logged in as an administrator.</p>
                <p className="text-xs text-zinc-400 mt-1">{user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl transition-all"
              >
                <LogOut size={20} />
                Logout
              </button>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-4">
              {error && (
                <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-xl">
                  {error}
                </div>
              )}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Username</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                    placeholder="admin"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Password</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={18} />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-12 pr-4 text-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-all"
                    placeholder="••••••••"
                  />
                </div>
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-bold py-3 rounded-xl transition-all mt-4"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn size={20} />
                    Sign In
                  </>
                )}
              </button>
            </form>
          )}
        </section>

        <section className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-8">
          <h2 className="text-xl font-bold text-white mb-2">About Poker Tracker</h2>
          <p className="text-zinc-500 text-sm leading-relaxed">
            This application is designed for private poker groups to track their sessions, players, and overall statistics. 
            Guests can view all data, but only authorized administrators can modify records.
          </p>
          <div className="mt-6 pt-6 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-600">
            <span>Version 1.0.0</span>
            <span>© Felix</span>
          </div>
        </section>
      </div>
    </div>
  );
};

export default Settings;
