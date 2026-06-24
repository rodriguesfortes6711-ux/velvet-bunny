const express = require('express');
const cors = require('cors');
const { Pool } = require('pg'); // Driver do PostgreSQL

const app = express();
const PORT = process.env.PORT || 3000;

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Limite alto para imagens Base64
app.use(express.static('public'));

// --- CONEXÃO COM O NEON ---
// A string vem das variáveis de ambiente do Render, ou usa a local para testes
const connectionString = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_je8yM2JPmoHu@ep-morning-credit-at46djrl-pooler.c-9.us-east-1.aws.neon.tech/neondb?sslmode=require';

const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false } // Necessário para o Neon
});

console.log("Tentando conectar ao Neon...");

// --- ROTA DE SAÚDE ---
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', db: 'Neon Postgres' });
});

// --- ROTA LOGIN ---
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (email === 'admin@elite.com' && password === 'admin') {
            return res.json({ name: 'Admin', email, role: 'admin' });
        }

        const result = await pool.query(
            'SELECT * FROM users WHERE email = $1 AND password = $2', 
            [email, password]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: "Credenciais inválidas" });
        }

        res.json(result.rows[0]);
    } catch (error) {
        console.error("Erro Login:", error);
        res.status(500).json({ error: error.message });
    }
});

// --- ROTA CADASTRO ---
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password, role, city, images_base64 } = req.body;

        // 1. Verifica se existe
        const check = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (check.rows.length > 0) {
            return res.status(400).json({ error: "Email já cadastrado." });
        }

        // 2. Cria formatação da imagem para o HTML (<img src="data:image/jpeg;base64,...">)
        let imageUrl = 'https://via.placeholder.com/400x500?text=Sem+Foto';
        if (role === 'model' && images_base64) {
            imageUrl = `data:image/jpeg;base64,${images_base64}`;
        }

        // 3. Salva Usuário
        const userRes = await pool.query(
            'INSERT INTO users (name, email, password, role, city) VALUES ($1, $2, $3, $4, $5) RETURNING *',
            [name, email, password, role, city]
        );

        // 4. Se for modelo, salva na tabela models
        if (role === 'model') {
            await pool.query(
                'INSERT INTO models (name, gender, age, city, price, bio, images, services) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
                [name, 'F', 25, city, 'R$ 500', 'Perfil novo...', [imageUrl], ['Companhia']]
            );
        }

        res.status(201).json({ message: "Sucesso!", user: userRes.rows[0] });

    } catch (error) {
        console.error("Erro Cadastro:", error);
        res.status(500).json({ error: error.message });
    }
});

// --- ROTA LISTAR MODELOS ---
app.get('/api/models', async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM models ORDER BY created_at DESC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- ROTA MENSAGENS ---
app.post('/api/messages', async (req, res) => {
    try {
        const { sender, receiver, content } = req.body;
        await pool.query(
            'INSERT INTO messages (sender_email, receiver_email, content) VALUES ($1, $2, $3)',
            [sender, receiver, content]
        );
        res.json({ message: "Enviado" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/messages', async (req, res) => {
    try {
        const { sender, receiver } = req.query;
        const result = await pool.query(
            `SELECT * FROM messages 
             WHERE (sender_email = $1 AND receiver_email = $2) 
                OR (sender_email = $2 AND receiver_email = $1) 
             ORDER BY created_at ASC`,
            [sender, receiver]
        );
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- ROTA AVALIAÇÕES ---
app.post('/api/reviews', async (req, res) => {
    try {
        const { model_email, client_email, stars, text } = req.body;
        await pool.query(
            'INSERT INTO reviews (model_email, client_email, stars, text) VALUES ($1, $2, $3, $4)',
            [model_email, client_email, stars, text]
        );
        res.json({ message: "Avaliação salva" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/reviews', async (req, res) => {
    try {
        const { model_email } = req.query;
        const result = await pool.query('SELECT * FROM reviews WHERE model_email = $1', [model_email]);
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// --- INICIAR ---
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});