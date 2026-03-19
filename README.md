# 📊 Prometheus Monthly Reports

Sistema de extração de métricas do Prometheus para visualização de dados,
geração de relatórios e exportação em PDF, com seletor por período. 

## 🚀 Tecnologias
- **Framework:** Next.js 15 (App Router)
- **Linguagem:** TypeScript
- **Estilização:** Tailwind CSS
- **Monitoramento:** Prometheus API
- **Exportação:** @react-pdf/renderer

## 🛠️ Como rodar o projeto localmente

1. **Clone o repositório:**
   git clone [https://github.com/seu-usuario/monitor-reports.git](https://github.com/seu-usuario/monitor-reports.git)

### Opção 1: Docker Compose (Recomendado)
Certifique-se de ter o Docker instalado.

2. Configure o ambiente:
   cp .env.example .env.local

3. Suba o container:
  docker compose up --build -d
  
4. Acesse em: http://localhost:3000


### Opção 2: Desenvolvimento Local (Node.js)

2. Instale as dependências:
  npm install

3. Configure as variáveis de ambiente:
  Crie um arquivo .env.local na raiz e adicione a URL do seu Prometheus:

  PROMETHEUS_URL=http://seu-ip-ou-localhost:9090
  
4. Inicie o servidor de desenvolvimento:
  npm run dev

📈 Funcionalidades Planejadas

[x] Conexão dinâmica com API do Prometheus

[ ] Interface de seleção de períodos mensais

[ ] Visualização de dados em tabelas e gráficos

[ ] Exportação de relatórios em PDF