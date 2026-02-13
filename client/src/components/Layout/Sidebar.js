import React, { useEffect, useRef } from 'react';
import { Nav, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { LinkContainer } from 'react-router-bootstrap';
import { useAuth } from '../../contexts/AuthContext';
import { useLocation } from 'react-router-dom';
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
  FaFileAlt,
  FaCalendarCheck,
  FaMoneyBillWave,
  FaUserCircle,
  FaShieldAlt
} from 'react-icons/fa';
import './Sidebar.css';

const Sidebar = ({ collapsed, isOpen, isMobile }) => {
  const { user } = useAuth();
  const location = useLocation();
  const navRef = useRef(null);

  const menuItems = [
    {
      path: '/app/dashboard',
      label: 'Visão Geral',
      icon: FaHome,
      roles: ['admin', 'professor', 'aluno', 'superadmin'],
      description: 'Resumo das atividades'
    },
    {
      path: '/app/student-profile',
      label: 'Meu Perfil',
      icon: FaUserCircle,
      roles: ['aluno'],
      description: 'Gerenciar meu perfil'
    },
    {
      path: '/app/student-attendance',
      label: 'Minhas Frequências',
      icon: FaCalendarCheck,
      roles: ['aluno'],
      description: 'Check-in e histórico de aulas'
    },
    {
      path: '/app/student-payments',
      label: 'Meus Pagamentos',
      icon: FaMoneyBillWave,
      roles: ['aluno'],
      description: 'Mensalidades e pagamentos'
    },
    {
      path: '/app/students',
      label: 'Alunos',
      icon: FaUsers,
      roles: ['admin', 'professor'],
      description: 'Gerenciar alunos'
    },
    {
      path: '/app/professores',
      label: 'Professores',
      icon: FaChalkboardTeacher,
      roles: ['admin'],
      description: 'Gerenciar professores'
    },
    {
      path: '/app/turmas',
      label: 'Turmas',
      icon: FaClock,
      roles: ['admin', 'professor'],
      description: 'Horários e turmas'
    },
    {
      path: '/app/financeiro',
      label: 'Financeiro',
      icon: FaCreditCard,
      roles: ['admin', 'professor'],
      description: 'Mensalidades e pagamentos'
    },
    {
      path: '/app/frequencia',
      label: 'Frequência',
      icon: FaClipboardList,
      roles: ['admin', 'professor'],
      description: 'Controle de presença'
    },
    {
      path: '/app/reports',
      label: 'Relatórios',
      icon: FaChartBar,
      roles: ['admin', 'professor'],
      description: 'Relatórios e análises'
    },
    {
      path: '/app/users',
      label: 'Usuários',
      icon: FaUserCog,
      roles: ['admin'],
      description: 'Gerenciar usuários'
    },
    {
      path: '/app/formularios',
      label: 'Formulários',
      icon: FaFileAlt,
      roles: ['admin', 'professor'],
      description: 'Cadastros pendentes'
    },
    {
      path: '/app/cms',
      label: 'Gerenciar Conteúdo',
      icon: FaEdit,
      roles: ['admin', 'superadmin'],
      description: 'Editar textos do site',
      special: true
    },
    {
      path: '/app/superadmin',
      label: 'SuperAdmin',
      icon: FaShieldAlt,
      roles: ['superadmin'],
      description: 'Painel completo do sistema',
      special: true
    }
  ];

  // Filtrar itens baseado nas permissões do usuário
  // SuperAdmin tem acesso a TUDO (admin + professor + superadmin)
  const allowedItems = menuItems.filter(item => {
    if (user?.tipo_usuario === 'superadmin') {
      // SuperAdmin vê tudo exceto itens exclusivos de aluno
      return !item.roles.includes('aluno') || item.roles.includes('superadmin');
    }
    return item.roles.includes(user?.tipo_usuario);
  });

  // Detectar scroll e adicionar classes para indicadores
  useEffect(() => {
    const navElement = navRef.current;
    if (!navElement) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = navElement;
      const hasScrollTop = scrollTop > 10;
      const hasScrollBottom = scrollTop < scrollHeight - clientHeight - 10;

      if (hasScrollTop) {
        navElement.classList.add('has-scroll-top');
      } else {
        navElement.classList.remove('has-scroll-top');
      }

      if (hasScrollBottom) {
        navElement.classList.add('has-scroll-bottom');
      } else {
        navElement.classList.remove('has-scroll-bottom');
      }
    };

    // Verificar ao montar e quando o conteúdo mudar
    const checkInitialScroll = () => {
      handleScroll();
    };

    navElement.addEventListener('scroll', handleScroll);
    checkInitialScroll();

    // Observar mudanças de tamanho
    const resizeObserver = new ResizeObserver(checkInitialScroll);
    resizeObserver.observe(navElement);

    return () => {
      navElement.removeEventListener('scroll', handleScroll);
      resizeObserver.disconnect();
    };
  }, [allowedItems, collapsed]);

  const renderMenuItem = (item) => {
    const IconComponent = item.icon;
    const isActive = location.pathname === item.path;
    const isSpecial = item.special;

    const navLink = (
      <Nav.Link
        className={`sidebar-nav-link ${isActive ? 'active' : ''} ${isSpecial ? 'special' : ''}`}
      >
        <div className="nav-icon">
          <IconComponent />
        </div>
        {!collapsed && (
          <span className="nav-label">{item.label}</span>
        )}
        {isActive && <div className="active-indicator" />}
      </Nav.Link>
    );

    if (collapsed) {
      return (
        <OverlayTrigger
          key={item.path}
          placement="right"
          overlay={
            <Tooltip className="modern-tooltip">
              <strong>{item.label}</strong>
              <br />
              <small>{item.description}</small>
            </Tooltip>
          }
        >
          <div>
            <LinkContainer to={item.path}>
              {navLink}
            </LinkContainer>
          </div>
        </OverlayTrigger>
      );
    }

    return (
      <LinkContainer key={item.path} to={item.path}>
        {navLink}
      </LinkContainer>
    );
  };

  return (
    <div className={`sidebar-modern ${collapsed ? 'collapsed' : ''} ${isMobile && isOpen ? 'show' : ''}`}>
      {/* Logo Section */}
      <div className="sidebar-logo">
        <div className="logo-content">
          {collapsed ? (
            <div className="logo-icon-collapsed">
              <img src="/images/Gracie_Barra.png" alt="GB Logo" className="logo-sidebar-collapsed" />
            </div>
          ) : (
            <>
              <img src="/images/Gracie_Barra.png" alt="Gracie Barra Logo" className="logo-sidebar-image" />
              <div className="logo-text-container">
                <div className="logo-text">GRACIE BARRA</div>
                <div className="logo-subtitle">CIDADE NOVA</div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Navigation Menu */}
      <Nav className="flex-column sidebar-nav" ref={navRef}>
        {allowedItems.map(renderMenuItem)}
      </Nav>

      {/* User Profile Section */}
      <div className="sidebar-footer">
        <div className="sidebar-divider" />

        <LinkContainer to="/app/profile">
          <Nav.Link className="sidebar-nav-link profile-link">
            <div className="nav-icon">
              <FaUser />
            </div>
            {!collapsed && (
              <span className="nav-label">Meu Perfil</span>
            )}
          </Nav.Link>
        </LinkContainer>

        {!collapsed && (
          <div className="user-info">
            <div className="user-name">{user?.nome}</div>
            <div className="user-role">
              <span className={`badge-role ${user?.tipo_usuario}`}>
                {user?.tipo_usuario}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
