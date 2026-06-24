-- ============================================================
-- SCHEMA DO PORTFÓLIO — Neon PostgreSQL
-- Execute este SQL no Neon SQL Editor ou via migration
-- ============================================================

-- Extensões úteis
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- TABELA: profile (dados do dono do portfólio)
-- ============================================================
CREATE TABLE IF NOT EXISTS profile (
    id              SERIAL PRIMARY KEY,
    full_name       VARCHAR(100) NOT NULL,
    professional_title VARCHAR(150) NOT NULL,
    tagline         TEXT,
    bio             TEXT,
    avatar_url      TEXT,
    hero_image_url  TEXT,
    resume_url      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: social_links (redes sociais)
-- ============================================================
CREATE TABLE IF NOT EXISTS social_links (
    id              SERIAL PRIMARY KEY,
    profile_id      INTEGER REFERENCES profile(id) ON DELETE CASCADE,
    platform        VARCHAR(50) NOT NULL,
    url             TEXT NOT NULL,
    icon_class      VARCHAR(100),
    display_order   INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE
);

-- ============================================================
-- TABELA: stats (números do about)
-- ============================================================
CREATE TABLE IF NOT EXISTS stats (
    id              SERIAL PRIMARY KEY,
    profile_id      INTEGER REFERENCES profile(id) ON DELETE CASCADE,
    label           VARCHAR(100) NOT NULL,
    value           VARCHAR(50) NOT NULL,
    suffix          VARCHAR(20) DEFAULT '',
    display_order   INTEGER DEFAULT 0
);

-- ============================================================
-- TABELA: skill_categories (categorias de habilidades)
-- ============================================================
CREATE TABLE IF NOT EXISTS skill_categories (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    icon_class      VARCHAR(100),
    display_order   INTEGER DEFAULT 0
);

-- ============================================================
-- TABELA: skills (habilidades individuais)
-- ============================================================
CREATE TABLE IF NOT EXISTS skills (
    id              SERIAL PRIMARY KEY,
    category_id     INTEGER REFERENCES skill_categories(id) ON DELETE CASCADE,
    name            VARCHAR(100) NOT NULL,
    proficiency     INTEGER NOT NULL CHECK (proficiency BETWEEN 0 AND 100),
    icon_class      VARCHAR(100),
    display_order   INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE
);

-- ============================================================
-- TABELA: projects (projetos do portfólio)
-- ============================================================
CREATE TABLE IF NOT EXISTS projects (
    id                  SERIAL PRIMARY KEY,
    title               VARCHAR(200) NOT NULL,
    slug                VARCHAR(200) UNIQUE,
    description         TEXT,
    detailed_description TEXT,
    thumbnail_url       TEXT,
    demo_url            TEXT,
    github_url          TEXT,
    featured            BOOLEAN DEFAULT FALSE,
    status              VARCHAR(20) DEFAULT 'published' 
                        CHECK (status IN ('draft', 'published', 'archived')),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: project_technologies (tags de tech por projeto)
-- ============================================================
CREATE TABLE IF NOT EXISTS project_technologies (
    id              SERIAL PRIMARY KEY,
    project_id      INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    technology      VARCHAR(50) NOT NULL,
    UNIQUE(project_id, technology)
);

-- ============================================================
-- TABELA: services (serviços oferecidos)
-- ============================================================
CREATE TABLE IF NOT EXISTS services (
    id              SERIAL PRIMARY KEY,
    title           VARCHAR(200) NOT NULL,
    description     TEXT,
    icon_class      VARCHAR(100),
    display_order   INTEGER DEFAULT 0,
    is_active       BOOLEAN DEFAULT TRUE
);

-- ============================================================
-- TABELA: testimonials (depoimentos de clientes)
-- ============================================================
CREATE TABLE IF NOT EXISTS testimonials (
    id                  SERIAL PRIMARY KEY,
    author_name         VARCHAR(100) NOT NULL,
    author_role         VARCHAR(150),
    author_company      VARCHAR(150),
    author_avatar_url   TEXT,
    content             TEXT NOT NULL,
    rating              INTEGER DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
    display_order       INTEGER DEFAULT 0,
    is_active           BOOLEAN DEFAULT TRUE,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: contact_messages (mensagens do formulário)
-- ============================================================
CREATE TABLE IF NOT EXISTS contact_messages (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    email           VARCHAR(255) NOT NULL,
    subject         VARCHAR(200),
    message         TEXT NOT NULL,
    is_read         BOOLEAN DEFAULT FALSE,
    ip_address      VARCHAR(45),
    user_agent      TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: site_config (configurações gerais do site)
-- ============================================================
CREATE TABLE IF NOT EXISTS site_config (
    id              SERIAL PRIMARY KEY,
    key             VARCHAR(100) UNIQUE NOT NULL,
    value           TEXT,
    type            VARCHAR(20) DEFAULT 'string' 
                    CHECK (type IN ('string', 'number', 'boolean', 'json')),
    description     TEXT,
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: page_visits (analytics de visitas)
-- ============================================================
CREATE TABLE IF NOT EXISTS page_visits (
    id              SERIAL PRIMARY KEY,
    page            VARCHAR(200),
    referrer        TEXT,
    ip_address      VARCHAR(45),
    user_agent      TEXT,
    country         VARCHAR(100),
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES para performance
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_skills_category ON skills(category_id);
CREATE INDEX IF NOT EXISTS idx_skills_active ON skills(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_featured ON projects(featured) WHERE featured = true;
CREATE INDEX IF NOT EXISTS idx_messages_read ON contact_messages(is_read);
CREATE INDEX IF NOT EXISTS idx_messages_created ON contact_messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visits_created ON page_visits(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_visits_page ON page_visits(page);
CREATE INDEX IF NOT EXISTS idx_social_active ON social_links(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_testimonials_active ON testimonials(is_active) WHERE is_active = true;

-- ============================================================
-- FUNÇÃO: auto-update de updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$ BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
 $$ LANGUAGE plpgsql;

CREATE TRIGGER profile_updated_at 
    BEFORE UPDATE ON profile 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER projects_updated_at 
    BEFORE UPDATE ON projects 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER site_config_updated_at 
    BEFORE UPDATE ON site_config 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================
-- SEED DATA — Dados iniciais (substitua com seus dados reais)
-- ============================================================

-- Perfil
INSERT INTO profile (full_name, professional_title, tagline, bio, avatar_url) VALUES
('Lucas Monteiro', 'Desenvolvedor Full Stack', 
 'Construindo experiências digitais que fazem a diferença',
 'Construindo experiências digitais que combinam performance, design impecável e código limpo. Especializado em aplicações web modernas com foco em resultados reais.',
 'https://picsum.photos/seed/devportrait/600/600.jpg')
ON CONFLICT DO NOTHING;

-- Redes Sociais
INSERT INTO social_links (profile_id, platform, url, icon_class, display_order) VALUES
(1, 'github', 'https://github.com', 'fab fa-github', 0),
(1, 'linkedin', 'https://linkedin.com', 'fab fa-linkedin-in', 1),
(1, 'twitter', 'https://twitter.com', 'fab fa-x-twitter', 2),
(1, 'instagram', 'https://instagram.com', 'fab fa-instagram', 3)
ON CONFLICT DO NOTHING;

-- Estatísticas
INSERT INTO stats (profile_id, label, value, suffix, display_order) VALUES
(1, 'Projetos Entregues', '47', '+', 0),
(1, 'Clientes Satisfeitos', '32', '+', 1),
(1, 'Anos de Experiência', '5', '+', 2),
(1, 'Commits no Git', '3.2k', '', 3)
ON CONFLICT DO NOTHING;

-- Categorias de Skills
INSERT INTO skill_categories (name, display_order) VALUES
('Frontend', 1),
('Backend', 2),
('DevOps', 3),
('Design', 4)
ON CONFLICT DO NOTHING;

-- Skills
INSERT INTO skills (category_id, name, proficiency, icon_class, display_order) VALUES
(1, 'React / Next.js', 95, 'fab fa-react', 0),
(1, 'TypeScript', 92, 'fas fa-code', 1),
(1, 'Vue.js', 80, 'fab fa-vuejs', 2),
(1, 'Tailwind CSS', 90, 'fas fa-palette', 3),
(2, 'Node.js / Express', 93, 'fab fa-node-js', 4),
(2, 'PostgreSQL / Neon', 88, 'fas fa-database', 5),
(2, 'Python / FastAPI', 78, 'fab fa-python', 6),
(2, 'REST & GraphQL', 85, 'fas fa-project-diagram', 7),
(3, 'Docker', 82, 'fab fa-docker', 8),
(3, 'AWS / Render', 75, 'fas fa-cloud', 9),
(3, 'CI/CD Pipelines', 78, 'fas fa-infinity', 10),
(4, 'Figma', 85, 'fab fa-figma', 11),
(4, 'UI/UX Design', 80, 'fas fa-pen-nib', 12)
ON CONFLICT DO NOTHING;

-- Projetos
INSERT INTO projects (title, slug, description, thumbnail_url, demo_url, github_url, featured, status) VALUES
('E-Commerce Platform', 'ecommerce-platform', 
 'Plataforma completa de e-commerce com painel admin, pagamentos Stripe e gestão de estoque em tempo real.',
 'https://picsum.photos/seed/ecommerce/800/500.jpg', '#', '#', true, 'published'),
('SaaS Dashboard', 'saas-dashboard',
 'Dashboard analítico para SaaS com gráficos interativos, gerenciamento de equipe e relatórios automatizados.',
 'https://picsum.photos/seed/dashboard/800/500.jpg', '#', '#', true, 'published'),
('App de Delivery', 'delivery-app',
 'Aplicativo de delivery com rastreamento em tempo real, notificações push e sistema de avaliação.',
 'https://picsum.photos/seed/delivery/800/500.jpg', '#', '#', true, 'published'),
('Blog Platform', 'blog-platform',
 'Plataforma de blog com editor Markdown, SEO otimizado, sistema de comentários e analytics integrado.',
 'https://picsum.photos/seed/blogplatform/800/500.jpg', '#', '#', false, 'published'),
('Fintech App', 'fintech-app',
 'Aplicação financeira com controle de gastos, categorização inteligente e metas de economia.',
 'https://picsum.photos/seed/fintech/800/500.jpg', '#', '#', false, 'published'),
('Chat Real-time', 'chat-realtime',
 'Sistema de chat em tempo real com salas, mensagens privadas, compartilhamento de arquivos e videochamadas.',
 'https://picsum.photos/seed/chatapp/800/500.jpg', '#', '#', false, 'published')
ON CONFLICT DO NOTHING;

-- Tecnologias dos Projetos
INSERT INTO project_technologies (project_id, technology) VALUES
(1, 'Next.js'), (1, 'Node.js'), (1, 'PostgreSQL'), (1, 'Stripe'), (1, 'Redis'),
(2, 'React'), (2, 'D3.js'), (2, 'Express'), (2, 'Neon DB'),
(3, 'React Native'), (3, 'FastAPI'), (3, 'PostgreSQL'), (3, 'WebSocket'),
(4, 'Next.js'), (4, 'MDX'), (4, 'Tailwind'), (4, 'Vercel'),
(5, 'React'), (5, 'Node.js'), (5, 'PostgreSQL'), (5, 'Plaid API'),
(6, 'Vue.js'), (6, 'Socket.io'), (6, 'WebRTC'), (6, 'MongoDB')
ON CONFLICT DO NOTHING;

-- Serviços
INSERT INTO services (title, description, icon_class, display_order) VALUES
('Desenvolvimento Web', 
 'Aplicações web completas e responsivas usando as tecnologias mais modernas do mercado, com foco em performance e experiência do usuário.',
 'fas fa-globe', 0),
('APIs & Backend', 
 'APIs robustas e escaláveis com autenticação, documentação automática e arquitetura preparada para crescimento.',
 'fas fa-server', 1),
('UI/UX Design', 
 'Interfaces intuitivas e visualmente atraentes, baseadas em pesquisa de usuário e princípios de design centrado no humano.',
 'fas fa-pen-ruler', 2),
('Consultoria Técnica', 
 'Análise de projetos, escolha de stack tecnológico, code review e orientação para equipes de desenvolvimento.',
 'fas fa-lightbulb', 3),
('DevOps & Cloud', 
 'Configuração de CI/CD, containerização com Docker, deploy automatizado e monitoramento de infraestrutura.',
 'fas fa-cloud-arrow-up', 4),
('Otimização SEO', 
 'Melhoria do posicionamento orgânico com técnicas de SEO técnico, performance Core Web Vitals e conteúdo otimizado.',
 'fas fa-chart-line', 5)
ON CONFLICT DO NOTHING;

-- Depoimentos
INSERT INTO testimonials (author_name, author_role, author_company, author_avatar_url, content, rating, display_order) VALUES
('Marina Costa', 'CEO', 'TechStart',
 'https://picsum.photos/seed/person1/100/100.jpg',
 'O Lucas entregou muito além do esperado. A plataforma que ele desenvolveu transformou completamente nosso negócio online. Recomendo sem hesitar.', 5, 0),
('Rafael Oliveira', 'CTO', 'DataFlow',
 'https://picsum.photos/seed/person2/100/100.jpg',
 'Trabalhamos juntos em um projeto complexo de analytics e fiquei impressionado com a qualidade do código e a capacidade de resolver problemas difíceis.', 5, 1),
('Camila Santos', 'Product Manager', 'InnovateLab',
 'https://picsum.photos/seed/person3/100/100.jpg',
 'Profissional excepcional. Comunicação clara, prazos sempre cumpridos e um cuidado impressionante com os detalhes da interface.', 5, 2)
ON CONFLICT DO NOTHING;

-- Configurações do Site
INSERT INTO site_config (key, value, type, description) VALUES
('contact_email', 'lucas@devportfolio.com', 'string', 'Email de contato exibido no site'),
('contact_phone', '+55 (11) 99999-0000', 'string', 'Telefone de contato'),
('contact_location', 'São Paulo, SP - Brasil', 'string', 'Localização exibida no site'),
('site_name', 'DevPortfolio', 'string', 'Nome do site'),
('maintenance_mode', 'false', 'boolean', 'Ativar modo manutenção')
ON CONFLICT DO NOTHING;