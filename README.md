# Dr. HO SaaS - Plataforma de Relatórios de Riscos Ocupacionais

Uma plataforma SaaS completa para gestão de relatórios de riscos ocupacionais com integração Stripe para pagamentos e assinaturas.

## 🚀 Funcionalidades

### Para Usuários
- **Relatórios de Riscos**: Acesso a relatórios técnicos detalhados sobre riscos ocupacionais
- **Assinatura Anual**: Sistema de pagamento via Stripe com renovação automática
- **Portal do Cliente**: Gerenciamento de assinatura, cartão de crédito e faturas
- **Busca Avançada**: Pesquisa por categoria, palavras-chave e filtros
- **Favoritos**: Sistema de curtidas e favoritos para documentos
- **Comunidade**: Fórum para discussões e sugestões
- **Notificações**: Sistema de notificações em tempo real
- **Dark Mode**: Interface com tema claro e escuro

### Para Administradores
- **Dashboard Completo**: Métricas de receita, MRR, churn rate e conversão
- **Gestão de Usuários**: Criação, edição e controle de acesso
- **Gestão de Documentos**: Upload, categorização e publicação
- **Gestão de Planos**: Criação e edição de planos de assinatura
- **Logs de Auditoria**: Rastreamento completo de ações do sistema
- **Analytics**: Gráficos e relatórios de performance

## 🛠️ Tecnologias

### Frontend
- **React 18** com TypeScript
- **Vite** para build e desenvolvimento
- **Tailwind CSS** para estilização
- **shadcn/ui** para componentes
- **React Query** para gerenciamento de estado
- **React Router** para navegação
- **next-themes** para dark mode

### Backend
- **Supabase** como Backend-as-a-Service
- **PostgreSQL** para banco de dados
- **Edge Functions** para lógica de servidor
- **Row Level Security (RLS)** para segurança

### Pagamentos
- **Stripe** para processamento de pagamentos
- **Stripe Checkout** para checkout
- **Stripe Customer Portal** para gestão de assinaturas
- **Webhooks** para sincronização de status

## 📦 Instalação

### Pré-requisitos
- Node.js 18+ 
- npm ou yarn
- Conta no Supabase
- Conta no Stripe

### 1. Clone o repositório
```bash
git clone <repository-url>
cd dr-ho-saas
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure as variáveis de ambiente
Crie um arquivo `.env.local` na raiz do projeto:

```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url_here
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Stripe Configuration
VITE_STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key_here
```

### 4. Configure o Supabase

#### 4.1. Execute as migrations
```bash
npx supabase db push
```

#### 4.2. Configure as Edge Functions
```bash
# Deploy das Edge Functions
npx supabase functions deploy create-checkout-session
npx supabase functions deploy stripe-webhooks
npx supabase functions deploy create-customer-portal
```

#### 4.3. Configure as variáveis de ambiente no Supabase
No dashboard do Supabase, vá para Settings > Edge Functions e adicione:

```env
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
SITE_URL=http://localhost:8080
```

### 5. Configure o Stripe

#### 5.1. Crie produtos e preços
No dashboard do Stripe, crie:
- Um produto para "Doutor HO SaaS"
- Um preço anual (ex: R$ 365,00/ano)

#### 5.2. Configure webhooks (IMPORTANTE)

O webhook é essencial para sincronizar o status das assinaturas entre o Stripe e o banco de dados.

**Passo a passo:**

1. **No Dashboard do Stripe:**
   - Acesse: Developers > Webhooks
   - Clique em "Add endpoint"
   - URL do endpoint: `https://your-project-ref.supabase.co/functions/v1/stripe-webhooks`
     - Substitua `your-project-ref` pelo ID do seu projeto Supabase
   - Descrição: "Dr. HO SaaS - Subscription Webhooks"

2. **Selecione os eventos a serem ouvidos:**
   - `checkout.session.completed` - Quando checkout é concluído
   - `customer.subscription.created` - Quando assinatura é criada
   - `customer.subscription.updated` - Quando assinatura é atualizada
   - `customer.subscription.deleted` - Quando assinatura é cancelada
   - `invoice.payment_succeeded` - Quando pagamento é bem-sucedido
   - `invoice.payment_failed` - Quando pagamento falha

3. **Copie o Webhook Signing Secret:**
   - Após criar o webhook, copie o "Signing secret" (começa com `whsec_`)
   - Adicione no Supabase como variável de ambiente: `STRIPE_WEBHOOK_SECRET`

4. **Teste o webhook:**
   - Use o Stripe CLI para testar localmente:
     ```bash
     stripe listen --forward-to localhost:54321/functions/v1/stripe-webhooks
     ```
   - Ou use o modo de teste no dashboard do Stripe

**⚠️ IMPORTANTE:**
- Sem o webhook configurado, as assinaturas não serão ativadas automaticamente após o pagamento
- O webhook deve estar acessível publicamente (não use localhost em produção)
- Mantenha o `STRIPE_WEBHOOK_SECRET` seguro e nunca o exponha no frontend

