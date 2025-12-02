# DR HO - Plataforma de Relatórios de Riscos Ocupacionais

Uma plataforma SaaS completa para gestão de relatórios técnicos de riscos ocupacionais com sistema de assinatura anual via Stripe.

## 🚀 Funcionalidades

### Para Usuários
- **Plano Premium**: Acesso anual completo por R$ 478,80/ano (menos de R$ 1,31/dia)
- **Relatórios Técnicos**: Documentos detalhados sobre riscos ocupacionais e NRs
- **Sistema de Desbloqueio**: Documentos premium requerem avaliação para acesso
- **Busca Avançada**: Pesquisa por categoria, palavras-chave e filtros
- **Navegação por Pastas**: Estrutura hierárquica de documentos
- **Favoritos**: Sistema de curtidas para documentos
- **Comunidade**: Fórum para discussões, dúvidas e sugestões
- **Notificações**: Sistema de notificações em tempo real
- **Dark Mode**: Interface com tema claro e escuro responsivo

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

Para configuração completa do Stripe, consulte o guia detalhado: **[CONFIGURAR_STRIPE.md](./CONFIGURAR_STRIPE.md)**

Crie um arquivo `.env.local` na raiz do projeto:

```env
# Supabase Configuration
VITE_SUPABASE_URL=https://jjkptijbjyxbrgbxwgxf.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Stripe Configuration (Test Mode)
VITE_STRIPE_PUBLISHABLE_KEY=pk_test_51STMbERpUByu4yV90CWF3VrHIkIb4ScKLXeapOVbkELDmHC1gGZGBg9OUbLF86Vz3NAfYfkspILIRFazoleN9Yxi00eybx98Xc
VITE_STRIPE_PRODUCT_ID=prod_TSWvb9EnmOlvLY
```

**Plano Configurado:**
- **Nome**: DR HO - PREMIUM
- **Preço**: R$ 478,80/ano (12x R$ 39,90)
- **Product ID**: `prod_TSWvb9EnmOlvLY`
- **Price ID**: `price_1SVbrGRpUByu4yV90IEbFTqe`

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

#### 4.3. Configure os Secrets no Supabase
No dashboard do Supabase, vá para Settings > Vault (Secrets) e adicione:

```env
STRIPE_SECRET_KEY=sk_test_51STMbERpUByu4yV9TtZl6lTugyByVyVg6iHSgYuEOEHNkiKwlsQcA1fcBNtSyd7OVgwMJ3H3KFfRFJp2RX8iUDna00XjPz7iJ8
STRIPE_WEBHOOK_SECRET=whsec_... (obtido após configurar webhook)
SITE_URL=http://localhost:8080
```

### 5. Configure o Stripe

#### 5.1. Produto já configurado
O plano **DR HO - PREMIUM** já está configurado no Stripe (Test Mode):
- **Product ID**: `prod_TSWvb9EnmOlvLY`
- **Price ID**: `price_1SVbrGRpUByu4yV90IEbFTqe`
- **Preço**: R$ 478,80/ano (recorrente)

**Para criar novos produtos:**
1. Acesse https://dashboard.stripe.com/test/products
2. Clique em "+ Add product"
3. Configure nome, descrição e preço recorrente
4. Atualize a tabela `subscription_plans` no banco de dados com os novos IDs

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
1. **Usuário clica em "Assinar"** → `Plans.tsx`
2. **Validação do plano** → Verifica `stripe_product_id` e `stripe_price_id`
3. **Chama Edge Function** → `create-checkout-session`
4. **Cria sessão no Stripe** → Usando `price_id` do banco
5. **Redireciona para Stripe Checkout** → Usuário paga
6. **Pagamento processado** → Stripe
7. **Webhook recebido** → `stripe-webhooks`
8. **Assinatura ativada** → Atualiza `user_subscriptions`
9. **Usuário redirecionado** → `/plans/success`

### Sistema de Documentos Premium
1. **Documento marcado como premium** → `is_premium = true`
2. **Usuário sem assinatura** → Vê preview borrado
3. **Usuário avalia documento** → Insere rating 1-5 estrelas
4. **Registro de desbloqueio** → Salvo em `document_unlocks`
5. **Acesso liberado** → Usuário visualiza PDF completo via URL assinada

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

#### 3. Erro "CheckoutInitError: apiKey is not set"
- Verifique se o Product ID e Price ID existem no Stripe (Test Mode)
- Confirme se os IDs no banco de dados estão corretos
- Verifique se o produto está ativo (não arquivado)
- Use cartão de teste: `4242 4242 4242 4242`

#### 4. Erro de autenticação
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
- WhatsApp: Integração configurada via widget
- GitHub Issues: Para bugs e feature requests

## 🔑 Credenciais de Teste

### Stripe Test Mode
```env
Publishable Key: pk_test_51STMbERpUByu4yV90CWF3VrHIkIb4ScKLXeapOVbkELDmHC1gGZGBg9OUbLF86Vz3NAfYfkspILIRFazoleN9Yxi00eybx98Xc
Secret Key: sk_test_51STMbERpUByu4yV9TtZl6lTugyByVyVg6iHSgYuEOEHNkiKwlsQcA1fcBNtSyd7OVgwMJ3H3KFfRFJp2RX8iUDna00XjPz7iJ8
Product ID: prod_TSWvb9EnmOlvLY
Price ID: price_1SVbrGRpUByu4yV90IEbFTqe
```

### Cartão de Teste Stripe
```
Número: 4242 4242 4242 4242
Validade: 12/25 (qualquer data futura)
CVV: 123 (qualquer 3 dígitos)
CEP: 01310-100 (qualquer CEP válido)
```

---

**DR HO** - Transformando a gestão de riscos ocupacionais com tecnologia.