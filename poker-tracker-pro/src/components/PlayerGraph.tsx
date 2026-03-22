import React, { useState, useEffect } from 'react';
import { collectionGroup, query, where, getDocs, collection, onSnapshot, orderBy } from 'firebase/firestore';
import { db } from '../firebase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';
import { formatCurrency, OperationType, handleFirestoreError, cn } from '../utils';
import { Loader2 } from 'lucide-react';

interface PlayerGraphProps {
  playerId: string;
  playerName: string;
}

const PlayerGraph: React.FC<PlayerGraphProps> = ({ playerId, playerName }) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      setLoading(true);
      try {
        // 1. Fetch all games to get their dates
        const gamesSnap = await getDocs(query(collection(db, 'games'), orderBy('date', 'asc')));
        
        // 2. Fetch sessions for this player from each game
        // This avoids collectionGroup index requirements
        const historyPromises = gamesSnap.docs.map(async (gameDoc) => {
          const sessionsRef = collection(db, 'games', gameDoc.id, 'sessions');
          const q = query(sessionsRef, where('playerId', '==', playerId));
          const sessionSnap = await getDocs(q);
          
          if (!sessionSnap.empty) {
            return {
              ...(sessionSnap.docs[0].data() as any),
              gameDate: gameDoc.data().date
            };
          }
          return null;
        });

        const historyResults = await Promise.all(historyPromises);
        const history = historyResults.filter(s => s !== null) as any[];

        let cumulativeProfit = 0;
        const chartData = [
          { name: 'Start', profit: 0, cumulative: 0 },
          ...history.map((s: any) => {
            cumulativeProfit += s.profit;
            return {
              name: new Date(s.gameDate.seconds * 1000).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' }),
              profit: s.profit,
              cumulative: cumulativeProfit,
              fullDate: new Date(s.gameDate.seconds * 1000).toLocaleDateString()
            };
          })
        ];

        setData(chartData);
      } catch (error: any) {
        console.error("Error fetching player history:", error);
      } finally {
        setLoading(false);
      }
    };

    if (playerId) {
      fetchHistory();
    }
  }, [playerId]);

  if (loading) {
    return (
      <div className="h-[300px] flex items-center justify-center bg-zinc-950/30 rounded-3xl border border-zinc-800">
        <Loader2 className="text-emerald-500 animate-spin" size={32} />
      </div>
    );
  }

  if (data.length <= 1) {
    return (
      <div className="h-[300px] flex items-center justify-center bg-zinc-950/30 rounded-3xl border border-zinc-800 text-zinc-500 italic">
        Not enough data to show a graph for {playerName}.
      </div>
    );
  }

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-zinc-900 border border-zinc-800 p-3 rounded-xl shadow-2xl">
          <p className="text-xs text-zinc-500 font-bold uppercase mb-1">{data.fullDate || 'Start'}</p>
          <p className={cn("text-lg font-bold", data.cumulative >= 0 ? "text-emerald-500" : "text-red-500")}>
            {formatCurrency(data.cumulative)}
          </p>
          {data.profit !== undefined && data.name !== 'Start' && (
            <p className="text-[10px] text-zinc-400 mt-1">
              Session: <span className={data.profit >= 0 ? "text-emerald-400" : "text-red-400"}>
                {data.profit >= 0 ? '+' : ''}{formatCurrency(data.profit)}
              </span>
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-3xl">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-xl font-bold text-white flex items-center gap-2">
          Profit History: <span className="text-emerald-500">{playerName}</span>
        </h3>
        <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-wider">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span className="text-zinc-400">Cumulative Profit</span>
          </div>
        </div>
      </div>
      
      <div className="h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
            <XAxis 
              dataKey="name" 
              stroke="#71717a" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false}
              dy={10}
            />
            <YAxis 
              stroke="#71717a" 
              fontSize={10} 
              tickLine={false} 
              axisLine={false}
              tickFormatter={(value) => `€${value}`}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#3f3f46', strokeWidth: 1 }} />
            <ReferenceLine y={0} stroke="#52525b" strokeDasharray="3 3" />
            <Line 
              type="monotone" 
              dataKey="cumulative" 
              stroke="#10b981" 
              strokeWidth={3} 
              dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#09090b' }}
              activeDot={{ r: 6, strokeWidth: 0 }}
              animationDuration={1500}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default PlayerGraph;
