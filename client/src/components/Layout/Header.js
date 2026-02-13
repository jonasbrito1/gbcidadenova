import { Navbar, Nav, NavDropdown, Button, Badge } from 'react-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import {
  FaBars,
  FaSignOutAlt,
  FaUserCircle,
  FaUserShield,
  FaChevronDown
} from 'react-icons/fa';
import { LinkContainer } from 'react-router-bootstrap';
import './Header.css';

const Header = ({ onToggleSidebar }) => {
  const { user, logout } = useAuth();

  const handleLogout = async () => {
    await logout();
  };

  // Função para pegar iniciais do nome
  const getInitials = (name) => {
    if (!name) return 'U';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
  };

  // Função para formatar tipo de usuário
  const formatUserType = (tipo) => {
    const types = {
      'admin': 'Administrador',
      'professor': 'Professor',
      'aluno': 'Aluno'
    };
    return types[tipo] || tipo;
  };

  return (
    <Navbar className="header-modern" expand="lg">
      <div className="header-content">
        {/* Left Section */}
        <div className="header-left">
          {/* Toggle sidebar button */}
          <Button
            variant="link"
            className="toggle-sidebar-btn"
            onClick={onToggleSidebar}
            aria-label="Toggle Menu"
            title="Alternar Menu"
          >
            <FaBars />
          </Button>

          {/* Brand */}
          <Navbar.Brand className="brand-modern" href="/app/dashboard">
            <div className="brand-container">
              <div className="brand-logo">
                <div className="logo-circle">
                  <img
                    src="/images/Gracie_Barra.png"
                    alt="Gracie Barra Logo"
                    className="logo-image"
                  />
                </div>
              </div>
              <div className="brand-text">
                <span className="brand-gracie">GRACIE BARRA</span>
                <span className="brand-cidade">CIDADE NOVA</span>
              </div>
            </div>
          </Navbar.Brand>
        </div>

        <Navbar.Toggle aria-controls="header-navbar-nav" className="navbar-toggler-custom" />

        <Navbar.Collapse id="header-navbar-nav">
          <Nav className="ms-auto header-right">
            {/* User dropdown */}
            <NavDropdown
              title={
                <div className="user-menu-trigger">
                  <div className="user-avatar">
                    {user?.foto_url ? (
                      <img
                        src={user.foto_url}
                        alt={user.nome}
                        className="avatar-image"
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: '50%'
                        }}
                      />
                    ) : (
                      <span className="avatar-initials">
                        {getInitials(user?.nome)}
                      </span>
                    )}
                  </div>
                  <div className="user-info">
                    <span className="user-name">{user?.nome?.split(' ')[0]}</span>
                    <span className="user-role-text">{formatUserType(user?.tipo_usuario)}</span>
                  </div>
                  <FaChevronDown className="dropdown-arrow" />
                </div>
              }
              id="user-dropdown"
              align="end"
              className="user-dropdown"
            >
              {/* User Info Header */}
              <div className="dropdown-header-custom">
                <div className="dropdown-avatar">
                  <div className="dropdown-avatar-circle">
                    {user?.foto_url ? (
                      <img
                        src={user.foto_url}
                        alt={user.nome}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          borderRadius: '50%'
                        }}
                      />
                    ) : (
                      <span>{getInitials(user?.nome)}</span>
                    )}
                  </div>
                </div>
                <div className="dropdown-user-details">
                  <div className="dropdown-user-name">{user?.nome}</div>
                  <div className="dropdown-user-email">{user?.email}</div>
                  <Badge
                    bg={user?.tipo_usuario === 'admin' ? 'danger' : user?.tipo_usuario === 'professor' ? 'primary' : 'secondary'}
                    className="role-badge-dropdown"
                  >
                    {user?.tipo_usuario === 'admin' && <FaUserShield className="me-1" />}
                    {formatUserType(user?.tipo_usuario)}
                  </Badge>
                </div>
              </div>

              <NavDropdown.Divider />

              {/* Logout */}
              <NavDropdown.Item onClick={handleLogout} className="dropdown-item-simple logout-item">
                <FaSignOutAlt className="me-2" />
                Sair
              </NavDropdown.Item>
            </NavDropdown>
          </Nav>
        </Navbar.Collapse>
      </div>
    </Navbar>
  );
};

export default Header;
