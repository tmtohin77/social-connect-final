import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { User, Settings, Moon, LogOut, ChevronRight, HelpCircle } from 'lucide-react';

const MenuScreen: React.FC = () => {
  const { user, logout } = useAuth();

  const menuItems = [
    { icon: <Settings size={22} />, label: 'Settings & Privacy' },
    { icon: <Moon size={22} />, label: 'Dark Mode', toggle: true },
    { icon: <HelpCircle size={22} />, label: 'Help & Support' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 pb-20 animate-fade-in">
      {/* Profile Card */}
      <div className="bg-white p-4 mb-2 shadow-sm">
        <h1 className="text-2xl font-bold mb-4 px-2">Menu</h1>
        <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl shadow-sm border border-gray-100">
          <img src={user?.avatar} alt="Profile" className="w-14 h-14 rounded-full border-2 border-white shadow-sm" />
          <div className="flex-1">
            <h3 className="font-bold text-lg text-gray-800">{user?.name}</h3>
            <p className="text-sm text-gray-500">View your profile</p>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="px-4 space-y-3">
        {menuItems.map((item, index) => (
          <button key={index} className="w-full bg-white p-4 rounded-xl shadow-sm flex items-center justify-between hover:bg-gray-50 transition-colors">
            <div className="flex items-center gap-4 text-gray-700">
              <div className="bg-gray-100 p-2 rounded-full">{item.icon}</div>
              <span className="font-medium">{item.label}</span>
            </div>
            {item.toggle ? (
              <div className="w-10 h-6 bg-gray-200 rounded-full relative"><div className="w-4 h-4 bg-white rounded-full absolute top-1 left-1 shadow-sm"></div></div>
            ) : (
              <ChevronRight size={20} className="text-gray-400" />
            )}
          </button>
        ))}

        {/* Logout Button */}
        <button onClick={logout} className="w-full bg-red-50 p-4 rounded-xl shadow-sm flex items-center justify-center gap-2 text-red-600 font-bold mt-6 hover:bg-red-100 transition-colors">
          <LogOut size={20} />
          Log Out
        </button>
      </div>
      
      <div className="text-center mt-8 text-xs text-gray-400">
        SocialConnect v2.0.1 <br/> Built with Supabase
      </div>
    </div>
  );
};

export default MenuScreen;