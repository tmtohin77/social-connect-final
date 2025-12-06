import React, { useState } from 'react';
import { UserPlus, UserCheck, X, Search } from 'lucide-react';
import { users } from '../../data/mockData';

const FriendsScreen: React.FC = () => {
  const [requests, setRequests] = useState(users.slice(0, 4));
  const [suggestions] = useState(users.slice(4, 10));
  const [search, setSearch] = useState('');

  const handleAccept = (id: number) => {
    setRequests(requests.filter(r => r.id !== id));
  };

  const handleDecline = (id: number) => {
    setRequests(requests.filter(r => r.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 z-40 bg-white border-b border-gray-100 px-4 py-3">
        <h1 className="text-xl font-bold text-gray-800">Friends</h1>
        <div className="mt-3 relative">
          <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search friends..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-100 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {requests.length > 0 && (
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-bold text-gray-800">Friend Requests</h2>
            <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">{requests.length}</span>
          </div>
          <div className="space-y-3">
            {requests.map((user) => (
              <div key={user.id} className="bg-white rounded-xl p-4 shadow-sm flex items-center gap-3">
                <img src={user.avatar} alt={user.name} className="w-14 h-14 rounded-full object-cover" />
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800">{user.name}</h3>
                  <p className="text-xs text-gray-500">5 mutual friends</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleAccept(user.id)}
                    className="p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 transition-colors">
                    <UserCheck size={18} />
                  </button>
                  <button onClick={() => handleDecline(user.id)}
                    className="p-2 bg-gray-200 text-gray-600 rounded-full hover:bg-gray-300 transition-colors">
                    <X size={18} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="p-4">
        <h2 className="font-bold text-gray-800 mb-3">People You May Know</h2>
        <div className="grid grid-cols-2 gap-3">
          {suggestions.map((user) => (
            <div key={user.id} className="bg-white rounded-xl p-4 shadow-sm text-center">
              <img src={user.avatar} alt={user.name} className="w-20 h-20 rounded-full object-cover mx-auto mb-2" />
              <h3 className="font-semibold text-gray-800 text-sm truncate">{user.name}</h3>
              <p className="text-xs text-gray-500 mb-3">3 mutual friends</p>
              <button className="w-full py-2 bg-blue-100 text-blue-600 font-medium rounded-lg 
                hover:bg-blue-200 transition-colors flex items-center justify-center gap-1">
                <UserPlus size={16} /> Add
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FriendsScreen;
