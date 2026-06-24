const express = require('express');
const cors = require('cors');
const { neon } = require('@neondatabase/serverless');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================================
// CONEXÃO COM NEON POSTGRESQL
// ============================================================
const sql = neon(process.env.DATABASE_URL);

// Teste de conexão ao iniciar
async function testConnection() {
    try {
        const result = await sql`SELECT NOW() as now, current_database() as db, version() as ver`;
        console.log(`[Neon] Conectado ao banco: ${result[0].db}`);
        console.log(`[Neon] Hora do servidor: ${result[0].now.toISOString()}`);
    } catch (err) {
        console.error('[Neon] ERRO DE CONEXÃO:', err.message);
        console.error('[Neon] Verifique a variável DATABASE_URL no Render');
    }
}

// ============================================================
// MIDDLEWARES
// ============================================================
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(morgan('combined'));

// Servir arquivos estáticos (frontend)
app.use(express.static(path.join(__dirname, 'public')));

// Rate limiting — proteção contra abuso
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 200,
    message: { error: 'Muitas requisições. Tente novamente em 15 minutos.' },
    standardHeaders: true,
    legacyHeaders: false
});
app.use('/api/', apiLimiter);

// Rate limiting mais restritivo para POST
const postLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hora
    max: 10,
    message: { error: 'Limite de mensagens atingido. Tente novamente mais tarde.' }
});

// ============================================================
// ROTAS DA API
// ============================================================

// Health check
app.get('/api/health', async (req, res) => {
    try {
        await sql`SELECT 1`;
        res.json({ status: 'ok', database: 'connected', timestamp: new Date().toISOString() });
    } catch (err) {
        res.status(503).json({ status: 'error', database: 'disconnected', error: err.message });
    }
});

