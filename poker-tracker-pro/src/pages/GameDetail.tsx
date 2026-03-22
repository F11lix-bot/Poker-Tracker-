import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { doc, onSnapshot, collection, query, orderBy, addDoc, updateDoc, deleteDoc, serverTimestamp, runTransaction, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { Trophy, ArrowLeft, Plus, Edit2, Trash2, UserPlus, DollarSign, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatCurrency, OperationType, handleFirestoreError, formatDate } from '../utils';
import Modal from '../components/Modal';

const GameDetail = () => {
  const { gameId } = useParams<{ gameId: string }>();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  
  const [game, setGame] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditGameModalOpen, setIsEditGameModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  
  // Form state (Session)
  const [selectedPlayerId, setSelectedPlayerId] = useState('');
  const [buyIn, setBuyIn] = useState('');
  const [cashOut, setCashOut] = useState('');

  // Form state (Game)
  const [gameDate, setGameDate] = useState('');
  const [gameLocation, setGameLocation] = useState('');
  const [gameNotes, setGameNotes] = useState('');

  useEffect(() => {
    if (!gameId) return;

    const unsubGame = onSnapshot(doc(db, 'games', gameId), (doc) => {
      if (doc.exists()) {
        setGame({ id: doc.id, ...doc.data() });
      } else {
        navigate('/games');
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, `games/${gameId}`));

    const sessionsQuery = query(collection(db, 'games', gameId, 'sessions'), orderBy('createdAt', 'asc'));
    const unsubSessions = onSnapshot(sessionsQuery, (snapshot) => {
      setSessions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, `games/${gameId}/sessions`));

    const unsubPlayers = onSnapshot(collection(db, 'players'), (snapshot) => {
      setPlayers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => {
      unsubGame();
      unsubSessions();
      unsubPlayers();
    };
  }, [gameId, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameId || !selectedPlayerId) return;

    setSubmitting(true);
    setFormError(null);

    const buyInNum = parseFloat(buyIn) || 0;
    const cashOutNum = parseFloat(cashOut) || 0;
    const profit = cashOutNum - buyInNum;
    const player = players.find(p => p.id === selectedPlayerId);

    try {
      await runTransaction(db, async (transaction) => {
        const gameRef = doc(db, 'games', gameId);
        const playerRef = doc(db, 'players', selectedPlayerId);
        
        const gameSnap = await transaction.get(gameRef);
        const playerSnap = await transaction.get(playerRef);

        if (!gameSnap.exists() || !playerSnap.exists()) return;

        const oldGameData = gameSnap.data();
        const oldPlayerData = playerSnap.data();

        let newTotalPot = oldGameData.totalPot;
        let newDiscrepancy = oldGameData.discrepancy;
        
        let newPlayerBuyIn = oldPlayerData.totalBuyIn;
        let newPlayerCashOut = oldPlayerData.totalCashOut;
        let newPlayerProfit = oldPlayerData.totalProfit;
        let newPlayerGames = oldPlayerData.gamesPlayed;

        if (editingSession) {
          // Subtract old values
          newTotalPot -= editingSession.buyIn;
          newDiscrepancy -= (editingSession.buyIn - editingSession.cashOut);
          
          newPlayerBuyIn -= editingSession.buyIn;
          newPlayerCashOut -= editingSession.cashOut;
          newPlayerProfit -= editingSession.profit;
          // Games played doesn't change on edit
        } else {
          newPlayerGames += 1;
        }

        // Add new values
        newTotalPot += buyInNum;
        newDiscrepancy += (buyInNum - cashOutNum);
        
        newPlayerBuyIn += buyInNum;
        newPlayerCashOut += cashOutNum;
        newPlayerProfit += profit;

        // Update Game
        transaction.update(gameRef, {
          totalPot: newTotalPot,
          discrepancy: newDiscrepancy
        });

        // Update Player
        transaction.update(playerRef, {
          totalBuyIn: newPlayerBuyIn,
          totalCashOut: newPlayerCashOut,
          totalProfit: newPlayerProfit,
          gamesPlayed: newPlayerGames
        });

        // Create/Update Session
        const sessionData = {
          playerId: selectedPlayerId,
          playerName: player.name,
          buyIn: buyInNum,
          cashOut: cashOutNum,
          profit: profit,
          createdAt: editingSession ? editingSession.createdAt : serverTimestamp()
        };

        if (editingSession) {
          transaction.update(doc(db, 'games', gameId, 'sessions', editingSession.id), sessionData);
        } else {
          const newSessionRef = doc(collection(db, 'games', gameId, 'sessions'));
          transaction.set(newSessionRef, sessionData);
        }
      });

      closeModal();
    } catch (error: any) {
      console.error('Error saving session:', error);
      setFormError(error.message || 'An error occurred while saving the session.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSession = async (session: any) => {
    if (!window.confirm('Are you sure you want to remove this player from the game?')) return;
    if (!gameId) return;

    try {
      await runTransaction(db, async (transaction) => {
        const gameRef = doc(db, 'games', gameId);
        const playerRef = doc(db, 'players', session.playerId);
        const sessionRef = doc(db, 'games', gameId, 'sessions', session.id);

        const gameSnap = await transaction.get(gameRef);
        const playerSnap = await transaction.get(playerRef);

        if (!gameSnap.exists() || !playerSnap.exists()) return;

        const oldGameData = gameSnap.data();
        const oldPlayerData = playerSnap.data();

        transaction.update(gameRef, {
          totalPot: oldGameData.totalPot - session.buyIn,
          discrepancy: oldGameData.discrepancy - (session.buyIn - session.cashOut)
        });

        transaction.update(playerRef, {
          totalBuyIn: oldPlayerData.totalBuyIn - session.buyIn,
          totalCashOut: oldPlayerData.totalCashOut - session.cashOut,
          totalProfit: oldPlayerData.totalProfit - session.profit,
          gamesPlayed: oldPlayerData.gamesPlayed - 1
        });

        transaction.delete(sessionRef);
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `games/${gameId}/sessions/${session.id}`);
    }
  };

  const toggleGameStatus = async () => {
    if (!gameId || !game) return;
    const newStatus = game.status === 'active' ? 'completed' : 'active';
    try {
      await updateDoc(doc(db, 'games', gameId), { status: newStatus });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `games/${gameId}`);
    }
  };

  const handleSubmitGame = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!gameId || !gameLocation.trim()) return;
    setSubmitting(true);
    setFormError(null);

    try {
      const gameData = {
        date: Timestamp.fromDate(new Date(gameDate)),
        location: gameLocation,
        notes: gameNotes,
      };
      await updateDoc(doc(db, 'games', gameId), gameData);
      setIsEditGameModalOpen(false);
    } catch (error: any) {
      console.error('Error updating game:', error);
      setFormError(error.message || 'An error occurred while updating the game.');
    } finally {
      setSubmitting(false);
    }
  };

  const openEditGameModal = () => {
    if (!game) return;
    setFormError(null);
    setGameDate(new Date(game.date.seconds * 1000).toISOString().split('T')[0]);
    setGameLocation(game.location);
    setGameNotes(game.notes || '');
    setIsEditGameModalOpen(true);
  };

  const openModal = (session: any = null) => {
    setFormError(null);
    if (session) {
      setEditingSession(session);
      setSelectedPlayerId(session.playerId);
      setBuyIn(session.buyIn.toString());
      setCashOut(session.cashOut.toString());
    } else {
      setEditingSession(null);
      setSelectedPlayerId('');
      setBuyIn('');
      setCashOut('0');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingSession(null);
  };

  if (!game) return null;

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
      <button
        onClick={() => navigate('/games')}
        className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors mb-6 md:mb-8 group"
      >
        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
        Back to Games
      </button>

      <div className="flex flex-col lg:flex-row gap-6 md:gap-8 mb-8 md:mb-10">
        <div className="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-3xl p-6 md:p-8 relative overflow-hidden">
          <div className="absolute top-0 right-0 p-8 opacity-10 hidden sm:block">
            <Trophy size={120} />
          </div>
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <span className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest border",
                  game.status === 'active' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : "bg-zinc-800 text-zinc-500 border-zinc-700"
                )}>
                  {game.status}
                </span>
                <span className="text-zinc-500 text-sm">{formatDate(new Date(game.date.seconds * 1000))}</span>
              </div>
              {isAdmin && (
                <button
                  onClick={openEditGameModal}
                  className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-colors"
                  title="Edit Game Details"
                >
                  <Edit2 size={18} />
                </button>
              )}
            </div>
            
            <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">{game.location}</h1>
            {game.notes && <p className="text-zinc-400 italic mb-6 md:mb-8 text-sm md:base">"{game.notes}"</p>}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/50">
                <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider mb-1">Total Pot</p>
                <p className="text-xl md:text-2xl font-bold text-white">{formatCurrency(game.totalPot)}</p>
              </div>
              <div className="bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/50">
                <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider mb-1">Discrepancy</p>
                <div className="flex items-center gap-2">
                  <p className={cn("text-xl md:text-2xl font-bold", game.discrepancy === 0 ? "text-emerald-500" : "text-red-500")}>
                    {formatCurrency(game.discrepancy)}
                  </p>
                  {game.discrepancy !== 0 && <AlertCircle size={18} className="text-red-500" />}
                </div>
              </div>
              <div className="bg-zinc-950/50 p-4 rounded-2xl border border-zinc-800/50">
                <p className="text-xs text-zinc-500 uppercase font-bold tracking-wider mb-1">Players</p>
                <p className="text-xl md:text-2xl font-bold text-white">{sessions.length}</p>
              </div>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="lg:w-72 flex flex-col sm:flex-row lg:flex-col gap-4">
            <button
              onClick={() => openModal()}
              className="flex-1 lg:h-full flex flex-col items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold rounded-3xl transition-all shadow-xl shadow-emerald-500/10 p-6 md:p-8"
            >
              <Plus size={32} />
              <span>Add Player</span>
            </button>
            <button
              onClick={toggleGameStatus}
              className={cn(
                "flex-1 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all",
                game.status === 'active' 
                  ? "bg-zinc-800 hover:bg-zinc-700 text-white" 
                  : "bg-blue-500/10 hover:bg-blue-500/20 text-blue-500 border border-blue-500/20"
              )}
            >
              {game.status === 'active' ? <CheckCircle2 size={20} /> : <Plus size={20} />}
              {game.status === 'active' ? "Complete" : "Re-open"}
            </button>
          </div>
        )}
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-3xl overflow-hidden">
        <div className="p-6 border-b border-zinc-800 flex items-center justify-between">
          <h2 className="text-xl font-bold text-white">Session Standings</h2>
        </div>
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <table className="w-full text-left border-collapse min-w-[600px] sm:min-w-0">
            <thead>
              <tr className="bg-zinc-950/50 border-b border-zinc-800">
                <th className="p-4 md:p-6 text-xs font-bold text-zinc-500 uppercase tracking-wider">Player</th>
                <th className="p-4 md:p-6 text-xs font-bold text-zinc-500 uppercase tracking-wider">Buy-In</th>
                <th className="p-4 md:p-6 text-xs font-bold text-zinc-500 uppercase tracking-wider">Cash-Out</th>
                <th className="p-4 md:p-6 text-xs font-bold text-zinc-500 uppercase tracking-wider">Profit/Loss</th>
                {isAdmin && <th className="p-4 md:p-6 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {sessions.length > 0 ? sessions.sort((a, b) => b.profit - a.profit).map((session) => (
                <tr key={session.id} className="hover:bg-zinc-800/30 transition-colors group">
                  <td className="p-4 md:p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 text-xs font-bold shrink-0">
                        {session.playerName.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-bold text-white truncate max-w-[120px] sm:max-w-none">{session.playerName}</span>
                    </div>
                  </td>
                  <td className="p-4 md:p-6 text-zinc-400">{formatCurrency(session.buyIn)}</td>
                  <td className="p-4 md:p-6 text-zinc-400">{formatCurrency(session.cashOut)}</td>
                  <td className="p-4 md:p-6">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "font-bold",
                        session.profit > 0 ? "text-emerald-500" : session.profit < 0 ? "text-red-500" : "text-zinc-500"
                      )}>
                        {formatCurrency(session.profit)}
                      </span>
                      {session.profit > 0 ? <TrendingUpIcon size={14} className="text-emerald-500" /> : session.profit < 0 ? <TrendingDownIcon size={14} className="text-red-500" /> : null}
                    </div>
                  </td>
                  {isAdmin && (
                    <td className="p-4 md:p-6 text-right">
                      <div className="flex items-center justify-end gap-2 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openModal(session)}
                          className="p-2 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteSession(session)}
                          className="p-2 hover:bg-red-500/10 rounded-lg text-zinc-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              )) : (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="p-20 text-center text-zinc-500">
                    No players have joined this game yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingSession ? "Edit Session" : "Add Player to Game"}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {formError && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-xl flex items-center gap-2">
              <AlertCircle size={16} />
              {formError}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Select Player</label>
            <select
              value={selectedPlayerId}
              onChange={(e) => setSelectedPlayerId(e.target.value)}
              required
              disabled={!!editingSession}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:border-emerald-500 outline-none transition-all disabled:opacity-50"
            >
              <option value="">-- Choose a player --</option>
              {players.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Buy-In (€)</label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                <input
                  type="number"
                  step="0.01"
                  value={buyIn}
                  onChange={(e) => setBuyIn(e.target.value)}
                  required
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white focus:border-emerald-500 outline-none transition-all"
                  placeholder="20.00"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Cash-Out (€)</label>
              <div className="relative">
                <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={16} />
                <input
                  type="number"
                  step="0.01"
                  value={cashOut}
                  onChange={(e) => setCashOut(e.target.value)}
                  required
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 pl-10 pr-4 text-white focus:border-emerald-500 outline-none transition-all"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={closeModal}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                editingSession ? "Update Session" : "Add to Game"
              )}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isEditGameModalOpen}
        onClose={() => setIsEditGameModalOpen(false)}
        title="Edit Game Details"
      >
        <form onSubmit={handleSubmitGame} className="space-y-6">
          {formError && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-xl flex items-center gap-2">
              <AlertCircle size={16} />
              {formError}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Date</label>
              <input
                type="date"
                value={gameDate}
                onChange={(e) => setGameDate(e.target.value)}
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:border-emerald-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Location</label>
              <input
                type="text"
                value={gameLocation}
                onChange={(e) => setGameLocation(e.target.value)}
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:border-emerald-500 outline-none transition-all"
                placeholder="e.g. Casino Royale"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Notes (Optional)</label>
            <textarea
              value={gameNotes}
              onChange={(e) => setGameNotes(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:border-emerald-500 outline-none transition-all min-h-[100px]"
              placeholder="Any special rules or highlights..."
            />
          </div>
          <div className="flex gap-4 pt-4">
            <button
              type="button"
              onClick={() => setIsEditGameModalOpen(false)}
              className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-bold py-3 rounded-xl transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed text-zinc-950 font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              {submitting ? (
                <div className="w-5 h-5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
              ) : (
                "Save Changes"
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

const TrendingUpIcon = ({ size, className }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
    <polyline points="17 6 23 6 23 12" />
  </svg>
);

const TrendingDownIcon = ({ size, className }: any) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
    <polyline points="17 18 23 18 23 12" />
  </svg>
);

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default GameDetail;
