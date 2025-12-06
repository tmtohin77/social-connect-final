import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Settings, Moon, LogOut, ChevronRight, HelpCircle, Sun } from 'lucide-react';

// ১. ইন্টারফেস যোগ করা হয়েছে
interface MenuProps {
  onNavigate: (view: string) => void;
}

const MenuScreen: React.FC<MenuProps> = ({ onNavigate }) => {
  const { user, logout } = useAuth();
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    if (localStorage.getItem('theme') === 'dark') {
      document.documentElement.classList.add('dark');
      setIsDark(true);
    }
  }, []);

  const toggleDarkMode = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
      setIsDark(false);
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
      setIsDark(true);
    }
  };

  const menuItems = [
    { 
      icon: <Settings size={22} />, 
      label: 'Settings & Privacy',
      action: () => onNavigate('settings') // ✅ Action: সেটিংসে যাও
    },
    { 
      icon: isDark ? <Sun size={22} /> : <Moon size={22} />, 
      label: isDark ? 'Light Mode' : 'Dark Mode', 
      action: toggleDarkMode,
      toggle: true 
    },
    { icon: <HelpCircle size={22} />, label: 'Help & Support' },
  ];

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 pb-20 animate-fade-in transition-colors duration-300">
      {/* Profile Card */}
      <div className="bg-white dark:bg-gray-800 p-4 mb-2 shadow-sm">
        <h1 className="text-2xl font-bold mb-4 px-2 dark:text-white">Menu</h1>
        <div className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl shadow-sm border border-gray-100 dark:border-gray-600">
          <img src={user?.avatar} alt="Profile" className="w-14 h-14 rounded-full border-2 border-white dark:border-gray-500 shadow-sm object-cover" />
          <div className="flex-1">
            <h3 className="font-bold text-lg text-gray-800 dark:text-white">{user?.name}</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">View your profile</p>
          </div>
        </div>
      </div>

      {/* Menu Items */}
      <div className="px-4 space-y-3">
        {menuItems.map((item, index) => (
          <button 
            key={index} 
            onClick={item.action}
            className="w-full bg-white dark:bg-gray-800 p-4 rounded-xl shadow-sm flex items-center justify-between hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <div className="flex items-center gap-4 text-gray-700 dark:text-gray-200">
              <div className="bg-gray-100 dark:bg-gray-700 p-2 rounded-full">{item.icon}</div>
              <span className="font-medium">{item.label}</span>
            </div>
            {item.toggle ? (
              <div className={`w-10 h-6 rounded-full relative transition-colors ${isDark ? 'bg-blue-600' : 'bg-gray-300'}`}>
                <div className={`w-4 h-4 bg-white rounded-full absolute top-1 shadow-sm transition-transform ${isDark ? 'left-5' : 'left-1'}`}></div>
              </div>
            ) : (
              <ChevronRight size={20} className="text-gray-400" />
            )}
          </button>
        ))}

        {/* Logout Button */}
        <button onClick={logout} className="w-full bg-red-50 dark:bg-red-900/20 p-4 rounded-xl shadow-sm flex items-center justify-center gap-2 text-red-600 dark:text-red-400 font-bold mt-6 hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
          <LogOut size={20} />
          Log Out
        </button>
      </div>
      
      <div className="text-center mt-8 text-xs text-gray-400 dark:text-gray-600">
        SocialConnect v2.0.1 <br/> Built with Supabase
      </div>
    </div>
  );
};

export default MenuScreen;