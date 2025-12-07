import React from 'react';
import { Home, Users, User, Menu } from 'lucide-react';

interface BottomTabsProps {
  activeTab: string;
  onTabChange: (tab: any) => void;
}

const tabs = [
  { id: 'home', icon: Home, label: 'Home' },
  { id: 'friends', icon: Users, label: 'Friends' },
  { id: 'profile', icon: User, label: 'Profile' },
  { id: 'menu', icon: Menu, label: 'Menu' },
];

const BottomTabs: React.FC<BottomTabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-border/40 z-50 backdrop-blur-lg bg-white/80 dark:bg-gray-900/80 supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-lg mx-auto flex items-center justify-around py-2 safe-area-bottom">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative flex flex-col items-center gap-1 px-6 py-2 rounded-xl transition-all duration-300 group
                ${isActive 
                  ? 'text-primary' 
                  : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              <div className={`relative p-1 rounded-full transition-all duration-300 ${isActive ? 'bg-primary/10 -translate-y-1' : ''}`}>
                <Icon 
                  size={24} 
                  className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-105'}`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
                {tab.id === 'friends' && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[10px] 
                    rounded-full flex items-center justify-center font-bold shadow-sm ring-2 ring-white dark:ring-gray-900 animate-pulse">
                    4
                  </span>
                )}
              </div>
              <span className={`text-[10px] font-medium transition-all duration-300 ${isActive ? 'font-bold translate-y-0 opacity-100' : 'translate-y-2 opacity-0 hidden'}`}>
                {tab.label}
              </span>
              
              {isActive && (
                <div className="absolute -bottom-2 w-1 h-1 bg-primary rounded-full animate-fade-in" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default BottomTabs;