# Servicos API

API REST para gerenciamento de serviços automotivos com autenticação JWT e armazenamento de imagens.

## Tecnologias

- Node.js + Express
- Supabase (PostgreSQL)
- JWT Authentication
- Bcrypt para hash de senhas
- Multer para upload de arquivos
- Express Validator para validação

## Estrutura do Projeto

```
api/
├── src/
│   ├── config/          # Configurações (database, jwt)
│   ├── controllers/     # Lógica de negócio
│   ├── middleware/      # Middlewares (auth, validator, upload)
│   ├── routes/          # Rotas da API
│   ├── migrations/      # Scripts de migração
│   └── server.js        # Servidor principal
├── .env                 # Variáveis de ambiente
└── package.json
```

## Instalação

1. Entre no diretório da API:
```bash
cd api
```

2. Instale as dependências:
```bash
npm install
```

3. Configure as variáveis de ambiente:
```bash
cp .env.example .env
```

Edite o arquivo `.env` com suas credenciais do Supabase:
```env
PORT=3001
NODE_ENV=development

SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

JWT_SECRET=your_super_secure_jwt_secret_key_change_this_in_production
JWT_EXPIRES_IN=7d

ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

MAX_FILE_SIZE=5242880
UPLOAD_PATH=uploads
```

## Configuração do Banco de Dados

### 1. Aplicar Schema no Supabase

Execute o SQL contido em `src/migrations/schema.sql` no Supabase SQL Editor para criar todas as tabelas e políticas RLS.

### 2. Criar Storage Bucket para Imagens

No Supabase Dashboard:
1. Vá em Storage
2. Crie um bucket chamado `service-images`
3. Configure como público ou com políticas RLS apropriadas

### 3. Migrar Dados do SQLite (Opcional)

Se você tem dados no SQLite antigo:

```bash
npm run migrate
```

Este script irá:
- Conectar ao banco SQLite em `../database.sqlite`
- Migrar usuários, serviços, despesas, agendamentos e retiradas
- Manter relacionamentos entre tabelas

## Executar a API

### Desenvolvimento
```bash
npm run dev
```

### Produção
```bash
npm start
```

A API estará disponível em: `http://localhost:3001`

## Endpoints da API

### Autenticação

#### Registrar Usuário
```http
POST /api/auth/register
Content-Type: application/json

{
  "username": "usuario",
  "password": "senha123",
  "name": "Nome Completo",
  "email": "email@example.com"
}
```

#### Login
```http
POST /api/auth/login
Content-Type: application/json

{
  "username": "usuario",
  "password": "senha123"
}
```

Resposta:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": 1,
      "username": "usuario",
      "name": "Nome Completo",
      "email": "email@example.com",
      "role": "user"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

#### Obter Perfil
```http
GET /api/auth/profile
Authorization: Bearer {token}
```

#### Atualizar Perfil
```http
PUT /api/auth/profile
Authorization: Bearer {token}
Content-Type: application/json

{
  "name": "Novo Nome",
  "email": "novoemail@example.com",
  "password": "novasenha123"
}
```

### Serviços

#### Listar Serviços
```http
GET /api/services?status=active
Authorization: Bearer {token}
```

#### Obter Serviço por ID
```http
GET /api/services/:id
Authorization: Bearer {token}
```

#### Criar Serviço
```http
POST /api/services
Authorization: Bearer {token}
Content-Type: application/json

{
  "description": "Instalação de som",
  "vehicle": "Honda Civic 2020",
  "price": 350.00
}
```

#### Atualizar Serviço
```http
PUT /api/services/:id
Authorization: Bearer {token}
Content-Type: application/json

{
  "description": "Instalação de som completa",
  "price": 450.00,
  "status": "completed"
}
```

#### Deletar Serviço
```http
DELETE /api/services/:id
Authorization: Bearer {token}
```

### Despesas

#### Listar Despesas
```http
GET /api/expenses?status=active
Authorization: Bearer {token}
```

