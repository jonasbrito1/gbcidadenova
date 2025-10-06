import React from 'react';
import { Nav, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import {
  FaHome,
  FaUsers,
  FaChalkboardTeacher,
  FaClock,
  FaCreditCard,
  FaClipboardList,
  FaChartBar,
  FaUserCog,
  FaUser,
  FaEdit,
  FaFileAlt
} from 'react-icons/fa';

const Sidebar = ({ collapsed }) => {
  const { user, hasRole } = useAuth();

  const menuItems = [
    {
      path: '/app/dashboard',
      label: 'Dashboard',
      icon: FaHome,
      roles: ['admin', 'professor', 'aluno']
    },
    {
      path: '/app/students',
      label: 'Alunos',
      icon: FaUsers,
      roles: ['admin', 'professor']
    },
    {
      path: '/app/professores',
      label: 'Professores',
      icon: FaChalkboardTeacher,
      roles: ['admin']
    },
    {
      path: '/app/turmas',
      label: 'Turmas',
      icon: FaClock,
      roles: ['admin', 'professor']
    },
    {
      path: '/app/financeiro',
      label: 'Financeiro',
      icon: FaCreditCard,
      roles: ['admin', 'professor']
    },
    {
      path: '/app/frequencia',
      label: 'Frequência',
      icon: FaClipboardList,
      roles: ['admin', 'professor']
    },
    {
      path: '/app/reports',
      label: 'Relatórios',
      icon: FaChartBar,
      roles: ['admin', 'professor']
    },
    {
      path: '/app/users',
      label: 'Usuários',
      icon: FaUserCog,
      roles: ['admin']
    },
    {
      path: '/app/formularios',
      label: 'Formulários',
      icon: FaFileAlt,
      roles: ['admin', 'professor']
    },
    {
      path: '/app/cms',
      label: 'Gerenciar Conteúdo',
      icon: FaEdit,
      roles: ['admin']
    }
  ];

  // Filtrar itens baseado nas permissões do usuário
  const allowedItems = menuItems.filter(item =>
    item.roles.includes(user?.tipo_usuario)
  );

  return (
    <div className={`sidebar p-3 ${collapsed ? 'collapsed' : ''}`} style={{ width: collapsed ? '80px' : '250px', minHeight: '100vh' }}>
      {/* Logo */}
      <div className="text-center mb-4">
        <h4 className="text-white">
          {collapsed ? 'GB' : 'Gracie Barra'}
        </h4>
      </div>

      {/* Menu items */}
      <Nav className="flex-column">
        {allowedItems.map((item) => {
          const IconComponent = item.icon;
          const isCMS = item.path === '/app/cms';

          const navLink = (
            <LinkContainer key={item.path} to={item.path}>
              <Nav.Link
                className={`d-flex align-items-center ${isCMS ? 'cms-menu-item' : ''}`}
                style={isCMS ? {
                  background: 'linear-gradient(45deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))',
                  borderLeft: '3px solid #fff',
                  marginBottom: '5px',
                  borderRadius: '0 8px 8px 0'
                } : {}}
              >
                <IconComponent className="me-2" />
                {!collapsed && (
                  <span style={isCMS ? { fontWeight: '600' } : {}}>
                    {item.label}
                  </span>
                )}
              </Nav.Link>
            </LinkContainer>
          );

          if (collapsed && isCMS) {
            return (
              <OverlayTrigger
                key={item.path}
                placement="right"
                overlay={
                  <Tooltip>
                    <strong>{item.label}</strong><br />
                    <small>Edite textos e imagens do site</small>
                  </Tooltip>
                }
              >
                <div>{navLink}</div>
              </OverlayTrigger>
            );
          }

          return navLink;
        })}

        {/* Separador */}
        <hr className="border-light my-3" />

        {/* Perfil */}
        <LinkContainer to="/profile">
          <Nav.Link className="d-flex align-items-center">
            <FaUser className="me-2" />
            {!collapsed && <span>Meu Perfil</span>}
          </Nav.Link>
        </LinkContainer>
      </Nav>

      {/* User info */}
      {!collapsed && (
        <div className="mt-auto pt-3 border-top border-light">
          <div className="text-center">
            <small className="text-light">
              {user?.nome}
              <br />
              <span className="badge bg-secondary">
                {user?.tipo_usuario}
              </span>
            </small>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;