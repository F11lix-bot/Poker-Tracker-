import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { Trophy, TrendingUp, TrendingDown, Users, DollarSign, Target, Award, BarChart3, ChevronRight, MousePointer2 } from 'lucide-react';
import { formatCurrency, OperationType, handleFirestoreError, cn } from '../utils';
import { motion, AnimatePresence } from 'framer-motion';
import PlayerGraph from '../components/PlayerGraph';

const Stats = () => {
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<any>(null);

  useEffect(() => {
    const q = query(collection(db, 'players'), orderBy('totalProfit', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const playersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPlayers(playersData);
      setLoading(false);
      
      // Select the top shark by default if no player is selected
      if (playersData.length > 0) {
        setSelectedPlayer((prev: any) => prev || playersData[0]);
      }
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'players'));

    return () => unsubscribe();
  }, []);

  const winners = players.filter(p => p.totalProfit > 0);
  const losers = players.filter(p => p.totalProfit < 0).sort((a, b) => a.totalProfit - b.totalProfit);

  const StatBox = ({ title, value, icon: Icon, color }: any) => (
    <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-2xl">
      <div className="flex items-center gap-3 mb-4">
        <div className={cn("p-2 rounded-lg", color)}>
          <Icon size={20} />
        </div>
        <span className="text-zinc-500 text-sm font-bold uppercase tracking-wider">{title}</span>
      </div>
      <h3 className="text-3xl font-bold text-white">{value}</h3>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
      <header className="mb-8 md:mb-10">
        <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight flex items-center gap-3">
          <BarChart3 size={32} className="text-emerald-500 md:w-9 md:h-9" />
          Statistics
        </h1>
        <p className="text-zinc-500 mt-1 md:mt-2 text-sm md:base">Deep dive into player performances and group trends.</p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8 md:mb-12">
        <StatBox 
          title="Total Group Pot" 
          value={formatCurrency(players.reduce((acc, p) => acc + p.totalBuyIn, 0))} 
          icon={DollarSign} 
          color="bg-emerald-500/10 text-emerald-500"
        />
        <StatBox 
          title="Avg Buy-In" 
          value={formatCurrency(players.length ? players.reduce((acc, p) => acc + p.totalBuyIn, 0) / players.reduce((acc, p) => acc + (p.gamesPlayed || 1), 0) : 0)} 
          icon={Target} 
          color="bg-blue-500/10 text-blue-500"
        />
        <StatBox 
          title="Total Sessions" 
          value={players.reduce((acc, p) => acc + (p.gamesPlayed || 0), 0)} 
          icon={Users} 
          color="bg-purple-500/10 text-purple-500"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
        <div className="lg:col-span-2">
          <AnimatePresence mode="wait">
            {selectedPlayer ? (
              <motion.div
                key={selectedPlayer.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.3 }}
              >
                <PlayerGraph playerId={selectedPlayer.id} playerName={selectedPlayer.name} />
              </motion.div>
            ) : (
              <div className="h-[400px] flex flex-col items-center justify-center bg-zinc-900/30 rounded-3xl border border-zinc-800 border-dashed text-zinc-500">
                <MousePointer2 size={48} className="mb-4 opacity-20" />
                <p className="font-medium">Select a player to view their profit history graph</p>
              </div>
            )}
          </AnimatePresence>
        </div>

        <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 h-fit">
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <Trophy size={20} className="text-amber-500" />
            Player Selection
          </h2>
          <div className="space-y-2 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
            {players.map((player) => (
              <button
                key={player.id}
                onClick={() => setSelectedPlayer(player)}
                className={cn(
                  "w-full flex items-center justify-between p-3 rounded-xl transition-all group",
                  selectedPlayer?.id === player.id 
                    ? "bg-emerald-500/10 border border-emerald-500/20" 
                    : "bg-zinc-950/50 border border-zinc-800 hover:border-zinc-700"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold",
                    player.totalProfit >= 0 ? "bg-emerald-500/10 text-emerald-500" : "bg-red-500/10 text-red-500"
                  )}>
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="text-left">
                    <p className={cn("text-sm font-bold", selectedPlayer?.id === player.id ? "text-emerald-500" : "text-white")}>
                      {player.name}
                    </p>
                    <p className="text-[10px] text-zinc-500 uppercase font-bold">{player.gamesPlayed} games</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "text-xs font-bold",
                    player.totalProfit >= 0 ? "text-emerald-500" : "text-red-500"
                  )}>
                    {player.totalProfit >= 0 ? '+' : ''}{formatCurrency(player.totalProfit)}
                  </span>
                  <ChevronRight size={14} className={cn(
                    "transition-transform",
                    selectedPlayer?.id === player.id ? "text-emerald-500 translate-x-1" : "text-zinc-700 group-hover:text-zinc-500"
                  )} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section>
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <Award size={24} className="text-amber-500" />
            Top Sharks (Winners)
          </h2>
          <div className="space-y-4">
            {winners.length > 0 ? winners.map((player, index) => (
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                key={player.id} 
                onClick={() => setSelectedPlayer(player)}
                className={cn(
                  "cursor-pointer bg-zinc-900/50 border p-4 rounded-2xl flex items-center justify-between transition-all",
                  selectedPlayer?.id === player.id ? "border-emerald-500 shadow-lg shadow-emerald-500/5" : "border-zinc-800 hover:border-zinc-700"
                )}
              >
                <div className="flex items-center gap-4">
                  <span className="text-zinc-600 font-bold text-lg w-6">#{index + 1}</span>
                  <div className="w-10 h-10 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center font-bold">
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-white">{player.name}</h4>
                    <p className="text-xs text-zinc-500">{player.gamesPlayed} games played</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-emerald-500 font-bold">{formatCurrency(player.totalProfit)}</p>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold">Total Profit</p>
                </div>
              </motion.div>
            )) : (
              <p className="text-zinc-500 italic">No winners yet.</p>
            )}
          </div>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
            <TrendingDown size={24} className="text-red-500" />
            Biggest Fish (Losses)
          </h2>
          <div className="space-y-4">
            {losers.length > 0 ? losers.map((player, index) => (
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.1 }}
                key={player.id} 
                onClick={() => setSelectedPlayer(player)}
                className={cn(
                  "cursor-pointer bg-zinc-900/50 border p-4 rounded-2xl flex items-center justify-between transition-all",
                  selectedPlayer?.id === player.id ? "border-red-500 shadow-lg shadow-red-500/5" : "border-zinc-800 hover:border-zinc-700"
                )}
              >
                <div className="flex items-center gap-4">
                  <span className="text-zinc-600 font-bold text-lg w-6">#{index + 1}</span>
                  <div className="w-10 h-10 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center font-bold">
                    {player.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-white">{player.name}</h4>
                    <p className="text-xs text-zinc-500">{player.gamesPlayed} games played</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-red-500 font-bold">{formatCurrency(player.totalProfit)}</p>
                  <p className="text-[10px] text-zinc-500 uppercase font-bold">Total Loss</p>
                </div>
              </motion.div>
            )) : (
              <p className="text-zinc-500 italic">No losses yet.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
};

export default Stats;
