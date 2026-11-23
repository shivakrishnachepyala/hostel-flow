import React, { useState, useEffect } from 'react';
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
  ChevronLeft,
  ChevronRight,
  X,
  Hotel
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
  | 'guests'
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
  { id: 'guests',      label: 'Guest Management',      icon: Hotel,            group: 'Residents' },
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
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const SIDEBAR_STORAGE_KEY = 'hostelflow_sidebar_collapsed';

export const WardenSidebar: React.FC<WardenSidebarProps> = ({
  activeTab,
  onSelectTab,
  mobileOpen,
  onCloseMobile,
  collapsed: externalCollapsed,
  onToggleCollapse: externalToggleCollapse,
}) => {
  const [internalCollapsed, setInternalCollapsed] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return localStorage.getItem(SIDEBAR_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const isCollapsed = externalCollapsed !== undefined ? externalCollapsed : internalCollapsed;

  const toggleCollapse = () => {
    if (externalToggleCollapse) {
      externalToggleCollapse();
    } else {
      setInternalCollapsed((prev) => {
        const next = !prev;
        try {
          localStorage.setItem(SIDEBAR_STORAGE_KEY, String(next));
        } catch {}
        return next;
      });
    }
  };

  // Sync internal state when external is provided
  useEffect(() => {
    if (externalCollapsed !== undefined) {
      try {
        localStorage.setItem(SIDEBAR_STORAGE_KEY, String(externalCollapsed));
      } catch {}
    }
  }, [externalCollapsed]);

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

      <aside
        className={`
          fixed top-0 bottom-0 left-0 z-50 bg-[#172554] dark:bg-[#0B1120] text-slate-300 flex flex-col border-r border-white/10 dark:border-[#334155]
          transition-all duration-300 ease-in-out lg:translate-x-0 lg:static lg:h-screen lg:sticky
          ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
          ${mobileOpen ? 'w-64 translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Brand Header */}
        <div className={`flex items-center justify-between p-4 border-b border-white/10 dark:border-[#334155] relative`}>
          {!isCollapsed ? (
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/30 flex-shrink-0">
                <Building2 className="w-5 h-5" />
              </div>
              <div className="overflow-hidden">
                <div className="text-white text-sm font-extrabold tracking-tight font-display truncate">
                  HostelFlow
                </div>
                <div className="text-sky-300 dark:text-sky-400 text-[10px] font-bold uppercase tracking-wider truncate">
                  SaaS v2.4
                </div>
              </div>
            </div>
          ) : (
            <div className="w-full flex justify-center py-1">
              <div
                className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/30 flex-shrink-0 cursor-pointer"
                title="HostelFlow Operations"
                onClick={toggleCollapse}
              >
                <Building2 className="w-5 h-5" />
              </div>
            </div>
          )}

          {/* Top-Right Collapse Button (Left Arrow <- on expand, Right Arrow -> on collapse) */}
          <button 
            type="button"
            onClick={toggleCollapse}
            title={isCollapsed ? "Expand sidebar (→)" : "Collapse sidebar (←)"}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={`
              hidden lg:flex items-center justify-center p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors
              ${isCollapsed ? 'absolute -right-3 top-5 w-6 h-6 rounded-full bg-[#172554] dark:bg-[#111827] border border-white/20 dark:border-[#334155] shadow-md text-white' : ''}
            `}
          >
            {isCollapsed ? (
              <ChevronRight className="w-3.5 h-3.5" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>

          {/* Mobile close button */}
          <button 
            type="button"
            onClick={onCloseMobile}
            className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Nav Area */}
        <nav className="flex-1 overflow-y-auto px-2.5 py-4 space-y-1 overflow-x-hidden">
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
                  !isCollapsed ? (
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#94A3B8] px-3 pt-3 pb-1 truncate">
                      {item.group}
                    </div>
                  ) : (
                    <div className="border-t border-white/10 dark:border-[#334155] my-2 mx-1" title={item.group} />
                  )
                )}

                <div className="relative group">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectTab(item.id);
                      onCloseMobile();
                    }}
                    className={`
                      w-full flex items-center rounded-xl text-xs font-semibold transition-all text-left
                      ${isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2'}
                      ${isActive 
                        ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white shadow-md shadow-indigo-600/30' 
                        : 'text-slate-300 hover:text-white hover:bg-blue-900/40 dark:hover:bg-[#182235]'}
                    `}
                    title={isCollapsed ? item.label : undefined}
                  >
                    <Icon className={`w-4 h-4 flex-shrink-0 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </button>

                  {/* Tooltip on hover when collapsed */}
                  {isCollapsed && (
                    <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-slate-900 dark:bg-[#111827] text-white dark:text-[#F1F5F9] text-xs font-semibold rounded-lg shadow-xl border border-slate-700 dark:border-[#334155] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                      <div>{item.label}</div>
                      <div className="text-[10px] text-slate-400 dark:text-[#94A3B8] font-normal">{item.group}</div>
                    </div>
                  )}
                </div>
              </React.Fragment>
            );
          })}

          {/* Switch Portals Group */}
          {!isCollapsed ? (
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#94A3B8] px-3 pt-4 pb-1">
              Switch Portals
            </div>
          ) : (
            <div className="border-t border-white/10 dark:border-[#334155] my-3 mx-1" />
          )}

          <div className="relative group">
            <Link
              to="/"
              className={`
                w-full flex items-center rounded-xl text-xs font-semibold text-slate-300 hover:text-white hover:bg-blue-900/40 dark:hover:bg-[#182235] transition-colors
                ${isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2'}
              `}
              title={isCollapsed ? 'Student Portal' : undefined}
            >
              <User className="w-4 h-4 text-sky-400 flex-shrink-0" />
              {!isCollapsed && <span className="truncate">Student Portal</span>}
            </Link>

            {isCollapsed && (
              <div className="absolute left-full ml-3 top-1/2 -translate-y-1/2 px-2.5 py-1.5 bg-slate-900 dark:bg-[#111827] text-white dark:text-[#F1F5F9] text-xs font-semibold rounded-lg shadow-xl border border-slate-700 dark:border-[#334155] whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                Student Portal
              </div>
            )}
          </div>
        </nav>

        {/* Sidebar Footer with Status Card */}
        <div className="p-3 border-t border-white/10 dark:border-[#334155]">
          {!isCollapsed ? (
            <div className="bg-white/5 dark:bg-[#111827]/80 border border-white/10 dark:border-[#334155] rounded-xl p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-200 dark:text-[#F1F5F9]">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <span>Warden Mode</span>
              </div>
              <div className="text-[11px] text-slate-400 dark:text-[#94A3B8] mt-1 flex items-center gap-1">
                <Shield className="w-3 h-3 text-sky-400" />
                <span>MySQL Live Database</span>
              </div>
            </div>
          ) : (
            <div 
              className="flex justify-center p-2 rounded-xl bg-white/5 dark:bg-[#111827]/80 border border-white/10 dark:border-[#334155]"
              title="Warden Mode • MySQL Live Database"
            >
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
