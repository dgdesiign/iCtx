import React from 'react';
import { LayoutDashboard, Package, Target, User } from 'lucide-react';

interface MobileNavProps {
  activeTab: 'leads' | 'cartuchos' | 'metas' | 'perfil';
  onTabChange: (tab: 'leads' | 'cartuchos' | 'metas' | 'perfil') => void;
}

export const MobileNav: React.FC<MobileNavProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    { id: 'leads', label: 'Leads', icon: LayoutDashboard },
    { id: 'cartuchos', label: 'Cartuchos', icon: Package },
    { id: 'metas', label: 'Metas', icon: Target },
    { id: 'perfil', label: 'Perfil', icon: User },
  ] as const;

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-slate-200 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] pb-safe">
      <div className="flex items-center justify-around px-2 py-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`flex flex-col items-center justify-center w-16 h-12 rounded-xl transition-colors cursor-pointer ${
                isActive ? 'text-red-700 bg-red-50' : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <Icon className={`w-5 h-5 mb-0.5 ${isActive ? 'stroke-[2.5px]' : 'stroke-2'}`} />
              <span className={`text-[10px] ${isActive ? 'font-bold' : 'font-medium'}`}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};