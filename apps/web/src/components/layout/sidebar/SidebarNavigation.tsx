import React from 'react';
import { Link, useLocation } from 'react-router-dom';

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
}




export function SidebarNavigation() {
  const location = useLocation();


  const navItems: NavItem[] = [
  {
    to: '/',
    icon:
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>,

    label: '主页'
  },
  {
    to: '/dashboard',
    icon:
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>,

    label: '仪表盘'
  }];



  const isActive = (path: string) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <nav className="px-3 py-4">
      <ul className="space-y-2">
        {navItems.map((item) => {
          const active = isActive(item.to);

          return (
            <li key={item.to}>
              <Link
                to={item.to}
                className={`
                  flex items-center px-4 py-2.5 text-sm rounded-xl transition-all duration-200
                  ${active ?
                'bg-gradient-to-r from-indigo-50 to-indigo-100/80 text-indigo-700 font-medium shadow-sm' :
                'text-gray-700 hover:bg-gray-100/80'}
                `}>
                
                <span className={`${active ? 'text-indigo-600' : 'text-gray-500'} transition-colors duration-200`}>
                  {item.icon}
                </span>
                <span className="ml-3">{item.label}</span>

                {}
                {active &&
                <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500"></span>
                }
              </Link>
            </li>);

        })}
      </ul>
    </nav>);

}