### 6. Execute o projeto
```bash
npm run dev
```

O projeto estará disponível em `http://localhost:8080`

## 🏗️ Arquitetura

### Estrutura de Pastas
```
src/
├── components/          # Componentes React
│   ├── admin/          # Componentes administrativos
│   ├── layout/         # Componentes de layout
│   ├── skeletons/      # Componentes de loading
│   └── ui/             # Componentes base (shadcn/ui)
├── contexts/           # Contextos React (Auth, Notifications)
├── hooks/              # Custom hooks
├── lib/                # Utilitários e serviços
│   ├── errors/         # Sistema de tratamento de erros
│   ├── services/       # Camada de serviços
│   └── stripe/         # Configurações do Stripe
├── pages/              # Páginas da aplicação
├── types/              # Definições de tipos TypeScript
└── integrations/       # Integrações externas (Supabase)
```

### Fluxo de Pagamento
1. **Usuário clica em "Assinar"** → Plans.tsx
2. **Chama Edge Function** → create-checkout-session
3. **Redireciona para Stripe Checkout** → Stripe
4. **Pagamento processado** → Stripe
5. **Webhook recebido** → stripe-webhooks
6. **Assinatura ativada** → Banco de dados
7. **Usuário redirecionado** → /plans/success

### Sistema de Segurança
- **Row Level Security (RLS)** no Supabase
- **Validação de assinatura** em todas as rotas protegidas
- **Logs de auditoria** para todas as ações
- **Tratamento de erros** padronizado
- **Rate limiting** nas Edge Functions

## 🔧 Scripts Disponíveis

```bash
# Desenvolvimento
npm run dev

# Build para produção
npm run build

# Preview da build
npm run preview

# Lint
npm run lint
```

## 📊 Monitoramento

### Métricas Disponíveis
- **Receita Total**: Receita acumulada de todas as assinaturas
- **MRR**: Monthly Recurring Revenue
- **Taxa de Conversão**: % de usuários que assinaram
- **Taxa de Churn**: % de cancelamentos
- **ARPU**: Average Revenue Per User
- **LTV**: Lifetime Value

### Logs de Auditoria
- Login/logout de usuários
- Criação/atualização de assinaturas
- Acesso a documentos
- Erros do sistema
- Ações administrativas

## 🚀 Deploy

### Vercel (Recomendado)
1. Conecte o repositório ao Vercel
2. Configure as variáveis de ambiente
3. Deploy automático a cada push

### Netlify
1. Conecte o repositório ao Netlify
2. Configure as variáveis de ambiente
3. Deploy automático a cada push

### Outros
O projeto é uma SPA (Single Page Application) e pode ser deployado em qualquer serviço de hospedagem estática.

## 🔒 Segurança

### Variáveis de Ambiente
- Nunca commite arquivos `.env.local`
- Use variáveis de ambiente no Supabase para dados sensíveis
- Rotacione as chaves do Stripe regularmente

### Banco de Dados
- RLS habilitado em todas as tabelas
- Políticas de acesso baseadas em roles
- Logs de auditoria para todas as operações

### Pagamentos
- Stripe PCI DSS compliant
- Webhooks verificados com assinatura
- Dados de pagamento nunca armazenados localmente

## 🐛 Troubleshooting

### Problemas Comuns

#### 1. Erro de CORS nas Edge Functions
```bash
# Verifique se as Edge Functions estão deployadas
npx supabase functions list
```

#### 2. Webhooks do Stripe não funcionam
- Verifique se a URL do webhook está correta
- Confirme se o webhook secret está configurado
- Teste com Stripe CLI: `stripe listen --forward-to localhost:8080`

#### 3. Erro de autenticação
- Verifique se as chaves do Supabase estão corretas
- Confirme se o RLS está configurado
- Verifique os logs no dashboard do Supabase

### Logs
- **Frontend**: Console do navegador
- **Backend**: Dashboard do Supabase > Logs
- **Stripe**: Dashboard do Stripe > Logs

## 📈 Próximos Passos

### Melhorias Planejadas
- [ ] Testes automatizados (Jest + Testing Library)
- [ ] CI/CD com GitHub Actions
- [ ] Monitoramento com Sentry
- [ ] Analytics com Google Analytics
- [ ] Backup automático do banco
- [ ] CDN para assets estáticos
- [ ] PWA (Progressive Web App)
- [ ] App mobile (React Native)

### Funcionalidades Futuras
- [ ] Múltiplos planos de assinatura
- [ ] Descontos e cupons
- [ ] Relatórios personalizados
- [ ] API pública
- [ ] Integração com ERPs
- [ ] Sistema de afiliados

## 🤝 Contribuição

1. Fork o projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 📞 Suporte

Para suporte técnico ou dúvidas:
- Email: suporte@drho.com.br
- WhatsApp: (11) 99999-9999
- Discord: [Link do servidor]

---

**Dr. HO SaaS** - Transformando a gestão de riscos ocupacionais com tecnologia.


deploy