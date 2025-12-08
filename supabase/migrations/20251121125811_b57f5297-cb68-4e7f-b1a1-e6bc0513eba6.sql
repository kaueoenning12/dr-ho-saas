-- FASE 1: Adicionar política RLS para permitir usuários atualizarem suas próprias assinaturas
-- Isso corrige o problema onde o update direto falhava silenciosamente

CREATE POLICY "Users can update their own subscription"
ON user_subscriptions
FOR UPDATE
TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);