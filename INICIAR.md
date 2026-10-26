# Começar com o HiTest

## Primeira instalação no Windows

Na pasta do projeto, execute **`INSTALAR.bat`**. O projeto usa **SQLite** por padrão: um banco de dados em arquivo local que não requer Docker, PostgreSQL nem outro serviço. O instalador verifica e instala Node.js LTS se necessário, prepara o banco automaticamente, pede as credenciais do primeiro usuário administrador e inicia a aplicação.

O instalador usa o **winget** para baixar Node.js quando necessário. **Não instala nem exige Docker**: a instalação e a inicialização do SQLite são automáticas. É necessário ter o App Installer/winget e uma conexão à internet na primeira instalação.

O banco fica em `apps/api/prisma/dev.db`. O instalador cria `apps/api/.env` apenas se esse arquivo ainda não existir. Esses arquivos contêm dados locais e não devem ser compartilhados; o `.gitignore` já os exclui do Git.

## Acessar a aplicação

- No próprio computador: <http://localhost:5173>
- Em outro computador ou smartphone na mesma rede: <http://IP-DO-COMPUTADOR:5173>

O computador que executa a API precisa conseguir acessar os equipamentos na rede local. Se outro aparelho não abrir a página, verifique se está na mesma rede Wi-Fi e se o firewall permite conexões nas portas `5173` e `3000`. Evite expor essas portas diretamente à internet.

## Iniciar manualmente (sem Docker)

Requisitos: Node.js 20 ou superior e npm.

```powershell
npm install
Copy-Item apps\api\.env.example apps\api\.env
```

Preencha `JWT_SECRET` com pelo menos 32 caracteres e defina `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD` no arquivo `apps/api/.env`. Depois:

```powershell
npm run prisma:generate -w @equipamentos/api
npm run prisma:migrate -w @equipamentos/api
npm run prisma:seed -w @equipamentos/api
npm run dev
```

Entre em <http://localhost:5173> com o e-mail e a senha configurados no seed. Para parar a aplicação, use `Ctrl+C`. O SQLite não precisa ser iniciado nem desligado.

## Alternativa PostgreSQL com Docker

Em computadores compatíveis, PostgreSQL continua disponível como alternativa. Inicie o serviço `postgres` em `docker-compose.yml`, altere `DATABASE_URL` em `apps/api/.env` para `postgresql://equipamentos:equipamentos@localhost:5432/equipamentos?schema=public` e use o schema PostgreSQL separado:

```powershell
docker compose up -d postgres
npm run prisma:generate:postgres -w @equipamentos/api
npm run prisma:migrate:postgres -w @equipamentos/api
npm run prisma:seed -w @equipamentos/api
npm run dev
```

O instalador automático usa SQLite e não troca uma URL de banco já configurada. Para voltar ao SQLite, defina `DATABASE_URL="file:./dev.db"` e gere o cliente SQLite com `npm run prisma:generate -w @equipamentos/api`. Mudar o banco não transfere automaticamente os dados entre PostgreSQL e SQLite.

## Verificações de rede

**Verificar rede** testa se a porta TCP cadastrada aceita conexão a partir do computador que executa a API. Isso não confirma que o equipamento está funcionando ou aceitando comandos. Sensores de ar e módulos de máquina usam apenas as solicitações previamente configuradas. Dosadoras não enviam comandos: é necessário confirmar seus endpoints e protocolo antes de habilitar qualquer controle.

Mais detalhes: [README.md](README.md).
