import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './AuthContext';
import Sidebar from './components/Sidebar';
import Dashboard from './pages/Dashboard';
import Games from './pages/Games';
import Players from './pages/Players';
import Stats from './pages/Stats';
import Settings from './pages/Settings';
import GameDetail from './pages/GameDetail';
import { Menu, Trophy } from 'lucide-react';

const App = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <AuthProvider>
      <Router>
        <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans selection:bg-emerald-500/30 overflow-hidden">
          <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
          
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
            {/* Mobile Header */}
            <header className="lg:hidden flex items-center justify-between p-4 bg-zinc-950 border-b border-zinc-800 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center text-zinc-950">
                  <Trophy size={18} />
                </div>
                <h1 className="text-white font-bold text-base leading-none">Poker Tracker</h1>
              </div>
              <button 
                onClick={() => setIsSidebarOpen(true)}
                className="p-2 hover:bg-zinc-900 rounded-lg text-zinc-400"
              >
                <Menu size={24} />
              </button>
            </header>

            <main className="flex-1 overflow-y-auto bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-zinc-900 via-zinc-950 to-zinc-950">
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/games" element={<Games />} />
                <Route path="/games/:gameId" element={<GameDetail />} />
                <Route path="/players" element={<Players />} />
                <Route path="/stats" element={<Stats />} />
                <Route path="/settings" element={<Settings />} />
              </Routes>
            </main>
          </div>
        </div>
      </Router>
    </AuthProvider>
  );
};

export default App;
