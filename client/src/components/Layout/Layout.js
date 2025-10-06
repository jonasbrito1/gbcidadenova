import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Container, Row, Col } from 'react-bootstrap';
import Sidebar from './Sidebar';
import Header from './Header';

const Layout = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className="d-flex">
      {/* Sidebar */}
      <div className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <Sidebar collapsed={sidebarCollapsed} />
      </div>

      {/* Main content */}
      <div className="flex-grow-1">
        {/* Header */}
        <Header onToggleSidebar={toggleSidebar} />

        {/* Page content */}
        <Container fluid className="py-4">
          <div className="fade-in">
            <Outlet />
          </div>
        </Container>
      </div>
    </div>
  );
};

export default Layout;