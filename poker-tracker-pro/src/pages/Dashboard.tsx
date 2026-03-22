import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Trophy, Users, TrendingUp, TrendingDown, DollarSign, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { formatCurrency, OperationType, handleFirestoreError } from '../utils';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const Dashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    totalBuyIns: 0,
    activePlayers: 0,
    biggestWinner: { name: 'N/A', profit: 0 },
    biggestFish: { name: 'N/A', profit: 0 },
    totalGames: 0,
    totalSessions: 0
  });
  const [recentGames, setRecentGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const playersQuery = query(collection(db, 'players'), orderBy('totalProfit', 'desc'));
    const gamesQuery = query(collection(db, 'games'), orderBy('date', 'desc'));

    const unsubPlayers = onSnapshot(playersQuery, (snapshot) => {
      const players = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      if (players.length > 0) {
        const topShark = players[0] as any;
        const biggestFish = players[players.length - 1] as any;
        
        const totalSessions = players.reduce((acc, p: any) => acc + (p.gamesPlayed || 0), 0);

        setStats(prev => ({
          ...prev,
          activePlayers: players.length,
          biggestWinner: { name: topShark.name, profit: topShark.totalProfit },
          biggestFish: { name: biggestFish.name, profit: biggestFish.totalProfit },
          totalSessions
        }));
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'players'));

    const unsubGames = onSnapshot(gamesQuery, (snapshot) => {
      const games = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRecentGames(games.slice(0, 5));
      
      let totalPot = 0;
      games.forEach((g: any) => totalPot += g.totalPot || 0);
      
      setStats(prev => ({
        ...prev,
        totalGames: games.length,
        totalBuyIns: totalPot
      }));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'games'));

    return () => {
      unsubPlayers();
      unsubGames();
    };
  }, []);

  const StatCard = ({ title, value, icon: Icon, color, subValue }: any) => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl flex flex-col gap-4 hover:border-zinc-700 transition-colors"
    >
      <div className="flex items-center justify-between">
        <span className="text-zinc-500 text-sm font-medium uppercase tracking-wider">{title}</span>
        <div className={cn("p-2 rounded-lg", color)}>
          <Icon size={20} />
        </div>
      </div>
      <div>
        <h3 className="text-2xl font-bold text-white">{value}</h3>
        {subValue && <p className="text-xs text-zinc-500 mt-1">{subValue}</p>}
      </div>
    </motion.div>
  );

  function cn(...classes: string[]) {
    return classes.filter(Boolean).join(' ');
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
      <header className="mb-8 md:mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight">Dashboard</h1>
        <p className="text-zinc-500 mt-1 md:mt-2 text-sm md:base">Welcome back to the Poker Tracker Pro.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 mb-8 md:mb-10">
        <StatCard 
          title="Total Buy-Ins" 
          value={formatCurrency(stats.totalBuyIns)} 
          icon={DollarSign} 
          color="bg-emerald-500/10 text-emerald-500"
          subValue="Recent sessions"
        />
        <StatCard 
          title="Active Players" 
          value={stats.activePlayers} 
          icon={Users} 
          color="bg-blue-500/10 text-blue-500"
        />
        <StatCard 
          title="Top Shark" 
          value={stats.biggestWinner.name} 
          icon={TrendingUp} 
          color="bg-amber-500/10 text-amber-500"
          subValue={`Profit: ${formatCurrency(stats.biggestWinner.profit)}`}
        />
        <StatCard 
          title="Biggest Fish" 
          value={stats.biggestFish.name} 
          icon={TrendingDown} 
          color="bg-red-500/10 text-red-500"
          subValue={`Loss: ${formatCurrency(stats.biggestFish.profit)}`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
          <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Recent Games</h2>
            <button 
              onClick={() => navigate('/games')}
              className="text-emerald-500 text-sm font-medium hover:underline"
            >
              View All
            </button>
          </div>
          <div className="divide-y divide-zinc-800">
            {recentGames.length > 0 ? recentGames.map((game) => (
              <div 
                key={game.id} 
                onClick={() => navigate(`/games/${game.id}`)}
                className="p-6 flex items-center justify-between hover:bg-zinc-800/30 transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-zinc-800 rounded-xl flex items-center justify-center text-zinc-400">
                    <Trophy size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-white">{game.location}</h4>
                    <p className="text-sm text-zinc-500">{new Date(game.date.seconds * 1000).toLocaleDateString()}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-white">{formatCurrency(game.totalPot)}</p>
                  <p className={cn("text-xs font-medium", game.discrepancy === 0 ? "text-emerald-500" : "text-red-500")}>
                    {game.discrepancy === 0 ? "Balanced" : `Diff: ${formatCurrency(game.discrepancy)}`}
                  </p>
                </div>
              </div>
            )) : (
              <div className="p-10 text-center text-zinc-500">No games recorded yet.</div>
            )}
          </div>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          <h2 className="text-xl font-bold text-white mb-6">Quick Stats</h2>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-emerald-500/10 text-emerald-500 rounded-lg flex items-center justify-center">
                  <ArrowUpRight size={16} />
                </div>
                <span className="text-zinc-400 text-sm">Avg Pot</span>
              </div>
              <span className="text-white font-bold">{formatCurrency(stats.totalGames > 0 ? stats.totalBuyIns / stats.totalGames : 0)}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-blue-500/10 text-blue-500 rounded-lg flex items-center justify-center">
                  <Trophy size={16} />
                </div>
                <span className="text-zinc-400 text-sm">Total Sessions</span>
              </div>
              <span className="text-white font-bold">{stats.totalSessions}</span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-purple-500/10 text-purple-500 rounded-lg flex items-center justify-center">
                  <Users size={16} />
                </div>
                <span className="text-zinc-400 text-sm">Avg Players</span>
              </div>
              <span className="text-white font-bold">{stats.totalGames > 0 ? (stats.totalSessions / stats.totalGames).toFixed(1) : '0.0'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
