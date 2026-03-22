import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { Trophy, Plus, Edit2, Trash2, Calendar, MapPin, Info, ArrowRight, AlertCircle } from 'lucide-react';
import { formatCurrency, OperationType, handleFirestoreError, formatDate } from '../utils';
import { Link } from 'react-router-dom';
import Modal from '../components/Modal';

const Games = () => {
  const { isAdmin } = useAuth();
  const [games, setGames] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGame, setEditingGame] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [location, setLocation] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'games'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const gamesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setGames(gamesData);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'games'));

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location.trim()) return;
    setSubmitting(true);
    setFormError(null);

    try {
      const gameData = {
        date: Timestamp.fromDate(new Date(date)),
        location,
        notes,
        totalPot: editingGame ? editingGame.totalPot : 0,
        discrepancy: editingGame ? editingGame.discrepancy : 0,
        status: editingGame ? editingGame.status : 'active',
        createdAt: editingGame ? editingGame.createdAt : serverTimestamp()
      };

      if (editingGame) {
        await updateDoc(doc(db, 'games', editingGame.id), gameData);
      } else {
        await addDoc(collection(db, 'games'), gameData);
      }
      closeModal();
    } catch (error: any) {
      console.error('Error saving game:', error);
      setFormError(error.message || 'An error occurred while saving the game.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this game? This will not delete associated sessions.')) return;
    try {
      await deleteDoc(doc(db, 'games', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `games/${id}`);
    }
  };

  const openModal = (game: any = null) => {
    setFormError(null);
    if (game) {
      setEditingGame(game);
      setDate(new Date(game.date.seconds * 1000).toISOString().split('T')[0]);
      setLocation(game.location);
      setNotes(game.notes || '');
    } else {
      setEditingGame(null);
      setDate(new Date().toISOString().split('T')[0]);
      setLocation('');
      setNotes('');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingGame(null);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
      <header className="mb-8 md:mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight flex items-center gap-3">
            <Trophy size={32} className="text-emerald-500 md:w-9 md:h-9" />
            Games
          </h1>
          <p className="text-zinc-500 mt-1 md:mt-2 text-sm md:base">History of all poker sessions and upcoming games.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => openModal()}
            className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 w-full md:w-auto"
          >
            <Plus size={20} />
            Host New Game
          </button>
        )}
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        {games.length > 0 ? games.map((game) => (
          <div key={game.id} className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col hover:border-zinc-700 transition-all group">
            <div className="p-6 flex-1">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2 text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                  <Calendar size={14} />
                  {formatDate(new Date(game.date.seconds * 1000))}
                </div>
                <span className={cn(
                  "text-[10px] px-2 py-0.5 rounded border uppercase font-bold",
                  game.status === 'active' ? "bg-blue-500/10 text-blue-500 border-blue-500/20" : "bg-zinc-800 text-zinc-500 border-zinc-700"
                )}>
                  {game.status}
                </span>
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2 flex items-center gap-2">
                <MapPin size={18} className="text-zinc-500" />
                {game.location}
              </h3>
              
              {game.notes && (
                <p className="text-sm text-zinc-500 mb-6 line-clamp-2 italic">
                  "{game.notes}"
                </p>
              )}

              <div className="grid grid-cols-2 gap-4 mt-auto">
                <div className="bg-zinc-950/50 p-3 rounded-xl border border-zinc-800/50">
                  <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Total Pot</p>
                  <p className="text-lg font-bold text-white">{formatCurrency(game.totalPot)}</p>
                </div>
                <div className="bg-zinc-950/50 p-3 rounded-xl border border-zinc-800/50">
                  <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider mb-1">Discrepancy</p>
                  <p className={cn("text-lg font-bold", game.discrepancy === 0 ? "text-emerald-500" : "text-red-500")}>
                    {formatCurrency(game.discrepancy)}
                  </p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-zinc-950/50 border-t border-zinc-800 flex items-center justify-between">
              <Link
                to={`/games/${game.id}`}
                className="flex items-center gap-2 text-sm font-bold text-zinc-400 hover:text-emerald-500 transition-colors"
              >
                View Details
                <ArrowRight size={16} />
              </Link>
              
              {isAdmin && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openModal(game)}
                    className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(game.id)}
                    className="p-2 hover:bg-red-500/10 rounded-lg text-zinc-500 hover:text-red-500 transition-colors"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        )) : (
          <div className="col-span-full p-20 text-center text-zinc-500 bg-zinc-900/50 border border-zinc-800 rounded-2xl">
            {loading ? "Loading games..." : "No games hosted yet."}
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={closeModal}
        title={editingGame ? "Edit Game" : "Host New Game"}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
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
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:border-emerald-500 outline-none transition-all"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Location</label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:border-emerald-500 outline-none transition-all"
                placeholder="e.g. Casino Royale"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:border-emerald-500 outline-none transition-all min-h-[100px]"
              placeholder="Any special rules or highlights..."
            />
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
                editingGame ? "Save Changes" : "Create Game"
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

function cn(...classes: string[]) {
  return classes.filter(Boolean).join(' ');
}

export default Games;
