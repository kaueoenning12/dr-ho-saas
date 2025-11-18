import { TrendingUp, TrendingDown, Users, DollarSign, CreditCard, Target, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAdminMetrics } from "@/hooks/useAdminMetrics";
import { StatsCardSkeleton } from "@/components/skeletons/StatsCardSkeleton";

export function AdminMetrics() {
  const { data: metrics, isLoading, error } = useAdminMetrics();

  if (isLoading) {
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
        <StatsCardSkeleton />
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div className="text-center py-8">
        <AlertTriangle className="h-8 w-8 text-red-500 mx-auto mb-2" />
        <p className="text-red-500">Erro ao carregar métricas</p>
      </div>
    );
  }

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value);

  const formatPercentage = (value: number) => 
    `${value.toFixed(1)}%`;

  const getTrendIcon = (value: number) => 
    value >= 0 ? (
      <TrendingUp className="h-4 w-4 text-green-500" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-500" />
    );

  const getTrendColor = (value: number) => 
    value >= 0 ? "text-green-600" : "text-red-600";

  const metricsData = [
    {
      title: "Receita Total",
      value: formatCurrency(metrics.totalRevenue),
      icon: DollarSign,
      trend: 0, // TODO: Calculate trend
      description: "Receita acumulada",
    },
    {
      title: "MRR",
      value: formatCurrency(metrics.mrr),
      icon: CreditCard,
      trend: 0, // TODO: Calculate trend
      description: "Receita recorrente mensal",
    },
    {
      title: "Assinaturas Ativas",
      value: metrics.activeSubscriptions.toString(),
      icon: Users,
      trend: 0, // TODO: Calculate trend
      description: "Usuários com acesso",
    },
    {
      title: "Taxa de Conversão",
      value: formatPercentage(metrics.conversionRate),
      icon: Target,
      trend: 0, // TODO: Calculate trend
      description: "Usuários que assinaram",
    },
    {
      title: "Taxa de Churn",
      value: formatPercentage(metrics.churnRate),
      icon: AlertTriangle,
      trend: -metrics.churnRate, // Negative is good for churn
      description: "Cancelamentos (3 meses)",
    },
    {
      title: "ARPU",
      value: formatCurrency(metrics.averageRevenuePerUser),
      icon: TrendingUp,
      trend: 0, // TODO: Calculate trend
      description: "Receita por usuário",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {metricsData.map((metric, index) => (
        <Card key={index} className="bg-card text-card-foreground border border-border shadow-elegant">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-foreground">
              {metric.title}
            </CardTitle>
            <div className="flex items-center gap-1">
              {getTrendIcon(metric.trend)}
              <metric.icon className="h-4 w-4 text-cyan" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-foreground mb-1">
              {metric.value}
            </div>
            <div className="flex items-center gap-1 text-xs">
              <span className={getTrendColor(metric.trend)}>
                {metric.trend >= 0 ? '+' : ''}{metric.trend.toFixed(1)}%
              </span>
              <span className="text-muted-foreground">
                {metric.description}
              </span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function AdminMetricsSummary() {
  const { data: metrics, isLoading } = useAdminMetrics();

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="border-cyan/10">
          <CardHeader>
            <CardTitle className="text-lg">Resumo Executivo</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="h-4 bg-muted rounded animate-pulse" />
              <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
              <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-cyan/10">
          <CardHeader>
            <CardTitle className="text-lg">Alertas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="h-4 bg-muted rounded animate-pulse" />
              <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!metrics) return null;

  const alerts = [];
  
  if (metrics.churnRate > 5) {
    alerts.push({
      type: "warning",
      message: `Taxa de churn alta: ${metrics.churnRate.toFixed(1)}%`,
    });
  }
  
  if (metrics.conversionRate < 10) {
    alerts.push({
      type: "info",
      message: `Taxa de conversão baixa: ${metrics.conversionRate.toFixed(1)}%`,
    });
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card className="border-cyan/10">
        <CardHeader>
          <CardTitle className="text-lg">Resumo Executivo</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Receita Mensal:</span>
              <span className="font-semibold">
                {new Intl.NumberFormat('pt-BR', { 
                  style: 'currency', 
                  currency: 'BRL' 
                }).format(metrics.mrr)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Usuários Ativos:</span>
              <span className="font-semibold">{metrics.activeSubscriptions}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Novos Usuários (Mês):</span>
              <span className="font-semibold">{metrics.newUsersThisMonth}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">LTV:</span>
              <span className="font-semibold">
                {new Intl.NumberFormat('pt-BR', { 
                  style: 'currency', 
                  currency: 'BRL' 
                }).format(metrics.lifetimeValue)}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-cyan/10">
        <CardHeader>
          <CardTitle className="text-lg">Alertas</CardTitle>
        </CardHeader>
        <CardContent>
          {alerts.length > 0 ? (
            <div className="space-y-2">
              {alerts.map((alert, index) => (
                <div key={index} className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-sm">{alert.message}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-2 text-green-600">
              <div className="h-2 w-2 bg-green-500 rounded-full" />
              <span className="text-sm">Tudo funcionando bem!</span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}










