import React, { useState, useEffect } from 'react';
import { collection, addDoc, onSnapshot, query, orderBy, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../AuthContext';
import { Users, Plus, Edit2, Trash2, Search, UserPlus, AlertCircle } from 'lucide-react';
import { formatCurrency, OperationType, handleFirestoreError, cn } from '../utils';
import Modal from '../components/Modal';

const Players = () => {
  const { isAdmin } = useAuth();
  const [players, setPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlayer, setEditingPlayer] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState('');

  useEffect(() => {
    const q = query(collection(db, 'players'), orderBy('name', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const playersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPlayers(playersData);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.LIST, 'players'));

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    setFormError(null);

    try {
      if (editingPlayer) {
        await updateDoc(doc(db, 'players', editingPlayer.id), { name });
      } else {
        await addDoc(collection(db, 'players'), {
          name,
          totalBuyIn: 0,
          totalCashOut: 0,
          totalProfit: 0,
          gamesPlayed: 0,
          createdAt: serverTimestamp()
        });
      }
      closeModal();
    } catch (error: any) {
      console.error('Error saving player:', error);
      setFormError(error.message || 'An error occurred while saving the player.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this player?')) return;
    try {
      await deleteDoc(doc(db, 'players', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `players/${id}`);
    }
  };

  const openModal = (player: any = null) => {
    setFormError(null);
    if (player) {
      setEditingPlayer(player);
      setName(player.name);
    } else {
      setEditingPlayer(null);
      setName('');
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPlayer(null);
    setName('');
  };

  const filteredPlayers = players.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-4 sm:p-6 md:p-8 max-w-7xl mx-auto">
      <header className="mb-8 md:mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-6">
        <div>
          <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight flex items-center gap-3">
            <Users size={32} className="text-emerald-500 md:w-9 md:h-9" />
            Players
          </h1>
          <p className="text-zinc-500 mt-1 md:mt-2 text-sm md:base">Manage and view all registered players.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => openModal()}
            className="flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-bold px-6 py-3 rounded-xl transition-all shadow-lg shadow-emerald-500/20 w-full md:w-auto"
          >
            <UserPlus size={20} />
            Register Player
          </button>
        )}
      </header>

      <div className="mb-8 relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500" size={20} />
        <input
          type="text"
          placeholder="Search players..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-zinc-900/50 border border-zinc-800 rounded-2xl py-4 pl-12 pr-4 text-white focus:border-emerald-500 outline-none transition-all"
        />
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-950/50 border-b border-zinc-800">
                <th className="p-6 text-xs font-bold text-zinc-500 uppercase tracking-wider">Player Name</th>
                <th className="p-6 text-xs font-bold text-zinc-500 uppercase tracking-wider">Games</th>
                <th className="p-6 text-xs font-bold text-zinc-500 uppercase tracking-wider">Total Buy-In</th>
                <th className="p-6 text-xs font-bold text-zinc-500 uppercase tracking-wider">Total Profit</th>
                {isAdmin && <th className="p-6 text-xs font-bold text-zinc-500 uppercase tracking-wider text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredPlayers.length > 0 ? filteredPlayers.map((player) => (
                <tr key={player.id} className="hover:bg-zinc-800/30 transition-colors group">
                  <td className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-zinc-800 rounded-full flex items-center justify-center text-zinc-400 font-bold">
                        {player.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-bold text-white">{player.name}</span>
                    </div>
                  </td>
                  <td className="p-6 text-zinc-400">{player.gamesPlayed}</td>
                  <td className="p-6 text-zinc-400">{formatCurrency(player.totalBuyIn)}</td>
                  <td className="p-6">
                    <span className={cn(
                      "font-bold",
                      player.totalProfit > 0 ? "text-emerald-500" : player.totalProfit < 0 ? "text-red-500" : "text-zinc-500"
                    )}>
                      {formatCurrency(player.totalProfit)}
                    </span>
                  </td>
                  {isAdmin && (
                    <td className="p-6 text-right">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openModal(player)}
                          className="p-2 hover:bg-zinc-700 rounded-lg text-zinc-400 hover:text-white transition-colors"
                        >
                          <Edit2 size={18} />
                        </button>
                        <button
                          onClick={() => handleDelete(player.id)}
                          className="p-2 hover:bg-red-500/10 rounded-lg text-zinc-400 hover:text-red-500 transition-colors"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              )) : (
                <tr>
                  <td colSpan={isAdmin ? 5 : 4} className="p-20 text-center text-zinc-500">
                    {loading ? "Loading players..." : "No players found."}
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
        title={editingPlayer ? "Edit Player" : "Register New Player"}
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {formError && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-xl flex items-center gap-2">
              <AlertCircle size={16} />
              {formError}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Player Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              autoFocus
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-3 px-4 text-white focus:border-emerald-500 outline-none transition-all"
              placeholder="e.g. John Doe"
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
                editingPlayer ? "Save Changes" : "Register Player"
              )}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Players;
