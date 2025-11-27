# Servicos API - MySQL Version

API REST para gerenciamento de serviços automotivos com MySQL local.

## 🚀 Mudanças Principais

### Migração Supabase → MySQL

- ✅ Substituído `@supabase/supabase-js` por `mysql2`
- ✅ Todas as queries reescritas para MySQL
- ✅ Schema adaptado para MySQL (ENUM, AUTO_INCREMENT, etc)
- ✅ Sistema de upload local (não usa Supabase Storage)
- ✅ Segurança implementada em nível de aplicação
- ✅ RLS removido (segurança nas queries SQL)

## 📋 Pré-requisitos

### Instalar MySQL

**Ubuntu/Debian:**
```bash
sudo apt update
sudo apt install mysql-server
sudo mysql_secure_installation
```

**macOS:**
```bash
brew install mysql
brew services start mysql
```

**Windows:**
- Baixe o instalador em: https://dev.mysql.com/downloads/installer/

### Configurar MySQL

```bash
# Entrar no MySQL como root
sudo mysql -u root -p

# Criar usuário para a aplicação
CREATE USER 'servicos_user'@'localhost' IDENTIFIED BY 'sua_senha_forte';

# Criar banco de dados
CREATE DATABASE servicos_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

# Dar permissões
GRANT ALL PRIVILEGES ON servicos_db.* TO 'servicos_user'@'localhost';
FLUSH PRIVILEGES;

# Sair
EXIT;
```

## 🔧 Instalação

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env`:

```bash
cp .env.example .env
```

Edite o `.env` com suas credenciais:

```env
PORT=3001
NODE_ENV=development

# MySQL Configuration
DB_HOST=localhost
DB_PORT=3306
DB_NAME=servicos_db
DB_USER=servicos_user
DB_PASSWORD=sua_senha_forte

# JWT Configuration
JWT_SECRET=seu_secret_jwt_super_seguro_mude_em_producao
JWT_EXPIRES_IN=7d

# CORS
ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

# Upload
MAX_FILE_SIZE=5242880
UPLOAD_PATH=uploads
```

### 3. Configurar Banco de Dados

Execute o script de setup que irá:
- Criar o banco de dados (se não existir)
- Aplicar todo o schema
- Criar a pasta de uploads

```bash
npm run setup
```

## ▶️ Executar

### Desenvolvimento
```bash
npm run dev
```

### Produção
```bash
npm start
```

A API estará disponível em: `http://localhost:3001`

## 📁 Estrutura do Projeto

```
api/
├── src/
│   ├── config/
│   │   ├── database.js       # MySQL connection pool
│   │   └── jwt.js             # JWT configuration
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── dashboardController.js
│   │   ├── expensesController.js
│   │   ├── imagesController.js
│   │   └── servicesController.js
│   ├── middleware/
│   │   ├── auth.js
│   │   ├── errorHandler.js
│   │   ├── upload.js          # Multer local storage
│   │   └── validator.js
│   ├── migrations/
│   │   ├── setup.js           # Setup script
│   │   └── schema.sql         # MySQL schema
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── dashboardRoutes.js
│   │   ├── expensesRoutes.js
│   │   ├── imagesRoutes.js
│   │   └── servicesRoutes.js
│   └── server.js
├── uploads/                    # Uploaded images
├── .env                        # Environment variables
├── .env.example
├── package.json
└── README.md
```

## 🔐 Segurança

### Diferenças do Supabase

Como não temos Row Level Security (RLS) do PostgreSQL, a segurança é implementada diretamente nas queries:

**Antes (Supabase com RLS):**
```javascript
// RLS automático garante que só vê seus dados
const { data } = await supabase.from('services').select('*');
```

**Agora (MySQL):**
```javascript
// Sempre incluir user_id nas queries
const [services] = await db.query(
  'SELECT * FROM services WHERE user_id = ?',
  [req.user.id]
);
```

