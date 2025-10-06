import React from 'react';
import { Navbar, Nav, NavDropdown, Button } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { FaBars, FaSignOutAlt, FaUser } from 'react-icons/fa';
import { LinkContainer } from 'react-router-bootstrap';
import ThemeToggle from '../Common/ThemeToggle';

const Header = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <Navbar bg="light" expand="lg" className="border-bottom px-3">
      {/* Toggle sidebar button */}
      <Button
        variant="outline-secondary"
        size="sm"
        onClick={onToggleSidebar}
        className="me-3"
      >
        <FaBars />
      </Button>

      {/* Brand */}
      <Navbar.Brand className="text-gb-red fw-bold">
        Sistema GB
      </Navbar.Brand>

      <Navbar.Toggle aria-controls="basic-navbar-nav" />
      <Navbar.Collapse id="basic-navbar-nav">
        {/* Right side menu */}
        <Nav className="ms-auto">
          {/* Theme toggle */}
          <Nav.Item className="me-3">
            <ThemeToggle />
          </Nav.Item>

          {/* User dropdown */}
          <NavDropdown
            title={
              <span>
                <FaUser className="me-2" />
                {user?.nome}
              </span>
            }
            id="user-dropdown"
            align="end"
          >
            <LinkContainer to="/app/profile">
              <NavDropdown.Item>
                <FaUser className="me-2" />
                Meu Perfil
              </NavDropdown.Item>
            </LinkContainer>

            <NavDropdown.Divider />

            <NavDropdown.Item onClick={handleLogout}>
              <FaSignOutAlt className="me-2" />
              Sair
            </NavDropdown.Item>
          </NavDropdown>
        </Nav>
      </Navbar.Collapse>
    </Navbar>
  );
};

export default Header;