// --- Perfil ---
app.get('/api/profile', async (req, res) => {
    try {
        const [profile] = await sql`
            SELECT id, full_name, professional_title, tagline, bio, 
                   avatar_url, hero_image_url, resume_url
            FROM profile 
            ORDER BY id ASC LIMIT 1
        `;
        if (!profile) return res.status(404).json({ error: 'Perfil não encontrado' });
        res.json(profile);
    } catch (err) {
        console.error('[API] /profile:', err.message);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// --- Estatísticas ---
app.get('/api/stats', async (req, res) => {
    try {
        const stats = await sql`
            SELECT label, value, suffix, display_order 
            FROM stats 
            ORDER BY display_order ASC
        `;
        res.json(stats);
    } catch (err) {
        console.error('[API] /stats:', err.message);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// --- Categorias de Skills ---
app.get('/api/skill-categories', async (req, res) => {
    try {
        const categories = await sql`
            SELECT id, name, icon_class, display_order 
            FROM skill_categories 
            ORDER BY display_order ASC
        `;
        // Adicionar "Todas" como categoria virtual
        res.json([{ id: 0, name: 'Todas', icon_class: '', display_order: 0 }, ...categories]);
    } catch (err) {
        console.error('[API] /skill-categories:', err.message);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// --- Skills ---
app.get('/api/skills', async (req, res) => {
    try {
        const skills = await sql`
            SELECT id, category_id, name, proficiency, icon_class, display_order 
            FROM skills 
            WHERE is_active = true 
            ORDER BY display_order ASC
        `;
        res.json(skills);
    } catch (err) {
        console.error('[API] /skills:', err.message);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// --- Projetos ---
app.get('/api/projects', async (req, res) => {
    try {
        const projects = await sql`
            SELECT p.id, p.title, p.slug, p.description, p.thumbnail_url, 
                   p.demo_url, p.github_url, p.featured, p.status,
                   COALESCE(
                       ARRAY_AGG(DISTINCT pt.technology) 
                       FILTER (WHERE pt.technology IS NOT NULL),
                       ARRAY[]::TEXT[]
                   ) as technologies
            FROM projects p
            LEFT JOIN project_technologies pt ON pt.project_id = p.id
            WHERE p.status = 'published'
            GROUP BY p.id
            ORDER BY p.featured DESC, p.created_at DESC
        `;
        res.json(projects);
    } catch (err) {
        console.error('[API] /projects:', err.message);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// --- Serviços ---
app.get('/api/services', async (req, res) => {
    try {
        const services = await sql`
            SELECT id, title, description, icon_class, display_order 
            FROM services 
            WHERE is_active = true 
            ORDER BY display_order ASC
        `;
        res.json(services);
    } catch (err) {
        console.error('[API] /services:', err.message);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// --- Depoimentos ---
app.get('/api/testimonials', async (req, res) => {
    try {
        const testimonials = await sql`
            SELECT id, author_name, author_role, author_company, 
                   author_avatar_url, content, rating, display_order 
            FROM testimonials 
            WHERE is_active = true 
            ORDER BY display_order ASC
        `;
        res.json(testimonials);
    } catch (err) {
        console.error('[API] /testimonials:', err.message);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// --- Info de Contato ---
app.get('/api/contact-info', async (req, res) => {
    try {
        const info = await sql`
            SELECT key as label, value, icon_class as icon 
            FROM site_config 
            WHERE key IN ('contact_email', 'contact_phone', 'contact_location')
            ORDER BY key ASC
        `;
        // Mapear keys para labels amigáveis
        const labelMap = {
            contact_email: 'Email',
            contact_phone: 'Telefone',
            contact_location: 'Localização'
        };
        res.json(info.map(i => ({ ...i, label: labelMap[i.label] || i.label })));
    } catch (err) {
        console.error('[API] /contact-info:', err.message);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// --- Redes Sociais ---
app.get('/api/social-links', async (req, res) => {
    try {
        const links = await sql`
            SELECT platform, url, icon_class, display_order 
            FROM social_links 
            WHERE is_active = true 
            ORDER BY display_order ASC
        `;
        res.json(links);
    } catch (err) {
        console.error('[API] /social-links:', err.message);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// --- Envio de Mensagem (POST) ---
app.post('/api/contact', postLimiter, async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        // Validação server-side
        if (!name || !email || !subject || !message) {
            return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
        }

        if (name.length > 100 || email.length > 255 || subject.length > 200) {
            return res.status(400).json({ error: 'Dados excedem o tamanho permitido' });
        }

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            return res.status(400).json({ error: 'Email inválido' });
        }

        if (message.length < 10 || message.length > 5000) {
            return res.status(400).json({ error: 'Mensagem deve ter entre 10 e 5000 caracteres' });
        }

        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null;
        const ua = req.headers['user-agent']?.substring(0, 500) || null;

        const [inserted] = await sql`
            INSERT INTO contact_messages (name, email, subject, message, ip_address, user_agent)
            VALUES (${name}, ${email}, ${subject}, ${message}, ${ip}, ${ua})
            RETURNING id, created_at
        `;

        console.log(`[Contact] Nova mensagem #${inserted.id} de ${email}`);

        res.status(201).json({ 
            success: true, 
            id: inserted.id, 
            message: 'Mensagem recebida com sucesso' 
        });

    } catch (err) {
        console.error('[API] /contact POST:', err.message);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// --- Registro de Visitas (POST) ---
app.post('/api/visits', async (req, res) => {
    try {
        const { page, referrer, user_agent } = req.body;
        const ip = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.ip || null;

        await sql`
            INSERT INTO page_visits (page, referrer, ip_address, user_agent)
            VALUES (${page || '/'}, ${referrer || null}, ${ip}, ${user_agent || null})
        `;

        res.status(201).json({ success: true });
    } catch (err) {
        // Silencioso — visitas não são críticas
        res.status(201).json({ success: true });
    }
});

// --- Dashboard Admin: Mensagens (GET) ---
app.get('/api/admin/messages', async (req, res) => {
    try {
        // Em produção, adicione autenticação JWT aqui
        const authHeader = req.headers.authorization;
        if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_TOKEN}`) {
            return res.status(401).json({ error: 'Não autorizado' });
        }

        const messages = await sql`
            SELECT id, name, email, subject, message, is_read, 
                   ip_address, created_at
            FROM contact_messages 
            ORDER BY created_at DESC 
            LIMIT 100
        `;
        res.json(messages);
    } catch (err) {
        console.error('[API] /admin/messages:', err.message);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// --- Dashboard Admin: Estatísticas (GET) ---
app.get('/api/admin/analytics', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_TOKEN}`) {
            return res.status(401).json({ error: 'Não autorizado' });
        }

        const [visits] = await sql`SELECT COUNT(*)::int as total FROM page_visits`;
        const [messages] = await sql`SELECT COUNT(*)::int as total FROM contact_messages`;
        const [unread] = await sql`SELECT COUNT(*)::int as total FROM contact_messages WHERE is_read = false`;
        const [todayVisits] = await sql`
            SELECT COUNT(*)::int as total 
            FROM page_visits 
            WHERE created_at >= CURRENT_DATE
        `;

        res.json({ visits: visits.total, messages: messages.total, unread: unread.total, todayVisits: todayVisits.total });
    } catch (err) {
        console.error('[API] /admin/analytics:', err.message);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// --- Marcar mensagem como lida (PATCH) ---
app.patch('/api/admin/messages/:id/read', async (req, res) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || authHeader !== `Bearer ${process.env.ADMIN_TOKEN}`) {
            return res.status(401).json({ error: 'Não autorizado' });
        }

        await sql`UPDATE contact_messages SET is_read = true WHERE id = ${req.params.id}`;
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// ============================================================
// FALLBACK — Todas as outras rotas servem o index.html (SPA)
// ============================================================
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ============================================================
// INICIAR SERVIDOR
// ============================================================
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📍 Ambiente: ${process.env.NODE_ENV || 'development'}`);
    testConnection();
});