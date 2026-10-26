# HiTest · Controle de equipamentos

Projeto inicial de uma aplicação web para cadastro e monitoramento de equipamentos industriais. O monólito modular usa React + TypeScript + Vite, NestJS + TypeScript e Prisma. O banco padrão é SQLite, sem serviço externo; PostgreSQL com Docker está disponível como alternativa.

## Início rápido no Windows

Consulte [`INICIAR.md`](INICIAR.md). Para uma máquina sem suporte ao Docker, execute `INSTALAR.bat`: o projeto usa SQLite em um arquivo local, sem precisar de servidor de banco ou virtualização. O instalador prepara o banco e inicia a aplicação automaticamente. Node.js LTS é o único requisito de runtime instalado.

## Requisitos

- Node.js 20 ou superior e npm para execução manual.
- SQLite é fornecido pelo Prisma e não requer instalação separada.
- Docker Desktop e PostgreSQL são opcionais para quem escolher essa alternativa.

## Executar localmente sem Docker

1. Na raiz, instale as dependências: `npm install`.
2. Crie `apps/api/.env` a partir de `apps/api/.env.example`, defina `JWT_SECRET` com pelo menos 32 caracteres e configure as credenciais de seed.
3. Gere o cliente e aplique a primeira migração:

   ```powershell
   npm run prisma:generate -w @equipamentos/api
   npm run prisma:migrate -w @equipamentos/api
   npm run prisma:seed -w @equipamentos/api
   ```

4. Inicie frontend e backend: `npm run dev`.
5. Acesse http://localhost:5173 e entre com `SEED_ADMIN_EMAIL` e `SEED_ADMIN_PASSWORD`.

O banco SQLite fica em `apps/api/prisma/dev.db` e é inicializado automaticamente pela migração Prisma.

## Alternativa PostgreSQL com Docker

Para computadores compatíveis, o projeto mantém uma configuração opcional de PostgreSQL em `apps/api/prisma/postgresql/schema.prisma`:

```powershell
docker compose up -d postgres
# Configure DATABASE_URL no arquivo apps/api/.env para a URL PostgreSQL
npm run prisma:generate:postgres -w @equipamentos/api
npm run prisma:migrate:postgres -w @equipamentos/api
npm run prisma:seed -w @equipamentos/api
```

O frontend encaminha `/api` para `http://localhost:3000`. O backend exige um `JWT_SECRET` forte, expõe a API em `/api` e aceita a origem `http://localhost:5173` por padrão. Em produção, configure segredos, credenciais, CORS, TLS, firewall e política de backup apropriados.

## Funcionalidades iniciais

- Navegação Home, Sensor de ar, Módulo de máquina e Dosadoras.
- Cadastro, edição e remoção de equipamentos por rede, com nome, tipo, IPv4 e porta.
- Verificação manual e individual de conectividade TCP para o IP e porta cadastrados, com resultado e tempo de resposta; a checagem exige membership na rede e não varre outros endereços.
- Login com senha armazenada em hash e token JWT; cada operação de rede valida o membership do usuário.
- Solicitações HTTP GET de rota fixa: sensores de ar usam `/airon1`, módulos de máquina usam `/lb`. Endereço é construído a partir de IPv4 e porta validados, nunca de uma URL fornecida pelo cliente. O timeout é de 5 segundos.
- Histórico de usuário, equipamento, rota, status, duração e falhas. A API mantém até 100 registros no retorno de atividade.
- Dosadoras podem ser cadastradas, mas não possuem endpoint nem controle de envio de comandos.

A verificação de conectividade confirma apenas se a porta TCP configurada aceita conexão a partir do servidor da API. Ela não confirma que o equipamento está funcionando corretamente nem que seu protocolo de aplicação está disponível. Para dosadoras, não use esse resultado como confirmação de suporte a comandos.

## Escopo e confirmações pendentes

O seed cria um usuário administrador e a rede inicial. Defina credenciais exclusivas no ambiente; o projeto não inclui credenciais padrão. A autenticação inicial é local por e-mail e senha; fluxo de convite/recuperação e gestão de usuários ainda não fazem parte deste esqueleto. Confirme com o usuário os endpoints e o protocolo das dosadoras antes de implementar comandos para elas. Os GETs configurados acima não enviam payload, cabeçalhos proprietários ou autenticação de equipamento.

## Testes e build

- `npm test` executa os testes unitários da API.
- `npm run build` compila API e frontend.
