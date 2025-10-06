import React, { useState } from 'react';
import { Container, Row, Col, Button, Card, Modal, Carousel, Navbar, Nav, Offcanvas } from 'react-bootstrap';
import AnimatedSection from '../../components/Common/AnimatedSection';
import { Link } from 'react-router-dom';
import {
  FaMapMarkerAlt,
  FaPhone,
  FaClock,
  FaUsers,
  FaFacebook,
  FaWhatsapp,
  FaFistRaised,
  FaHeart,
  FaTrophy,
  FaBars,
  FaTimes,
  FaGlobeAmericas,
  FaMapMarkedAlt,
  FaCheckCircle
} from 'react-icons/fa';
import './Landing.css';

const Landing = () => {
  const [showModal, setShowModal] = useState(false);
  const [selectedProfessor, setSelectedProfessor] = useState(null);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('avista');
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const openProfessorModal = (professor) => {
    setSelectedProfessor(professor);
    setShowModal(true);
  };

  const closeProfessorModal = () => {
    setShowModal(false);
    setSelectedProfessor(null);
  };

  const openImageModal = (image) => {
    console.log('Opening image modal:', image);
    setSelectedImage(image);
    setShowImageModal(true);
  };

  const closeImageModal = () => {
    setShowImageModal(false);
    setSelectedImage(null);
  };
  const professors = [
    {
      id: "victor",
      name: "Professor Victor César",
      belt: "Faixa Preta 2º Grau",
      specialties: "Especialista em ensino infantil, Bicampeão Brasileiro",
      description: "Faixa preta desde 2018, formado em Educação Física e especialista em ensino infantil. Bicampeão Brasileiro com experiência internacional nos EUA.",
      image: "/images/victor.jpg",
      fullBio: `Victor César é faixa preta de Jiu-Jitsu 2º grau desde 2018, com mais de uma década de experiência dedicada ao ensino da arte suave, especialmente com crianças. Formado em Educação Física desde 2016, alia conhecimento técnico e pedagógico para oferecer aulas seguras, divertidas e eficazes para todas as idades.

Sua trajetória no Jiu-Jitsu é marcada por conquistas expressivas e vivências internacionais. Atuou como professor por dois anos nos Estados Unidos, onde também competiu e obteve excelentes resultados.

Durante seus dois anos nos Estados Unidos, o Professor Victor não apenas ensinou Jiu-Jitsu, mas também competiu ativamente, representando a escola e conquistando resultados expressivos em diversos campeonatos americanos. Esta experiência internacional enriqueceu significativamente sua metodologia de ensino.

Como Professor especialista em ensino infantil da Gracie Barra Cidade Nova, o Professor Victor César acredita que o Jiu-Jitsu vai muito além das vitórias no tatame: é uma ferramenta poderosa de formação de caráter, disciplina e autoconfiança.`
    },
    {
      id: "ricardo",
      name: "Professor Ricardo Pires",
      belt: "Faixa Preta 2º Grau",
      specialties: "Professor há 12 anos, formado pelo Sensei Henrique Machado",
      description: "38 anos, iniciou aos 15 anos e é faixa preta desde 2016 pelo Sensei Henrique Machado. Professor há 12 anos, combina carreira no serviço público com dedicação total ao Jiu-Jitsu.",
      image: "/images/professor_ricardo.png",
      fullBio: `Professor Ricardo Pires, 38 anos, faixa preta 2° grau, é uma das referências técnicas da Gracie Barra Cidade Nova. Iniciou sua trajetória na arte suave aos 15 anos de idade e, desde então, vem construindo uma carreira marcada por dedicação, disciplina e paixão pelo tatame.

Em 2016, após anos de intenso aperfeiçoamento técnico e vivência no esporte, foi graduado faixa preta pelo renomado Sensei Henrique Machado, referência nacional e internacional na modalidade. Sua formação é fruto de uma trajetória sólida, pautada em treinos rigorosos, estudo contínuo e uma profunda compreensão dos valores do Jiu-Jitsu.

Desde 2013, Ricardo Pires atua como professor, acumulando mais de 12 anos de experiência no ensino da arte marcial. Ao longo desse período, tem formado diversos praticantes, promovendo não apenas o desenvolvimento técnico de seus alunos, mas também valores como respeito, resiliência e autoconfiança.

Apesar de ser um servidor de carreira no serviço público, Ricardo Pires mantém sua dedicação integral ao Jiu-Jitsu, conciliando suas funções profissionais com o constante estudo e o ensino da arte marcial.`
    }
  ];

  const galleryImages = [
    {
      id: 1,
      src: "/images/gb8.jpg",
      title: "Treino de GB1 - Fundamentos",
      description: "Aula de fundamentos para iniciantes, focando em técnicas básicas e segurança"
    },
    {
      id: 2,
      src: "/images/gb10.jpg",
      title: "Academia Gracie Barra",
      description: "Vista geral da nossa academia com tatames profissionais e ambiente climatizado"
    },
    {
      id: 3,
      src: "/images/gb5.png",
      title: "Programa Pequenos Campeões",
      description: "Crianças desenvolvendo disciplina e coordenação motora através do Jiu-Jitsu"
    },
    {
      id: 4,
      src: "/images/gb2.png",
      title: "Treino Adulto Avançado",
      description: "Sessão de treino para praticantes experientes com técnicas avançadas"
    },
    {
      id: 5,
      src: "/images/gb5.jpg",
      title: "Competição GB",
      description: "Nossos atletas representando a Gracie Barra em competições regionais"
    },
    {
      id: 6,
      src: "/images/gb6.jpg",
      title: "Programa Feminino",
      description: "Aulas especiais do Programa Feminino focadas em autodefesa e empoderamento"
    },
    {
      id: 7,
      src: "/images/gb7.jpg",
      title: "Cerimônia de Graduação",
      description: "Momento especial de entrega de faixas e reconhecimento da evolução dos alunos"
    },
    {
      id: 8,
      src: "/images/gb8.jpg",
      title: "Treino GB2 - Avançado",
      description: "Programa intermediário com técnicas mais complexas e sparring controlado"
    },
    {
      id: 9,
      src: "/images/gb9.jpg",
      title: "Filosofia Gracie Barra",
      description: "Transmissão dos valores de irmandade, respeito e integridade"
    },
    {
      id: 10,
      src: "/images/gb6.jpg",
      title: "Comunidade GB Cidade Nova",
      description: "Nossa família Gracie Barra unida pelos valores do Jiu-Jitsu brasileiro"
    }
  ];

  const schedules = [
    {
      time: "07:00",
      timeEnd: "08:00",
      monday: { class: "GB1 - Adulto Iniciantes", level: "iniciante", type: "adulto" },
      tuesday: { class: "GB1 - Adulto Iniciantes", level: "iniciante", type: "adulto" },
      wednesday: { class: "GB1 - Adulto Iniciantes", level: "iniciante", type: "adulto" },
      thursday: { class: "GB1 - Adulto Iniciantes", level: "iniciante", type: "adulto" },
      friday: { class: "GB1 - Adulto Iniciantes", level: "iniciante", type: "adulto" }
    },
    {
      time: "08:00",
      timeEnd: "09:00",
      monday: { class: "GB1 - Adulto Iniciantes", level: "iniciante", type: "adulto" },
      tuesday: { class: "GB1 - Adulto Iniciantes", level: "iniciante", type: "adulto" },
      wednesday: { class: "GB1 - Adulto Iniciantes", level: "iniciante", type: "adulto" },
      thursday: { class: "GB1 - Adulto Iniciantes", level: "iniciante", type: "adulto" },
      friday: { class: "GB1 - Adulto Iniciantes", level: "iniciante", type: "adulto" }
    },
    {
      time: "09:00",
      timeEnd: "10:00",
      monday: { class: "Pequenos Campeões (3-7 anos)", level: "infantil", type: "kids" },
      tuesday: { class: "Pequenos Campeões (3-7 anos)", level: "infantil", type: "kids" },
      wednesday: { class: "Pequenos Campeões (3-7 anos)", level: "infantil", type: "kids" },
      thursday: { class: "Pequenos Campeões (3-7 anos)", level: "infantil", type: "kids" },
      friday: { class: "Pequenos Campeões (3-7 anos)", level: "infantil", type: "kids" }
    },
    {
      time: "09:00",
      timeEnd: "10:30",
      saturday: { class: "Pequenos Campeões - Competição", level: "infantil", type: "kids" }
    },
    {
      time: "16:00",
      timeEnd: "17:00",
      saturday: { class: "Adulto Sem Kimono Feminino", level: "livre", type: "nogi" }
    },
    {
      time: "17:00",
      timeEnd: "18:00",
      monday: { class: "Pequenos Campeões (3-7 anos)", level: "infantil", type: "kids" },
      tuesday: { class: "Pequenos Campeões (3-7 anos)", level: "infantil", type: "kids" },
      wednesday: { class: "Pequenos Campeões (3-7 anos)", level: "infantil", type: "kids" },
      thursday: { class: "Pequenos Campeões (3-7 anos)", level: "infantil", type: "kids" },
      friday: { class: "Pequenos Campeões (3-7 anos)", level: "infantil", type: "kids" },
      saturday: { class: "Adulto Sem Kimono - Treino Livre", level: "livre", type: "nogi" }
    },
    {
      time: "18:00",
      timeEnd: "19:00",
      monday: { class: "Pequenos Campeões - Competição (8-15 anos)", level: "infantil", type: "kids" },
      tuesday: { class: "Pequenos Campeões - Competição (8-15 anos)", level: "infantil", type: "kids" },
      wednesday: { class: "Pequenos Campeões - Competição (8-15 anos)", level: "infantil", type: "kids" },
      thursday: { class: "Pequenos Campeões - Competição (8-15 anos)", level: "infantil", type: "kids" },
      friday: { class: "Pequenos Campeões - Competição (8-15 anos)", level: "infantil", type: "kids" }
    },
    {
      time: "19:00",
      timeEnd: "20:30",
      monday: { class: "GB1 + GB2 - Adultos", level: "todos", type: "adulto" },
      tuesday: { class: "GB1 + GB2 - Adultos", level: "todos", type: "adulto" },
      wednesday: { class: "GB1 + GB2 - Adultos", level: "todos", type: "adulto" },
      thursday: { class: "GB1 + GB2 - Adultos", level: "todos", type: "adulto" },
      friday: { class: "GB1 + GB2 - Adultos", level: "todos", type: "adulto" }
    }
  ];

  const weekDays = [
    { key: 'monday', name: 'Segunda', short: 'SEG' },
    { key: 'tuesday', name: 'Terça', short: 'TER' },
    { key: 'wednesday', name: 'Quarta', short: 'QUA' },
    { key: 'thursday', name: 'Quinta', short: 'QUI' },
    { key: 'friday', name: 'Sexta', short: 'SEX' },
    { key: 'saturday', name: 'Sábado', short: 'SAB' }
  ];

  const getClassTypeIcon = (type) => {
    switch(type) {
      case 'kids': return '🧒';
      case 'adulto': return '🥋';
      case 'openmat': return '🔓';
      case 'nogi': return '🤼';
      default: return '🥋';
    }
  };

  const getClassTypeColor = (level) => {
    switch(level) {
      case 'iniciante': return 'var(--gb-blue)';
      case 'infantil': return 'var(--gb-orange)';
      case 'todos': return 'var(--gb-red)';
      case 'livre': return 'var(--gb-green)';
      default: return 'var(--gb-gray)';
    }
  };

  // Filtrar horários que têm pelo menos uma aula agendada
  const getActiveSchedules = () => {
    return schedules.filter(schedule => {
      return weekDays.some(day => schedule[day.key]);
    });
  };

  const principles = [
    {
      icon: <FaFistRaised className="principle-icon" />,
      title: "Irmandade",
      description: "Os membros da GB fazem as escolas ser o que são. Nossa comunidade reflete fielmente os valores fundamentais da Gracie Barra: Irmandade, criando um ambiente único e transformador."
    },
    {
      icon: <FaTrophy className="principle-icon" />,
      title: "Expansão",
      description: "Compartilhamos o Jiu-Jitsu como ferramenta de transformação social e pessoal, levando seus benefícios para toda a comunidade amazônica."
    },
    {
      icon: <FaHeart className="principle-icon" />,
      title: "Integridade",
      description: "Agimos com honestidade, respeito e ética em todas as nossas ações dentro e fora dos tatames, seguindo os padrões globais da Gracie Barra."
    }
  ];

  return (
    <div className="landing-page">
      {/* Header/Navigation */}
      <Navbar expand="lg" className="landing-nav" fixed="top">
        <Container>
          {/* Brand/Logo */}
          <Navbar.Brand className="brand">
            <div className="logo-container">
              <img
                src="/logo-gb.png"
                alt="Logo Gracie Barra"
                className="academy-logo"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
              <div className="brand-text-container">
                <span className="brand-text-main">Gracie Barra</span>
                <span className="brand-text-sub">Cidade Nova</span>
              </div>
            </div>
          </Navbar.Brand>

          {/* Desktop Navigation */}
          <Nav className="nav-menu d-none d-lg-flex mx-auto">
            <Nav.Link href="#sobre" className="nav-link-custom">Sobre</Nav.Link>
            <Nav.Link href="#programas" className="nav-link-custom">Programas</Nav.Link>
            <Nav.Link href="#planos" className="nav-link-custom">Planos</Nav.Link>
            <Nav.Link href="#professores" className="nav-link-custom">Professores</Nav.Link>
            <Nav.Link href="#horarios" className="nav-link-custom">Horários</Nav.Link>
            <Nav.Link href="#contato" className="nav-link-custom">Contato</Nav.Link>
          </Nav>

          {/* Desktop Action Buttons */}
          <div className="header-actions d-none d-lg-flex">
            <Link to="/formulario" className="btn btn-cadastro me-2">
              Cadastre-se
            </Link>
            <Link to="/login" className="btn btn-login">
              <FaUsers className="me-2" />
              Área do Aluno
            </Link>
          </div>

          {/* Mobile Action Buttons */}
          <div className="header-actions-mobile d-flex d-lg-none">
            <Link to="/login" className="btn btn-login-mobile me-2" title="Área do Aluno">
              <FaUsers />
            </Link>
            <Button
              variant="outline-light"
              className="mobile-menu-toggle"
              onClick={() => setShowMobileMenu(true)}
            >
              <FaBars />
            </Button>
          </div>

          {/* Mobile Menu Offcanvas */}
          <Offcanvas
            show={showMobileMenu}
            onHide={() => setShowMobileMenu(false)}
            placement="end"
            className="mobile-menu-offcanvas"
          >
            <Offcanvas.Header closeButton className="mobile-menu-header">
              <Offcanvas.Title className="mobile-menu-title">
                <div className="mobile-brand">
                  <span className="mobile-brand-main">Gracie Barra</span>
                  <span className="mobile-brand-sub">Cidade Nova</span>
                </div>
              </Offcanvas.Title>
            </Offcanvas.Header>
            <Offcanvas.Body className="mobile-menu-body">
              <Nav className="flex-column">
                <Nav.Link
                  href="#sobre"
                  className="mobile-nav-link"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Sobre
                </Nav.Link>
                <Nav.Link
                  href="#programas"
                  className="mobile-nav-link"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Programas
                </Nav.Link>
                <Nav.Link
                  href="#planos"
                  className="mobile-nav-link"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Planos
                </Nav.Link>
                <Nav.Link
                  href="#professores"
                  className="mobile-nav-link"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Professores
                </Nav.Link>
                <Nav.Link
                  href="#horarios"
                  className="mobile-nav-link"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Horários
                </Nav.Link>
                <Nav.Link
                  href="#contato"
                  className="mobile-nav-link"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Contato
                </Nav.Link>
              </Nav>

              <div className="mobile-menu-actions">
                <Link
                  to="/formulario"
                  className="btn btn-cadastro-full mb-2"
                  onClick={() => setShowMobileMenu(false)}
                >
                  Cadastre-se
                </Link>
                <Link
                  to="/login"
                  className="btn btn-login-full"
                  onClick={() => setShowMobileMenu(false)}
                >
                  <FaUsers className="me-2" />
                  Área do Aluno
                </Link>
              </div>
            </Offcanvas.Body>
          </Offcanvas>
        </Container>
      </Navbar>

      {/* Hero Section */}
      <section className="hero-section">
        <Container>
          <Row className="align-items-center min-vh-100">
            <Col lg={6} className="hero-content">
              <AnimatedSection animation="fadeInLeft" duration={0.8}>
                <h1 className="hero-title">
                  <span className="highlight">
                    Gracie Barra
                  </span>
                  <br />
                  Cidade Nova
                </h1>
              </AnimatedSection>
              <AnimatedSection animation="fadeInLeft" delay={0.2} duration={0.8}>
                <p className="hero-description">
                  Jiu-Jitsu para todos os níveis e idades. Venha fazer parte da maior equipe de Jiu-Jitsu do mundo!
                </p>
              </AnimatedSection>
              <AnimatedSection animation="fadeInUp" delay={0.4} duration={0.6}>
                <div className="hero-buttons">
                  <Link
                    to="/formulario"
                    className="btn btn-danger btn-lg me-3 primary-cta text-decoration-none"
                  >
                    <FaUsers className="me-2" />
                    Fazer Matrícula
                  </Link>
                  <a
                    href="https://wa.me/559281136742?text=Olá!%20Gostaria%20de%20agendar%20uma%20aula%20experimental%20na%20Gracie%20Barra%20Cidade%20Nova."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-outline-light btn-lg secondary-cta text-decoration-none"
                  >
                    <FaWhatsapp className="me-2" />
                    Fale Conosco
                  </a>
                </div>
              </AnimatedSection>
              <AnimatedSection animation="slideInUp" delay={0.6} duration={0.8} className="stagger-children">
                <div className="hero-stats">
                  <div className="stat-item" style={{'--stagger-index': 0}}>
                    <h3>700+</h3>
                    <p>Escolas no Mundo</p>
                  </div>
                  <div className="stat-item" style={{'--stagger-index': 1}}>
                    <h3>6</h3>
                    <p>Continentes</p>
                  </div>
                  <div className="stat-item" style={{'--stagger-index': 2}}>
                    <h3>100K+</h3>
                    <p>Alunos Ativos</p>
                  </div>
                </div>
              </AnimatedSection>
            </Col>
            <Col lg={6} className="hero-image">
              <div className="hero-visual" style={{ animation: 'slideInRight 1s ease-out 0.5s both' }}>
                <div className="academy-photo-wrapper">
                  <div
                    className="academy-photo clickable-photo"
                    onClick={() => {
                      console.log('Click detectado na imagem!');
                      openImageModal({
                        id: 'hero',
                        src: '/images/gb1.jpg',
                        title: 'Gracie Barra Cidade Nova',
                        description: 'Nossa academia - Tradição e excelência no Jiu-Jitsu brasileiro'
                      });
                    }}
                  >
                    <div className="photo-gradient-overlay"></div>
                    <img
                      src="/images/gb1.jpg"
                      alt="Gracie Barra Cidade Nova - Jiu-Jitsu"
                      className="academy-img"
                      draggable="false"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        e.target.parentElement.style.background = 'linear-gradient(45deg, #dc2626, #b91c1c)';
                        e.target.parentElement.innerHTML = '<div class="placeholder-content"><h3>Gracie Barra</h3><p>Cidade Nova</p></div>';
                      }}
                    />
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* About Section */}
      <section id="sobre" className="about-section">
        <Container>
          <Row>
            <Col lg={12} className="text-center mb-5">
              <h2 className="section-title">
                Sobre a Gracie Barra Cidade Nova
              </h2>
              <p className="section-description">
                A Gracie Barra Cidade Nova é uma academia dedicada ao ensino do Jiu-Jitsu brasileiro, seguindo a metodologia e filosofia da maior organização de Jiu-Jitsu do mundo.
              </p>
            </Col>
          </Row>

          {/* Statistics Cards */}
          <Row className="mb-5">
            <Col lg={3} md={6} sm={6} className="mb-4">
              <div className="stat-card">
                <div className="stat-icon">
                  <FaGlobeAmericas />
                </div>
                <div className="stat-number">700+</div>
                <div className="stat-label">Escolas Mundiais</div>
              </div>
            </Col>
            <Col lg={3} md={6} sm={6} className="mb-4">
              <div className="stat-card">
                <div className="stat-icon">
                  <FaMapMarkedAlt />
                </div>
                <div className="stat-number">6</div>
                <div className="stat-label">Continentes</div>
              </div>
            </Col>
            <Col lg={3} md={6} sm={6} className="mb-4">
              <div className="stat-card">
                <div className="stat-icon">
                  <FaUsers />
                </div>
                <div className="stat-number">100K+</div>
                <div className="stat-label">Alunos Ativos</div>
              </div>
            </Col>
            <Col lg={3} md={6} sm={6} className="mb-4">
              <div className="stat-card">
                <div className="stat-icon">
                  <FaTrophy />
                </div>
                <div className="stat-number">40+</div>
                <div className="stat-label">Anos de História</div>
              </div>
            </Col>
          </Row>

          {/* Main Content */}
          <Row className="about-content-row">
            <Col lg={6} className="mb-4 mb-lg-0">
              <div className="about-text-container">
                <h3 className="about-subtitle">Uma Comunidade Global</h3>
                <p className="about-description">
                  Gracie Barra é mais que uma academia - é uma <strong>comunidade mundial</strong> de instrutores, estudantes e atletas unidos pelos valores do Jiu-Jitsu brasileiro.
                </p>
                <p className="about-description">
                  Com <strong>mais de 700 escolas em 6 continentes</strong>, somos a maior organização de Jiu-Jitsu do mundo, promovendo transformação pessoal através da arte suave.
                </p>

                <div className="about-highlights">
                  <div className="highlight-item">
                    <FaCheckCircle className="highlight-icon" />
                    <span>Metodologia pedagógica comprovada</span>
                  </div>
                  <div className="highlight-item">
                    <FaCheckCircle className="highlight-icon" />
                    <span>Padrões internacionais de qualidade</span>
                  </div>
                  <div className="highlight-item">
                    <FaCheckCircle className="highlight-icon" />
                    <span>Comunidade acolhedora e inclusiva</span>
                  </div>
                </div>
              </div>
            </Col>
            <Col lg={6}>
              <div className="about-visual-container">
                <div className="gb-logo-showcase">
                  <img
                    src="/logo-gb.png"
                    alt="Logo Gracie Barra"
                    className="gb-logo-large"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                  <div className="gb-logo-overlay">
                    <img
                      src="/images/gb_logo.png"
                      alt="Gracie Barra Logo"
                      className="gb-overlay-logo"
                    />
                  </div>
                </div>
              </div>
            </Col>
          </Row>

          <Row className="align-items-center mb-5">
            <Col lg={6} md={12} className="mb-4 mb-lg-0">
              <p className="about-detailed-text">
                Localizada estrategicamente na região da Cidade Nova, nossa academia conta com infraestrutura moderna, tatames de alta qualidade e professores qualificados, proporcionando a melhor experiência de aprendizado do Jiu-Jitsu brasileiro em toda a região amazônica.
              </p>
              <p className="about-detailed-text">
                Nossa unidade segue rigorosamente os padrões internacionais da Gracie Barra, oferecendo programas estruturados para todas as idades e níveis, desde o Pequenos Campeões até o programa de faixas-pretas. Aqui você encontrará uma comunidade acolhedora e um ambiente propício para seu desenvolvimento técnico e pessoal.
              </p>
            </Col>

            <Col lg={6} md={12}>
              <div className="gallery-carousel">
                <Carousel interval={3000} className="about-carousel">
                  {galleryImages.map((image, index) => (
                    <Carousel.Item key={image.id}>
                      <div
                        className="carousel-image-container"
                        onClick={() => openImageModal(image)}
                        style={{ cursor: 'pointer' }}
                      >
                        <img
                          src={image.src}
                          alt={image.title}
                          className="carousel-image"
                          onError={(e) => {
                            e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNTAwIiBoZWlnaHQ9IjMwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImEiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNkYzI2MjYiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNiOTFjMWMiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2EpIi8+PHRleHQgeD0iNTAlIiB5PSI0NSUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIyNCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkdyYWNpZSBCYXJyYTwvdGV4dD48dGV4dCB4PSI1MCUiIHk9IjU1JSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE2IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Q2lkYWRlIE5vdmE8L3RleHQ+PC9zdmc+';
                          }}
                        />
                        <div className="carousel-overlay">
                          <div className="carousel-content">
                            <h5 className="carousel-title">{image.title}</h5>
                            <p className="carousel-description">{image.description}</p>
                          </div>
                        </div>
                      </div>
                    </Carousel.Item>
                  ))}
                </Carousel>
              </div>
            </Col>
          </Row>

          <Row className="g-4 mt-4">
            {principles.map((principle, index) => (
              <Col lg={4} md={6} key={index}>
                <Card className="principle-card h-100">
                  <Card.Body className="text-center">
                    {principle.icon}
                    <h4 className="principle-title">{principle.title}</h4>
                    <p className="principle-description">{principle.description}</p>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* Quote Section - Mestre Carlos Gracie Jr. */}
      <section className="quote-section-carlos">
        <img
          src="/images/carlos_gracie.png"
          alt="Carlos Gracie Jr"
          className="quote-section-carlos-bg"
          onError={(e) => { e.target.style.display = 'none'; }}
        />
        <Container>
          <Row>
            <Col lg={8} className="mx-auto">
              <blockquote style={{
                fontSize: 'clamp(1.25rem, 3vw, 2rem)',
                fontStyle: 'italic',
                marginBottom: '2rem',
                lineHeight: '1.6',
                fontWeight: '300'
              }}>
                "Minha vida é dedicada ao Jiu-Jitsu. Meu objetivo sempre foi construir uma irmandade para liderar a expansão do Jiu-Jitsu, respeitando sempre a essência da nossa arte."
              </blockquote>
              <cite style={{
                fontSize: '1.2rem',
                fontWeight: '600',
                color: 'rgba(255, 255, 255, 0.9)',
                fontStyle: 'normal'
              }}>
                — Mestre Carlos Gracie Jr.
              </cite>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Programs Section */}
      <section id="programas" className="programs-section">
        <Container>
          <Row>
            <Col lg={8} className="mx-auto text-center mb-5">
              <h2 className="section-title">Nossos Programas</h2>
              <p className="section-description">
                Oferecemos programas estruturados para todas as idades e níveis de experiência.
              </p>
            </Col>
          </Row>
          <Row className="g-4">
            <Col lg={4} md={6}>
              <Card className="program-card h-100">
                <Card.Body className="text-center">
                  <div className="program-icon">
                    <span style={{fontSize: '2.5rem'}}>1</span>
                  </div>
                  <h4>GB1 - Fundamentos</h4>
                  <p>Iniciantes</p>
                  <p className="text-muted">
                    Programa para iniciantes com foco nos fundamentos básicos do Jiu-Jitsu e defesa pessoal. Ideal para quem está começando sua jornada no mundo das artes marciais.
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={4} md={6}>
              <Card className="program-card h-100">
                <Card.Body className="text-center">
                  <div className="program-icon">
                    <span style={{fontSize: '2.5rem'}}>2</span>
                  </div>
                  <h4>GB1-GB2 - Avançado</h4>
                  <p>Intermediário/Avançado</p>
                  <p className="text-muted">
                    Para alunos com experiência intermediária e avançada, desenvolvendo técnicas complexas e sparring controlado. Aprofundamento das habilidades técnicas.
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={4} md={6}>
              <Card className="program-card h-100">
                <Card.Body className="text-center">
                  <div className="program-icon">
                    <span style={{fontSize: '2.5rem'}}>🧒</span>
                  </div>
                  <h4>Pequenos Campeões</h4>
                  <p>3 a 7 anos</p>
                  <p className="text-muted">
                    Jiu-Jitsu para crianças de 3 a 7 anos, desenvolvendo coordenação motora, disciplina e valores sociais fundamentais.
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={4} md={6}>
              <Card className="program-card h-100">
                <Card.Body className="text-center">
                  <div className="program-icon">
                    <span style={{fontSize: '2.5rem'}}>🏆</span>
                  </div>
                  <h4>Pequenos Campeões - Competição</h4>
                  <p>8 a 15 anos</p>
                  <p className="text-muted">
                    Para jovens de 8 a 15 anos, combinando técnicas de Jiu-Jitsu com preparação para competições e desenvolvimento do caráter.
                  </p>
                </Card.Body>
              </Card>
            </Col>
            <Col lg={4} md={6}>
              <Card className="program-card h-100">
                <Card.Body className="text-center">
                  <div className="program-icon">
                    <span style={{fontSize: '2.5rem'}}>👩</span>
                  </div>
                  <h4>Programa Feminino</h4>
                  <p>Todas as idades</p>
                  <p className="text-muted">
                    Programa especial para mulheres, focando em defesa pessoal e empoderamento feminino em ambiente acolhedor.
                  </p>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Professors Section */}
      <section id="professores" className="professors-section">
        <Container>
          <Row>
            <Col lg={8} className="mx-auto text-center mb-5">
              <AnimatedSection animation="fadeInUp" duration={0.8}>
                <h2 className="section-title">Nossos Professores</h2>
                <p className="section-description">
                  Equipe qualificada e experiente, formada na tradição Gracie Barra.
                </p>
              </AnimatedSection>
            </Col>
          </Row>
          <Row className="g-4 justify-content-center">
            {professors.map((professor, index) => (
              <Col lg={5} md={6} sm={8} key={index}>
                <AnimatedSection
                  animation="scaleInUp"
                  delay={index * 0.2}
                  duration={0.6}
                >
                  <Card className="professor-card">
                  <div className="professor-image">
                    <img
                      src={professor.image}
                      alt={professor.name}
                      onError={(e) => {
                        e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImEiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNkYzI2MjYiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNiOTFjMWMiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2EpIi8+PHRleHQgeD0iNTAlIiB5PSI1MCUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSIxNiIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5Qcm9mZXNzb3I8L3RleHQ+PC9zdmc+';
                      }}
                    />
                  </div>
                  <Card.Body className="text-center">
                    <h4 className="professor-name">{professor.name}</h4>
                    <p className="professor-belt">{professor.belt}</p>
                    <p className="professor-specialties">{professor.description}</p>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => openProfessorModal(professor)}
                      className="mt-2"
                    >
                      Ler mais
                    </Button>
                  </Card.Body>
                </Card>
                </AnimatedSection>
              </Col>
            ))}
          </Row>
        </Container>
      </section>

      {/* Schedule Section */}
      <section id="horarios" className="schedule-section">
        <Container>
          <Row>
            <Col lg={12} className="mx-auto">
              <AnimatedSection animation="fadeInUp" duration={0.8}>
                <div className="text-center mb-5">
                  <h2 className="section-title">Horários de Treino</h2>
                  <p className="section-description">
                    Confira nossa grade de horários e escolha o melhor período para treinar.
                  </p>
                </div>
              </AnimatedSection>
              <AnimatedSection animation="scaleIn" delay={0.2} duration={0.6} className="stagger-children">
                <div className="schedule-legend">
                  <div className="legend-item" style={{'--stagger-index': 0}}>
                    <span className="legend-color iniciante"></span>
                    <span>Iniciantes</span>
                  </div>
                  <div className="legend-item" style={{'--stagger-index': 1}}>
                    <span className="legend-color infantil"></span>
                    <span>Infantil</span>
                  </div>
                  <div className="legend-item" style={{'--stagger-index': 2}}>
                    <span className="legend-color todos"></span>
                    <span>Todos os Níveis</span>
                  </div>
                  <div className="legend-item" style={{'--stagger-index': 3}}>
                    <span className="legend-color livre"></span>
                    <span>Treino Livre</span>
                  </div>
                </div>
              </AnimatedSection>

              {/* Desktop Schedule Grid */}
              <div className="schedule-grid d-none d-xl-block">
                <div className="schedule-header">
                  <div className="time-header">
                    <FaClock className="me-2" />
                    Horário
                  </div>
                  {weekDays.map((day) => (
                    <div key={day.key} className="day-header">
                      <span className="day-name d-none d-xxl-inline">{day.name}</span>
                      <span className="day-short">{day.short}</span>
                    </div>
                  ))}
                </div>

                <div className="schedule-body">
                  {getActiveSchedules().map((schedule, index) => (
                    <div key={index} className="schedule-row">
                      <div className="time-cell compact">
                        <div className="time-main">{schedule.time}</div>
                        <div className="time-end">{schedule.timeEnd}</div>
                      </div>
                      {weekDays.map((day) => (
                        <div key={day.key} className="class-cell compact">
                          {schedule[day.key] && (
                            <div
                              className={`class-card compact ${schedule[day.key].level}`}
                              style={{
                                borderLeft: `3px solid ${getClassTypeColor(schedule[day.key].level)}`
                              }}
                            >
                              <div className="class-icon">{getClassTypeIcon(schedule[day.key].type)}</div>
                              <div className="class-info">
                                <div className="class-name">{schedule[day.key].class}</div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              {/* Tablet Schedule Grid */}
              <div className="schedule-grid-tablet d-none d-lg-block d-xl-none">
                <div className="tablet-schedule-header">
                  <h4>Grade de Horários</h4>
                </div>
                <div className="tablet-schedule-body">
                  {getActiveSchedules().map((schedule, index) => (
                    <div key={index} className="tablet-time-block">
                      <div className="tablet-time-header">
                        <FaClock className="me-2" />
                        {schedule.time} - {schedule.timeEnd}
                      </div>
                      <div className="tablet-classes-row">
                        {weekDays.map((day) => (
                          schedule[day.key] && (
                            <div key={day.key} className="tablet-class-item">
                              <div
                                className={`tablet-class-card ${schedule[day.key].level}`}
                                style={{
                                  borderLeft: `3px solid ${getClassTypeColor(schedule[day.key].level)}`
                                }}
                              >
                                <div className="tablet-day">{day.short}</div>
                                <div className="tablet-class-name">{schedule[day.key].class}</div>
                                <div className="tablet-class-icon">{getClassTypeIcon(schedule[day.key].type)}</div>
                              </div>
                            </div>
                          )
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Mobile Schedule Cards */}
              <div className="schedule-mobile d-lg-none">
                {weekDays.map((day) => (
                  <div key={day.key} className="day-schedule-card">
                    <div className="day-header-mobile">
                      <h4>{day.name}</h4>
                      <span className="day-short-mobile">{day.short}</span>
                    </div>
                    <div className="day-classes">
                      {getActiveSchedules().map((schedule, index) => (
                        schedule[day.key] && (
                          <div key={index} className={`mobile-class-card ${schedule[day.key].level}`}>
                            <div className="mobile-class-time">
                              <FaClock className="me-2" />
                              {schedule.time} - {schedule.timeEnd}
                            </div>
                            <div className="mobile-class-content">
                              <div className="mobile-class-icon">
                                {getClassTypeIcon(schedule[day.key].type)}
                              </div>
                              <div className="mobile-class-info">
                                <div className="mobile-class-name">{schedule[day.key].class}</div>
                                <div className="mobile-class-level">
                                  {schedule[day.key].level === 'iniciante' && 'Iniciantes'}
                                  {schedule[day.key].level === 'infantil' && 'Infantil'}
                                  {schedule[day.key].level === 'todos' && 'Todos os Níveis'}
                                  {schedule[day.key].level === 'livre' && 'Treino Livre'}
                                </div>
                              </div>
                            </div>
                          </div>
                        )
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              {/* Call to Action */}
              <div className="schedule-cta">
                <div className="cta-content">
                  <h4>Pronto para começar?</h4>
                  <p>Escolha o horário que melhor se adapta à sua rotina e venha treinar conosco!</p>
                  <div className="cta-buttons">
                    <a
                      href="https://wa.me/559281136742?text=Olá!%20Gostaria%20de%20saber%20mais%20sobre%20os%20horários%20de%20treino."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-whatsapp-cta"
                    >
                      <FaWhatsapp className="me-2" />
                      Consultar Horários
                    </a>
                    <Link to="/login" className="btn btn-login-cta">
                      <FaUsers className="me-2" />
                      Área do Aluno
                    </Link>
                  </div>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Plans Section */}
      <section id="planos" className="plans-section" style={{ backgroundColor: 'var(--gb-light-gray)', padding: '4rem 0' }}>
        <Container>
          <Row>
            <Col lg={8} className="mx-auto text-center mb-5">
              <h2 className="section-title">Planos de Mensalidade</h2>
              <p className="section-description">
                Escolha o plano ideal para você e sua família. Valores especiais para a comunidade de Manaus.
              </p>
            </Col>
          </Row>
          {/* Payment Method Selection */}
          <Row className="mb-4">
            <Col lg={8} className="mx-auto">
              <div className="payment-method-selector text-center">
                <h5 className="mb-3">Forma de Pagamento:</h5>
                <div className="btn-group" role="group">
                  <input
                    type="radio"
                    className="btn-check"
                    name="paymentMethod"
                    id="avista"
                    value="avista"
                    checked={selectedPaymentMethod === 'avista'}
                    onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                  />
                  <label className="btn btn-outline-success" htmlFor="avista">
                    À Vista (15% desconto)
                  </label>

                  <input
                    type="radio"
                    className="btn-check"
                    name="paymentMethod"
                    id="parcelado"
                    value="parcelado"
                    checked={selectedPaymentMethod === 'parcelado'}
                    onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                  />
                  <label className="btn btn-outline-primary" htmlFor="parcelado">
                    Parcelado (preço normal)
                  </label>
                </div>
              </div>
            </Col>
          </Row>

          <Row className="g-4">
            {/* Monthly Plan */}
            <Col xl={3} lg={6} md={6} sm={12}>
              <Card className="plan-card h-100 text-center plan-monthly">
                <div className="plan-badge">Básico</div>
                <Card.Body>
                  <h4 className="plan-name">Plano Mensal</h4>
                  <div className="plan-price">
                    <span className="currency">R$</span>
                    <span className="amount">140</span>
                    <span className="period">/mês</span>
                  </div>
                  <div className="plan-savings">
                    <span>Sem desconto</span>
                  </div>
                  <ul className="plan-features">
                    <li>Aulas todos os dias</li>
                    <li>Todos os programas GB</li>
                    <li>Horários flexíveis</li>
                    <li>Suporte técnico</li>
                  </ul>
                  <Link
                    to="/checkout"
                    state={{
                      plan: 'mensal',
                      price: 140,
                      paymentMethod: 'parcelado',
                      planName: 'Plano Mensal'
                    }}
                    className="btn btn-outline-danger plan-button text-decoration-none"
                  >
                    <i className="fas fa-play me-2"></i>
                    Começar Agora
                  </Link>
                </Card.Body>
              </Card>
            </Col>

            {/* 3 Months Plan */}
            <Col xl={3} lg={6} md={6} sm={12}>
              <Card className="plan-card h-100 text-center plan-3-months">
                <div className="plan-badge">Trimestral</div>
                <Card.Body>
                  <h4 className="plan-name">Plano 3 Meses</h4>
                  <div className="plan-price">
                    <span className="currency">R$</span>
                    <span className="amount">
                      {selectedPaymentMethod === 'avista' ? '357' : '420'}
                    </span>
                    <span className="period">/trimestre</span>
                  </div>
                  <div className="plan-savings">
                    {selectedPaymentMethod === 'avista' ? (
                      <>
                        <span>R$ 119/mês</span>
                        <small className="discount">15% OFF - Economize R$ 63!</small>
                      </>
                    ) : (
                      <span>R$ 140/mês</span>
                    )}
                  </div>
                  <ul className="plan-features">
                    <li>Aulas todos os dias</li>
                    <li>Todos os programas GB</li>
                    <li>Horários flexíveis</li>
                    <li>Suporte técnico personalizado</li>
                    <li>Avaliação de progresso</li>
                  </ul>
                  <Link
                    to="/checkout"
                    state={{
                      plan: 'trimestral',
                      price: selectedPaymentMethod === 'avista' ? 357 : 420,
                      paymentMethod: selectedPaymentMethod,
                      planName: 'Plano 3 Meses',
                      discount: selectedPaymentMethod === 'avista' ? 63 : 0
                    }}
                    className="btn btn-outline-danger plan-button text-decoration-none"
                  >
                    <i className="fas fa-play me-2"></i>
                    Começar Agora
                  </Link>
                </Card.Body>
              </Card>
            </Col>

            {/* 6 Months Plan */}
            <Col xl={3} lg={6} md={6} sm={12}>
              <Card className="plan-card h-100 text-center plan-6-months popular-plan">
                <div className="plan-badge popular">Mais Popular</div>
                <Card.Body>
                  <h4 className="plan-name">Plano 6 Meses</h4>
                  <div className="plan-price">
                    <span className="currency">R$</span>
                    <span className="amount">
                      {selectedPaymentMethod === 'avista' ? '663' : '780'}
                    </span>
                    <span className="period">/semestre</span>
                  </div>
                  <div className="plan-savings">
                    {selectedPaymentMethod === 'avista' ? (
                      <>
                        <span>R$ 110,50/mês</span>
                        <small className="discount">15% OFF - Economize R$ 117!</small>
                      </>
                    ) : (
                      <>
                        <span>R$ 130/mês</span>
                        <small className="discount">Economize R$ 60!</small>
                      </>
                    )}
                  </div>
                  <ul className="plan-features">
                    <li>Aulas todos os dias</li>
                    <li>Todos os programas GB</li>
                    <li>Prioridade nos horários</li>
                    <li>Mentoria individual mensal</li>
                    <li>Participação em eventos</li>
                    <li>Kit Gracie Barra incluso</li>
                  </ul>
                  <Link
                    to="/checkout"
                    state={{
                      plan: 'semestral',
                      price: selectedPaymentMethod === 'avista' ? 663 : 780,
                      paymentMethod: selectedPaymentMethod,
                      planName: 'Plano 6 Meses',
                      discount: selectedPaymentMethod === 'avista' ? 117 : 60
                    }}
                    className="btn btn-danger plan-button text-decoration-none"
                  >
                    <i className="fas fa-crown me-2"></i>
                    Escolha Popular
                  </Link>
                </Card.Body>
              </Card>
            </Col>

            {/* 12 Months Plan */}
            <Col xl={3} lg={6} md={6} sm={12}>
              <Card className="plan-card h-100 text-center plan-12-months">
                <div className="plan-badge premium">Premium</div>
                <Card.Body>
                  <h4 className="plan-name">Plano 1 Ano</h4>
                  <div className="plan-price">
                    <span className="currency">R$</span>
                    <span className="amount">
                      {selectedPaymentMethod === 'avista' ? '1224' : '1440'}
                    </span>
                    <span className="period">/ano</span>
                  </div>
                  <div className="plan-savings">
                    {selectedPaymentMethod === 'avista' ? (
                      <>
                        <span>R$ 102/mês</span>
                        <small className="discount">15% OFF - Economize R$ 216!</small>
                      </>
                    ) : (
                      <>
                        <span>R$ 120/mês</span>
                        <small className="discount">Economize R$ 240!</small>
                      </>
                    )}
                  </div>
                  <ul className="plan-features">
                    <li>Aulas todos os dias</li>
                    <li>Todos os programas GB</li>
                    <li>Acesso VIP aos eventos</li>
                    <li>Coaching personalizado</li>
                    <li>Seminários exclusivos</li>
                    <li>Kit Gracie Barra Premium</li>
                    <li>Programa de fidelidade</li>
                  </ul>
                  <Link
                    to="/checkout"
                    state={{
                      plan: 'anual',
                      price: selectedPaymentMethod === 'avista' ? 1224 : 1440,
                      paymentMethod: selectedPaymentMethod,
                      planName: 'Plano 1 Ano',
                      discount: selectedPaymentMethod === 'avista' ? 216 : 240
                    }}
                    className="btn btn-outline-danger plan-button text-decoration-none"
                  >
                    <i className="fas fa-gem me-2"></i>
                    Máximo Valor
                  </Link>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Contact Section */}
      <section id="contato" className="contact-section">
        <Container>
          <Row>
            <Col lg={8} className="mx-auto text-center mb-5">
              <AnimatedSection animation="fadeInUp" duration={0.8}>
                <h2 className="section-title">
                  Entre em Contato
                </h2>
                <p className="section-description">
                  Venha conhecer nossa academia e agendar sua aula experimental.
                </p>
              </AnimatedSection>
            </Col>
          </Row>
          <Row className="g-4">
            <Col lg={4} md={6}>
              <AnimatedSection animation="slideInLeft" delay={0.1} duration={0.6}>
                <Card className="contact-card h-100">
                <Card.Body className="text-center">
                  <FaMapMarkerAlt className="contact-icon" />
                  <h4>Localização</h4>
                  <p>
                    Av. Atroaris, quadra 20, n. 129<br />
                    Conj. Renato Souza, R. Cap. Braule Pinto<br />
                    Cidade Nova, Manaus - AM
                  </p>
                </Card.Body>
              </Card>
              </AnimatedSection>
            </Col>
            <Col lg={4} md={6}>
              <AnimatedSection animation="fadeInUp" delay={0.2} duration={0.6}>
                <Card className="contact-card h-100">
                <Card.Body className="text-center">
                  <FaWhatsapp className="contact-icon whatsapp-icon" />
                  <h4>Contato WhatsApp</h4>
                  <p className="contact-description">
                    Entre em contato conosco diretamente pelo WhatsApp
                  </p>
                  <div className="whatsapp-buttons">
                    <a
                      href="https://wa.me/559281136742?text=Olá!%20Gostaria%20de%20agendar%20uma%20aula%20experimental%20na%20Gracie%20Barra%20Cidade%20Nova."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-whatsapp-contact mb-2"
                    >
                      <FaWhatsapp className="me-2" />
                      (92) 98113-6742
                      <span className="whatsapp-label">Principal</span>
                    </a>
                    <a
                      href="https://wa.me/559281501174?text=Olá!%20Gostaria%20de%20saber%20mais%20informações%20sobre%20a%20Gracie%20Barra%20Cidade%20Nova."
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-whatsapp-contact"
                    >
                      <FaWhatsapp className="me-2" />
                      (92) 98150-1174
                      <span className="whatsapp-label">Alternativo</span>
                    </a>
                  </div>
                </Card.Body>
              </Card>
              </AnimatedSection>
            </Col>
            <Col lg={4} md={6}>
              <AnimatedSection animation="slideInRight" delay={0.3} duration={0.6}>
                <Card className="contact-card h-100">
                  <Card.Body className="text-center">
                    <FaClock className="contact-icon" />
                    <h4>Horários</h4>
                    <p>
                      Segunda a Sexta: 07:00 - 20:30<br />
                      Sábado: 09:00 - 18:00<br />
                      Domingo: Fechado
                    </p>
                  </Card.Body>
                </Card>
              </AnimatedSection>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Simple Modern CTA Section */}
      <section className="simple-cta-section">
        <Container>
          <Row className="justify-content-center">
            <Col lg={8} className="text-center text-white">
              <div className="simple-cta-content">
                <div className="cta-badge">
                  <span>🥋</span>
                  <span>Transforme sua vida</span>
                </div>

                <h2 className="simple-cta-title">
                  Comece sua Jornada Hoje
                </h2>

                <p className="simple-cta-description">
                  Transforme sua vida através do Jiu-Jitsu
                </p>

                <div className="simple-cta-features">
                  <div className="simple-feature">
                    <FaCheckCircle className="simple-feature-icon" />
                    <span>Aula experimental gratuita</span>
                  </div>
                  <div className="simple-feature">
                    <FaCheckCircle className="simple-feature-icon" />
                    <span>Professores certificados</span>
                  </div>
                  <div className="simple-feature">
                    <FaCheckCircle className="simple-feature-icon" />
                    <span>Comunidade acolhedora</span>
                  </div>
                </div>

                <div className="simple-cta-buttons">
                  <Link to="/formulario" className="btn btn-simple-primary">
                    <FaUsers className="me-2" />
                    Fazer Matrícula Online
                  </Link>

                  <a
                    href="https://wa.me/559281136742?text=Olá!%20Gostaria%20de%20agendar%20uma%20aula%20experimental%20na%20Gracie%20Barra%20Cidade%20Nova."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-simple-secondary"
                  >
                    <FaWhatsapp className="me-2" />
                    Aula Experimental
                  </a>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </section>

      {/* Footer */}
      <footer className="landing-footer">
        <Container>
          <Row>
            <Col lg={4} md={6}>
              <div className="footer-brand">
                <span className="footer-logo">Gracie Barra</span>
                <p>Tradição, respeito e excelência no ensino do Brazilian Jiu-Jitsu.</p>
                <div className="social-links">
                  <button className="social-link" style={{ border: 'none', background: 'transparent' }}>
                    <FaFacebook />
                  </button>
                  <a
                    href="https://wa.me/559281136742?text=Olá!%20Gostaria%20de%20saber%20mais%20sobre%20a%20Gracie%20Barra%20Cidade%20Nova."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="social-link whatsapp-social"
                    title="WhatsApp Principal"
                  >
                    <FaWhatsapp />
                  </a>
                </div>
              </div>
            </Col>
            <Col lg={4} md={6}>
              <h5 className="footer-title">Informações</h5>
              <div className="footer-info">
                <p className="footer-address">
                  <FaMapMarkerAlt className="me-2" />
                  Av. Atroaris, quadra 20, n. 129, Cidade Nova
                </p>
                <div className="footer-contact-buttons">
                  <a
                    href="https://wa.me/559281136742?text=Olá!%20Gostaria%20de%20agendar%20uma%20aula%20experimental%20na%20Gracie%20Barra%20Cidade%20Nova."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-footer-whatsapp mb-2"
                  >
                    <FaWhatsapp className="me-2" />
                    (92) 98113-6742
                  </a>
                  <a
                    href="https://wa.me/559281501174?text=Olá!%20Gostaria%20de%20saber%20mais%20informações%20sobre%20a%20Gracie%20Barra%20Cidade%20Nova."
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-footer-whatsapp"
                  >
                    <FaWhatsapp className="me-2" />
                    (92) 98150-1174
                  </a>
                </div>
              </div>
            </Col>
            <Col lg={4} md={12}>
              <h5 className="footer-title">Horário de Funcionamento</h5>
              <div className="footer-hours">
                <p>Segunda a Sexta: 07:00 - 20:30</p>
                <p>Sábado: 09:00 - 18:00</p>
                <p>Domingo: Fechado</p>
              </div>
            </Col>
          </Row>
          <hr className="footer-divider" />
          <Row>
            <Col md={6}>
              <p className="footer-copyright">
                © 2025 Gracie Barra Cidade Nova. Todos os direitos reservados.
              </p>
            </Col>
            <Col md={6} className="text-md-end">
              <div className="footer-links">
                <Link to="/login" className="footer-link">Área do Aluno</Link>
                <span className="mx-2">•</span>
                <span className="footer-link">Políticas</span>
                <span className="mx-2">•</span>
                <span className="footer-link">Termos de Uso</span>
              </div>
            </Col>
          </Row>
        </Container>
      </footer>

      {/* Professor Modal */}
      <Modal show={showModal} onHide={closeProfessorModal} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedProfessor?.name}
            <div style={{ fontSize: '0.9rem', color: '#666', fontWeight: 'normal' }}>
              {selectedProfessor?.belt} • Gracie Barra Cidade Nova
            </div>
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedProfessor && (
            <div>
              <div style={{ whiteSpace: 'pre-line', lineHeight: '1.6' }}>
                {selectedProfessor.fullBio}
              </div>

              <div className="mt-4">
                <h5>Filosofia de Ensino:</h5>
                <p style={{ lineHeight: '1.6' }}>
                  {selectedProfessor.id === 'victor'
                    ? 'Como Professor especialista em ensino infantil da Gracie Barra Cidade Nova, acredita que o Jiu-Jitsu vai muito além das vitórias no tatame: é uma ferramenta poderosa de formação de caráter, disciplina e autoconfiança. Seu compromisso é oferecer um ambiente acolhedor, respeitoso e de alto nível técnico para todos os alunos.'
                    : 'Conhecido por sua paciência e didática excepcional, adapta seu ensino às necessidades específicas de cada aluno, sempre respeitando os limites individuais e promovendo um ambiente de aprendizado seguro e eficaz. Sua abordagem equilibra rigor técnico com humanidade, criando uma atmosfera ideal para o desenvolvimento integral dos praticantes.'
                  }
                </p>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={closeProfessorModal}>
            Fechar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Image Gallery Modal */}
      <Modal show={showImageModal} onHide={closeImageModal} size="xl" centered className="image-modal">
        <Modal.Header closeButton className="border-0">
          <Modal.Title>
            {selectedImage?.title}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="p-0">
          {selectedImage && (
            <div className="expanded-image-container">
              <img
                src={selectedImage.src}
                alt={selectedImage.title}
                className="expanded-image"
                onError={(e) => {
                  e.target.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iOTAwIiBoZWlnaHQ9IjYwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZGVmcz48bGluZWFyR3JhZGllbnQgaWQ9ImEiIHgxPSIwJSIgeTE9IjAlIiB4Mj0iMTAwJSIgeTI9IjEwMCUiPjxzdG9wIG9mZnNldD0iMCUiIHN0b3AtY29sb3I9IiNkYzI2MjYiLz48c3RvcCBvZmZzZXQ9IjEwMCUiIHN0b3AtY29sb3I9IiNiOTFjMWMiLz48L2xpbmVhckdyYWRpZW50PjwvZGVmcz48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSJ1cmwoI2EpIi8+PHRleHQgeD0iNTAlIiB5PSI0NSUiIGZvbnQtZmFtaWx5PSJBcmlhbCIgZm9udC1zaXplPSI0OCIgZmlsbD0id2hpdGUiIHRleHQtYW5jaG9yPSJtaWRkbGUiPkdyYWNpZSBCYXJyYTwvdGV4dD48dGV4dCB4PSI1MCUiIHk9IjU1JSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjI0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+Q2lkYWRlIE5vdmE8L3RleHQ+PC9zdmc+';
                }}
              />
              <div className="expanded-image-info">
                <h4>{selectedImage.title}</h4>
                <p>{selectedImage.description}</p>
              </div>
            </div>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Landing;