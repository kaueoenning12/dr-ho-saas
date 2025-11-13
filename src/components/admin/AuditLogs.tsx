import { useState } from "react";
import { Search, Filter, Download, Eye, User, Calendar, Shield } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuditLogs, useAuditLogStats } from "@/hooks/useAuditLogs";
import { formatDateBR } from "@/lib/utils";
import { UserTableSkeleton } from "@/components/skeletons/UserTableSkeleton";

export function AuditLogs() {
  const [filters, setFilters] = useState({
    action: "",
    resourceType: "",
    startDate: "",
    endDate: "",
    limit: 50,
    offset: 0,
  });

  const { data: logsData, isLoading, error } = useAuditLogs(filters);
  const { data: stats } = useAuditLogStats();

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      offset: 0, // Reset offset when filters change
    }));
  };

  const getActionBadgeVariant = (action: string) => {
    if (action.includes('login') || action.includes('created')) return 'default';
    if (action.includes('error') || action.includes('failed')) return 'destructive';
    if (action.includes('updated') || action.includes('modified')) return 'secondary';
    if (action.includes('deleted') || action.includes('cancelled')) return 'outline';
    return 'default';
  };

  const getActionIcon = (action: string) => {
    if (action.includes('login')) return <User className="h-3 w-3" />;
    if (action.includes('error')) return <Shield className="h-3 w-3" />;
    if (action.includes('created') || action.includes('updated')) return <Calendar className="h-3 w-3" />;
    return <Eye className="h-3 w-3" />;
  };

  const formatAction = (action: string) => {
    return action
      .replace(/_/g, ' ')
      .replace(/\b\w/g, l => l.toUpperCase());
  };

  if (isLoading) {
    return (
      <Card className="border-cyan/10 shadow-elegant">
        <CardHeader>
          <CardTitle>Logs de Auditoria</CardTitle>
          <CardDescription>Registro de todas as ações do sistema</CardDescription>
        </CardHeader>
        <CardContent>
          <UserTableSkeleton rows={10} />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-500/20">
        <CardContent className="text-center py-8">
          <Shield className="h-8 w-8 text-red-500 mx-auto mb-2" />
          <p className="text-red-500">Erro ao carregar logs de auditoria</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-cyan/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-cyan" />
                <span className="text-sm font-medium">Total de Logs</span>
              </div>
              <p className="text-2xl font-bold">{stats.totalLogs}</p>
            </CardContent>
          </Card>
          <Card className="border-cyan/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium">Hoje</span>
              </div>
              <p className="text-2xl font-bold">{stats.logsToday}</p>
            </CardContent>
          </Card>
          <Card className="border-cyan/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-blue-500" />
                <span className="text-sm font-medium">Esta Semana</span>
              </div>
              <p className="text-2xl font-bold">{stats.logsThisWeek}</p>
            </CardContent>
          </Card>
          <Card className="border-cyan/10">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-purple-500" />
                <span className="text-sm font-medium">Este Mês</span>
              </div>
              <p className="text-2xl font-bold">{stats.logsThisMonth}</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card className="border-cyan/10">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Ação</label>
              <Select value={filters.action} onValueChange={(value) => handleFilterChange('action', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as ações" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas as ações</SelectItem>
                  <SelectItem value="login">Login</SelectItem>
                  <SelectItem value="logout">Logout</SelectItem>
                  <SelectItem value="subscription_created">Assinatura Criada</SelectItem>
                  <SelectItem value="subscription_updated">Assinatura Atualizada</SelectItem>
                  <SelectItem value="document_accessed">Documento Acessado</SelectItem>
                  <SelectItem value="error_occurred">Erro Ocorreu</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Tipo de Recurso</label>
              <Select value={filters.resourceType} onValueChange={(value) => handleFilterChange('resourceType', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Todos os tipos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos os tipos</SelectItem>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="subscription">Assinatura</SelectItem>
                  <SelectItem value="document">Documento</SelectItem>
                  <SelectItem value="error">Erro</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Data Inicial</label>
              <Input
                type="date"
                value={filters.startDate}
                onChange={(e) => handleFilterChange('startDate', e.target.value)}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Data Final</label>
              <Input
                type="date"
                value={filters.endDate}
                onChange={(e) => handleFilterChange('endDate', e.target.value)}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card className="border-cyan/10 shadow-elegant">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Logs de Auditoria</CardTitle>
              <CardDescription>
                {logsData?.total || 0} registros encontrados
              </CardDescription>
            </div>
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data/Hora</TableHead>
                  <TableHead>Usuário</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Recurso</TableHead>
                  <TableHead>IP</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logsData?.logs.map((log) => (
                  <TableRow key={log.id}>
                    <TableCell>
                      <div className="text-sm">
                        {formatDateBR(log.created_at)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm">
                          {log.user_id ? log.user_id.slice(0, 8) + '...' : 'Sistema'}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getActionBadgeVariant(log.action)} className="flex items-center gap-1 w-fit">
                        {getActionIcon(log.action)}
                        {formatAction(log.action)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {log.resource_type}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {log.resource_id || '-'}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        {log.ip_address || '-'}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {(!logsData?.logs || logsData.logs.length === 0) && (
              <div className="text-center py-8">
                <Shield className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-muted-foreground">Nenhum log encontrado</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}