#### Criar Despesa
```http
POST /api/expenses
Authorization: Bearer {token}
Content-Type: application/json

{
  "description": "Compra de materiais",
  "amount": 150.00,
  "date": "2025-11-26"
}
```

#### Deletar Despesa
```http
DELETE /api/expenses/:id
Authorization: Bearer {token}
```

### Dashboard

#### Obter Dashboard
```http
GET /api/dashboard
Authorization: Bearer {token}
```

Resposta:
```json
{
  "success": true,
  "data": {
    "activeServicesCount": 5,
    "totalRevenue": 1500.00,
    "totalExpenses": 300.00,
    "totalProfit": 1200.00,
    "withdrawals": {
      "part1": 500.00,
      "part2": 400.00
    },
    "services": [...],
    "todaysAppointments": [...]
  }
}
```

#### Obter Histórico
```http
GET /api/dashboard/history
Authorization: Bearer {token}
```

### Imagens

#### Upload de Imagem
```http
POST /api/images/upload
Authorization: Bearer {token}
Content-Type: multipart/form-data

image: [arquivo]
```

Resposta:
```json
{
  "success": true,
  "message": "Image uploaded successfully",
  "data": {
    "image": {
      "id": 1,
      "user_id": 1,
      "file_name": "image-1234567890-123456789.jpg",
      "url": "https://your-supabase-url/storage/v1/object/public/service-images/1/image-1234567890-123456789.jpg",
      "mime_type": "image/jpeg",
      "size": 102400,
      "created_at": "2025-11-26T10:30:00Z"
    }
  }
}
```

#### Listar Imagens do Usuário
```http
GET /api/images
Authorization: Bearer {token}
```

#### Deletar Imagem
```http
DELETE /api/images/:id
Authorization: Bearer {token}
```

## Segurança

### Autenticação JWT
- Tokens JWT com expiração configurável
- Tokens incluem userId e role
- Verificação em todas as rotas protegidas

### Row Level Security (RLS)
- Todas as tabelas têm RLS habilitado
- Usuários só acessam seus próprios dados
- Políticas específicas por operação (SELECT, INSERT, UPDATE, DELETE)

### Validação de Dados
- Validação de entrada usando express-validator
- Sanitização de dados
- Mensagens de erro descritivas

### Upload de Arquivos
- Apenas imagens permitidas (jpeg, jpg, png, gif, webp)
- Limite de tamanho configurável (5MB padrão)
- Armazenamento seguro no Supabase Storage

### Headers de Segurança
- Helmet.js para headers HTTP seguros
- CORS configurável por origem
- Rate limiting recomendado para produção

## Tratamento de Erros

A API retorna respostas consistentes:

Sucesso:
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
}
```

Erro:
```json
{
  "success": false,
  "message": "Error message",
  "errors": [...]
}
```

## Códigos de Status HTTP

- `200` - OK
- `201` - Created
- `400` - Bad Request (validação)
- `401` - Unauthorized (autenticação)
- `403` - Forbidden (permissão)
- `404` - Not Found
- `500` - Internal Server Error

## Desenvolvimento

### Estrutura de Controllers
Cada controller contém a lógica de negócio para um recurso específico.

### Middleware de Autenticação
- `authenticate`: Requer token JWT válido
- `requireAdmin`: Requer role de admin
- `optionalAuth`: Token opcional

### Validação
Use express-validator nas rotas para validar dados de entrada.

## Deploy

### Variáveis de Ambiente para Produção
- Configure `NODE_ENV=production`
- Use JWT_SECRET forte e único
- Configure ALLOWED_ORIGINS com domínios de produção
- Use HTTPS em produção

### Recomendações
- Configure rate limiting (express-rate-limit)
- Use PM2 ou similar para gerenciamento de processo
- Configure logs adequados
- Monitore performance e erros
- Faça backups regulares do banco

## Suporte

Para problemas ou dúvidas, verifique:
1. Variáveis de ambiente estão corretas
2. Supabase está configurado corretamente
3. Schema SQL foi aplicado
4. Bucket de storage foi criado
