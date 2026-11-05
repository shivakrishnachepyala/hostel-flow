import React from 'react';
import { 
  LayoutDashboard, 
  Box, 
  Building2, 
  Layers, 
  DoorClosed, 
  Bed, 
  Users, 
  CheckCircle2, 
  UserCheck, 
  Sliders, 
  CreditCard, 
  User,
  Shield,
  X
} from 'lucide-react';
import { Link } from 'react-router-dom';

export type ManagementTab = 
  | 'dashboard'
  | 'layout'
  | 'hostels'
  | 'blocks'
  | 'rooms'
  | 'beds'
  | 'students'
  | 'allocation'
  | 'matches'
  | 'preferences'
  | 'payments';

interface NavItem {
  id: ManagementTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  group: 'Overview' | 'Hostel Structure' | 'Residents' | 'Finance';
}

const NAV_ITEMS: NavItem[] = [
  { id: 'dashboard',   label: 'Dashboard',             icon: LayoutDashboard, group: 'Overview' },
  { id: 'layout',      label: '3D Layout & Floors',    icon: Box,              group: 'Hostel Structure' },
  { id: 'hostels',     label: 'Hostel Management',     icon: Building2,        group: 'Hostel Structure' },
  { id: 'blocks',      label: 'Block Management',      icon: Layers,           group: 'Hostel Structure' },
  { id: 'rooms',       label: 'Room Management',       icon: DoorClosed,       group: 'Hostel Structure' },
  { id: 'beds',        label: 'Bed Management',        icon: Bed,              group: 'Hostel Structure' },
  { id: 'students',    label: 'Student Management',    icon: Users,            group: 'Residents' },
  { id: 'allocation',  label: 'Room Allocation',       icon: CheckCircle2,     group: 'Residents' },
  { id: 'matches',     label: 'Roommate Matching',     icon: UserCheck,        group: 'Residents' },
  { id: 'preferences', label: 'Student Preferences',   icon: Sliders,          group: 'Residents' },
  { id: 'payments',    label: 'Payments',              icon: CreditCard,       group: 'Finance' },
];

interface WardenSidebarProps {
  activeTab: ManagementTab;
  onSelectTab: (tab: ManagementTab) => void;
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export const WardenSidebar: React.FC<WardenSidebarProps> = ({
  activeTab,
  onSelectTab,
  mobileOpen,
  onCloseMobile,
}) => {
  let currentGroup = '';

  return (
    <>
      {/* Mobile backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 z-40 lg:hidden backdrop-blur-sm"
          onClick={onCloseMobile}
        />
      )}

      <aside className={`
        fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#172554] text-slate-300 flex flex-col border-r border-white/10
        transition-transform duration-200 ease-in-out lg:translate-x-0 lg:static lg:h-screen lg:sticky
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Brand Header */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 flex-shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-white text-base font-extrabold tracking-tight font-display">
                HostelFlow
              </div>
              <div className="text-sky-300 text-[11px] font-bold uppercase tracking-wider">
                SaaS v2.4
              </div>
            </div>
          </div>
          <button 
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Nav Area */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isNewGroup = item.group !== currentGroup;
            if (isNewGroup) {
              currentGroup = item.group;
            }

            const isActive = activeTab === item.id;
            const Icon = item.icon;

            return (
              <React.Fragment key={item.id}>
                {isNewGroup && (
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pt-3 pb-1">
                    {item.group}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    onSelectTab(item.id);
                    onCloseMobile();
                  }}
                  className={`
                    w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold transition-all text-left
                    ${isActive 
                      ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-600/30' 
                      : 'text-slate-300 hover:text-white hover:bg-blue-900/40'}
                  `}
                >
                  <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              </React.Fragment>
            );
          })}

          {/* Switch Portals Group */}
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-3 pt-4 pb-1">
            Switch Portals
          </div>
          <Link
            to="/"
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-blue-900/40 transition-colors"
          >
            <User className="w-4 h-4 text-sky-400 flex-shrink-0" />
            <span>Student Portal</span>
          </Link>
        </nav>

        {/* Sidebar Footer with Status Card */}
        <div className="p-3 border-t border-white/10">
          <div className="bg-white/5 border border-white/10 rounded-xl p-3">
            <div className="flex items-center gap-2 text-xs font-semibold text-slate-200">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Warden Mode</span>
            </div>
            <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-1">
              <Shield className="w-3 h-3 text-sky-400" />
              <span>MySQL Live Database</span>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};