### Boas Práticas

1. **Sempre use prepared statements** (como nos exemplos)
2. **Sempre valide user_id** em todas as operações
3. **Use o middleware de autenticação** em todas as rotas protegidas
4. **Valide entrada de dados** com express-validator

## 📡 Endpoints da API

A API mantém os mesmos endpoints da versão Supabase:

### Autenticação
- `POST /api/auth/register` - Registrar usuário
- `POST /api/auth/login` - Login
- `GET /api/auth/profile` - Obter perfil
- `PUT /api/auth/profile` - Atualizar perfil

### Serviços
- `GET /api/services` - Listar serviços
- `GET /api/services/:id` - Obter serviço
- `POST /api/services` - Criar serviço
- `PUT /api/services/:id` - Atualizar serviço
- `DELETE /api/services/:id` - Deletar serviço

### Despesas
- `GET /api/expenses` - Listar despesas
- `POST /api/expenses` - Criar despesa
- `DELETE /api/expenses/:id` - Deletar despesa

### Dashboard
- `GET /api/dashboard` - Dashboard principal
- `GET /api/dashboard/history` - Histórico completo

### Imagens
- `POST /api/images/upload` - Upload de imagem
- `GET /api/images` - Listar imagens
- `DELETE /api/images/:id` - Deletar imagem

## 🖼️ Sistema de Upload

As imagens agora são armazenadas **localmente** na pasta `uploads/`:

```
uploads/
  └── {user_id}/
      ├── image-1234567890-123456789.jpg
      └── image-9876543210-987654321.png
```

**Acessar imagens:**
```
http://localhost:3001/uploads/{user_id}/image-1234567890-123456789.jpg
```

## 🔍 Troubleshooting

### Erro: Access denied for user

```bash
# Verificar usuário e permissões no MySQL
sudo mysql -u root -p

SHOW GRANTS FOR 'servicos_user'@'localhost';
```

### Erro: connect ECONNREFUSED

Verifique se o MySQL está rodando:

```bash
# Linux
sudo systemctl status mysql

# macOS
brew services list

# Iniciar MySQL
sudo systemctl start mysql  # Linux
brew services start mysql   # macOS
```

### Erro: Unknown database 'servicos_db'

Execute o setup novamente:
```bash
npm run setup
```

### Problemas com Uploads

Verifique permissões da pasta:
```bash
chmod 755 uploads
```

## 🚀 Deploy em Produção

### 1. Configure Variáveis de Ambiente

```env
NODE_ENV=production
JWT_SECRET=um_secret_super_seguro_e_longo_para_producao
```

### 2. Configure MySQL

- Use usuário com permissões limitadas
- Configure backup automático
- Use SSL/TLS para conexões

### 3. Proxy Reverso (Nginx)

```nginx
server {
    listen 80;
    server_name api.seudominio.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    location /uploads {
        alias /caminho/para/api/uploads;
    }
}
```

### 4. Process Manager (PM2)

```bash
npm install -g pm2
pm2 start src/server.js --name servicos-api
pm2 save
pm2 startup
```

## 📊 Backup do Banco

```bash
# Fazer backup
mysqldump -u servicos_user -p servicos_db > backup.sql

# Restaurar backup
mysql -u servicos_user -p servicos_db < backup.sql
```

## 🆘 Suporte

Em caso de problemas:

1. Verifique os logs do servidor
2. Verifique os logs do MySQL: `sudo tail -f /var/log/mysql/error.log`
3. Teste a conexão do banco com o script de setup
4. Verifique se todas as variáveis de ambiente estão corretas

## 📝 Changelog

### Versão 2.0.0 - Migração para MySQL

- Removida dependência do Supabase
- Implementado MySQL com conexão local
- Sistema de upload local com multer
- Segurança implementada em nível de aplicação
- Schema SQL adaptado para MySQL
- Todos os controllers reescritos
- Script de setup automatizado