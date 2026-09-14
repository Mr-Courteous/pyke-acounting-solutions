import { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function Layout({ title, children }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  return (
    <div className="app-shell">
      <Sidebar 
        mobileOpen={mobileSidebarOpen} 
        onMobileClose={() => setMobileSidebarOpen(false)} 
      />
      <div className="app-main">
        <Topbar 
          title={title} 
          onToggleSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        />
        <main className="app-content">{children}</main>
      </div>
    </div>
  );
}
