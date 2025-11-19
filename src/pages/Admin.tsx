import { useState } from "react";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { MobileSidebar } from "@/components/layout/MobileSidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, FileText, Eye, Heart, Search, UserCheck, UserX, Activity, Star } from "lucide-react";
import { DocumentUploadDialog } from "@/components/admin/DocumentUploadDialog";
import { UserProfileMenu } from "@/components/layout/UserProfileMenu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatTimeAgo } from "@/lib/utils";
import { NotificationManagement } from "@/components/admin/NotificationManagement";
import { CreateUserDialog } from "@/components/admin/CreateUserDialog";
import { UserActionsDropdown } from "@/components/admin/UserActionsDropdown";
import { PlanManagementDialog } from "@/components/admin/PlanManagementDialog";
import { PlanActionsDropdown } from "@/components/admin/PlanActionsDropdown";
import { useDocuments } from "@/hooks/useDocumentsQuery";
import { useUsers } from "@/hooks/useUsersQuery";
import { useDocumentStats, useUserStats } from "@/hooks/useAdminStats";
import { useSubscriptionPlans } from "@/hooks/useSubscriptionsQuery";
import { useRatings } from "@/hooks/useRatingsQuery";
import { StarRating } from "@/components/StarRating";

export default function Admin() {
  const [searchTerm, setSearchTerm] = useState("");
  const [ratingsSearchTerm, setRatingsSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("stats");

  const { data: documents = [], isLoading: documentsLoading, refetch: refetchDocuments } = useDocuments();
  const { data: users = [], isLoading: usersLoading, refetch: refetchUsers } = useUsers();
  const { data: plans = [], isLoading: plansLoading, refetch: refetchPlans } = useSubscriptionPlans();
  const { data: ratings = [], isLoading: ratingsLoading } = useRatings();
  const { data: documentStats } = useDocumentStats();
  const { data: userStats } = useUserStats();

  const totalViews = (documentStats as any)?.total_views || 0;
  const totalLikes = (documentStats as any)?.total_likes || 0;
  const totalDocuments = (documentStats as any)?.total_documents || documents.length;
  
  const activeUsers = users.filter(u => {
    const subscription = u.user_subscriptions?.[0];
    return subscription?.status === "active";
  }).length;
  
  const inactiveUsers = users.filter(u => {
    const subscription = u.user_subscriptions?.[0];
    return !subscription || subscription.status !== "active";
  }).length;

  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRatings = ratings.filter(rating => {
    const searchLower = ratingsSearchTerm.toLowerCase();
    return (
      rating.profile?.name.toLowerCase().includes(searchLower) ||
      rating.profile?.email.toLowerCase().includes(searchLower) ||
      rating.document?.title.toLowerCase().includes(searchLower) ||
      rating.document?.category.toLowerCase().includes(searchLower)
    );
  });

  // Calcular estatísticas de avaliações
  const totalRatings = ratings.length;
  const averageRating = totalRatings > 0
    ? (ratings.reduce((sum, r) => sum + r.rating, 0) / totalRatings).toFixed(1)
    : "0.0";
  const ratingDistribution = [1, 2, 3, 4, 5].map(star => ({
    stars: star,
    count: ratings.filter(r => r.rating === star).length,
  }));

  const stats = [
    { label: "Total de Documentos", value: totalDocuments, icon: FileText },
    { label: "Total de Visualizações", value: totalViews, icon: Eye },
    { label: "Total de Curtidas", value: totalLikes, icon: Heart },
    { label: "Usuários Ativos", value: activeUsers, icon: Users },
  ];

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <main className="flex-1 min-w-0 overflow-x-hidden">
          <header className="border-b border-cyan/20 bg-background/90 backdrop-blur-lg supports-[backdrop-filter]:bg-background/90 sticky top-0 z-10 shadow-sm">
            <div className="flex items-center justify-between gap-3 sm:gap-4 px-3 sm:px-6 py-4">
              <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                <MobileSidebar />
                <SidebarTrigger className="hidden md:flex" />
                <h1 className="text-[16px] sm:text-[20px] font-semibold tracking-tight text-navy truncate">Painel Administrativo</h1>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <DocumentUploadDialog onSuccess={refetchDocuments} />
                <UserProfileMenu />
              </div>
            </div>
          </header>

          <div className="px-3 sm:px-6 py-4 sm:py-8">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-1 mb-6 h-auto p-1">
                <TabsTrigger value="stats" className="text-xs sm:text-sm px-2 sm:px-3 transition-all duration-200 hover:scale-105 active:scale-95">Estatísticas</TabsTrigger>
                <TabsTrigger value="documents" className="text-xs sm:text-sm px-2 sm:px-3 transition-all duration-200 hover:scale-105 active:scale-95">Documentos</TabsTrigger>
                <TabsTrigger value="users" className="text-xs sm:text-sm px-2 sm:px-3 transition-all duration-200 hover:scale-105 active:scale-95">Usuários</TabsTrigger>
                <TabsTrigger value="plans" className="text-xs sm:text-sm px-2 sm:px-3 transition-all duration-200 hover:scale-105 active:scale-95">Planos</TabsTrigger>
                <TabsTrigger value="ratings" className="text-xs sm:text-sm px-2 sm:px-3 transition-all duration-200 hover:scale-105 active:scale-95">Avaliações</TabsTrigger>
                <TabsTrigger value="notifications" className="text-xs sm:text-sm px-2 sm:px-3 transition-all duration-200 hover:scale-105 active:scale-95 col-span-2 sm:col-span-1">Notificações</TabsTrigger>
              </TabsList>

              {/* Tab: Estatísticas */}
              <TabsContent value="stats" className="mt-0 animate-fade-in">
                <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
                  {stats.map((stat, index) => (
                    <Card
                      key={stat.label}
                      className={`bg-card text-card-foreground border border-border shadow-elegant hover:shadow-cyan hover:border-cyan/30 hover:scale-105 active:scale-100 transition-all duration-300 cursor-default animate-fade-in-up stagger-${index + 1}`}
                    >
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 sm:pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
                        <CardTitle className="text-[12px] sm:text-[13px] font-medium text-muted-foreground">
                          {stat.label}
                        </CardTitle>
                        <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-cyan/10 flex items-center justify-center shrink-0 group-hover:bg-cyan/20 transition-colors">
                          <stat.icon className="h-4 w-4 sm:h-5 sm:w-5 text-cyan stroke-[1.5]" />
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                        <div className="text-[24px] sm:text-[28px] font-semibold tracking-tight text-foreground">{stat.value}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <Card className="border border-cyan/10 shadow-elegant">
                    <CardHeader className="px-4 sm:px-6 py-4 border-b border-cyan/10">
                      <CardTitle className="text-[16px] sm:text-[18px] font-semibold text-navy flex items-center gap-2">
                        <UserCheck className="h-5 w-5 text-cyan" />
                        Usuários Ativos
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="text-4xl font-bold text-cyan">{activeUsers}</div>
                      <p className="text-sm text-muted-foreground mt-2">Usuários com acesso ativo</p>
                    </CardContent>
                  </Card>

                  <Card className="border border-cyan/10 shadow-elegant">
                    <CardHeader className="px-4 sm:px-6 py-4 border-b border-cyan/10">
                      <CardTitle className="text-[16px] sm:text-[18px] font-semibold text-navy flex items-center gap-2">
                        <UserX className="h-5 w-5 text-red-500" />
                        Usuários Inativos
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <div className="text-4xl font-bold text-red-500">{inactiveUsers}</div>
                      <p className="text-sm text-muted-foreground mt-2">Usuários com assinatura expirada</p>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              {/* Tab: Documentos */}
              <TabsContent value="documents" className="mt-0">
                <Card className="border border-cyan/10 shadow-elegant">
                  <CardHeader className="px-4 sm:px-6 py-4 sm:py-5 border-b border-cyan/10">
                    <CardTitle className="text-[16px] sm:text-[18px] font-semibold text-navy">Documentos Publicados</CardTitle>
                    <CardDescription className="text-[13px] sm:text-[14px] font-light mt-1 text-navy/60">
                      Gerencie os documentos disponíveis na plataforma
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 sm:p-6">
                    {documentsLoading ? (
                      <div className="text-center py-10">
                        <div className="inline-block h-6 w-6 animate-spin rounded-full border-3 border-solid border-cyan border-r-transparent"></div>
                        <p className="text-muted-foreground text-sm mt-2">Carregando...</p>
                      </div>
                    ) : (
                      <div className="space-y-2 sm:space-y-3">
                        {documents.map((doc) => (
                          <div
                            key={doc.id}
                            className="flex items-center justify-between p-3 sm:p-4 border border-cyan/10 rounded-lg hover:bg-cyan/5 hover:border-cyan/30 transition-all duration-200"
                          >
                            <div className="flex-1 min-w-0 mr-3 sm:mr-4">
                              <p className="font-medium text-[14px] sm:text-[15px] text-foreground truncate">{doc.title}</p>
                              <p className="text-[12px] sm:text-[13px] text-muted-foreground font-light mt-0.5">{doc.category}</p>
                            </div>
                            <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                            <Badge variant="outline" className="bg-cyan/10 text-cyan border-cyan/30 text-[12px]">
                                {doc.is_published ? "Publicado" : "Rascunho"}
                              </Badge>
                            </div>
                          </div>
                        ))}
                        {documents.length === 0 && (
                          <p className="text-center text-muted-foreground py-10">Nenhum documento encontrado</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab: Usuários */}
              <TabsContent value="users" className="mt-0">
                <Card className="border border-cyan/10 shadow-elegant">
                  <CardHeader className="px-4 sm:px-6 py-4 border-b border-cyan/10">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <CardTitle className="text-[16px] sm:text-[18px] font-semibold text-navy">
                          Gerenciamento de Usuários
                        </CardTitle>
                        <CardDescription className="text-[13px] sm:text-[14px] font-light mt-1 text-navy/60">
                          Visualize e gerencie todos os usuários da plataforma
                        </CardDescription>
                      </div>
                      <div className="flex items-center gap-2">
                        <CreateUserDialog onSuccess={() => refetchUsers()} />
                        <div className="relative w-full sm:w-64">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                          <Input
                            placeholder="Buscar usuário..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-9"
                          />
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {usersLoading ? (
                      <div className="text-center py-10">
                        <div className="inline-block h-6 w-6 animate-spin rounded-full border-3 border-solid border-cyan border-r-transparent"></div>
                        <p className="text-muted-foreground text-sm mt-2">Carregando usuários...</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table className="min-w-full">
                          <TableHeader>
                            <TableRow>
                              <TableHead className="min-w-[200px]">Usuário</TableHead>
                              <TableHead className="min-w-[100px]">Função</TableHead>
                              <TableHead className="min-w-[80px]">Status</TableHead>
                              <TableHead className="min-w-[120px] hidden md:table-cell">Criado em</TableHead>
                              <TableHead className="w-[60px]">Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredUsers.map((user) => {
                              const role = user.user_roles?.[0]?.role || 'user';
                              const subscription = user.user_subscriptions?.[0];
                              const isActive = subscription?.status === 'active';
                              
                              return (
                                <TableRow key={user.id} className="hover:bg-cyan/5">
                                  <TableCell className="font-medium">
                                    <div>
                                      <p className="font-medium text-sm text-navy">{user.name}</p>
                                      <p className="text-xs text-muted-foreground">{user.email}</p>
                                    </div>
                                  </TableCell>
                                  <TableCell>
                                    <Badge 
                                      variant="outline" 
                                      className={`${
                                        role === 'admin' 
                                          ? 'bg-purple-500/10 text-purple-600 border-purple-500/30'
                                          : 'bg-cyan/10 text-cyan border-cyan/30'
                                      }`}
                                    >
                                      {role === 'admin' ? 'Admin' : 'Usuário'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell>
                                    <Badge 
                                      variant="outline"
                                      className={`${
                                        isActive
                                          ? 'bg-green-500/10 text-green-600 border-green-500/30' 
                                          : 'bg-red-500/10 text-red-600 border-red-500/30'
                                      }`}
                                    >
                                      {isActive ? 'Ativo' : 'Inativo'}
                                    </Badge>
                                  </TableCell>
                                  <TableCell className="hidden md:table-cell">
                                    <span className="text-sm text-muted-foreground">
                                      {new Date(user.created_at).toLocaleDateString('pt-BR')}
                                    </span>
                                  </TableCell>
                                  <TableCell>
                                    <UserActionsDropdown
                                      userId={user.user_id}
                                      userName={user.name}
                                      currentRole={role}
                                      onSuccess={refetchUsers}
                                    />
                                  </TableCell>
                                </TableRow>
                              );
                            })}
                          </TableBody>
                        </Table>
                        {filteredUsers.length === 0 && (
                          <p className="text-center text-muted-foreground py-10">Nenhum usuário encontrado</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab: Planos */}
              <TabsContent value="plans" className="mt-0">
                <Card className="border border-cyan/10 shadow-elegant">
                  <CardHeader className="px-4 sm:px-6 py-4 sm:py-5 border-b border-cyan/10 bg-gradient-subtle">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-[16px] sm:text-[18px] font-semibold text-navy">
                          Gerenciamento de Planos
                        </CardTitle>
                        <CardDescription className="text-[13px] sm:text-[14px] font-light mt-1 text-navy/60">
                          Crie e gerencie planos de assinatura
                        </CardDescription>
                      </div>
                      <PlanManagementDialog onSuccess={() => refetchPlans()} />
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {plansLoading ? (
                      <div className="text-center py-10">
                        <div className="inline-block h-6 w-6 animate-spin rounded-full border-3 border-solid border-cyan border-r-transparent"></div>
                        <p className="text-muted-foreground text-sm mt-2">Carregando planos...</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table className="min-w-full">
                          <TableHeader>
                            <TableRow>
                              <TableHead>Plano</TableHead>
                              <TableHead>Preço</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead className="hidden md:table-cell">Criado em</TableHead>
                              <TableHead className="w-[120px]">Ações</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {plans.map((plan) => (
                              <TableRow key={plan.id} className="hover:bg-cyan/5">
                                <TableCell className="font-medium">
                                  <div>
                                    <p className="font-medium text-sm text-navy">{plan.name}</p>
                                    <p className="text-xs text-muted-foreground">{plan.description}</p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <span className="font-semibold text-navy">R$ {plan.price.toFixed(2)}</span>
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline" className={plan.is_active ? 'bg-green-500/10 text-green-600 border-green-500/30' : 'bg-red-500/10 text-red-600 border-red-500/30'}>
                                    {plan.is_active ? 'Ativo' : 'Inativo'}
                                  </Badge>
                                </TableCell>
                                <TableCell className="hidden md:table-cell">
                                  <span className="text-sm text-muted-foreground">
                                    {new Date(plan.created_at).toLocaleDateString('pt-BR')}
                                  </span>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <PlanManagementDialog plan={plan} onSuccess={() => refetchPlans()} />
                                    <PlanActionsDropdown
                                      planId={plan.id}
                                      planName={plan.name}
                                      onSuccess={() => refetchPlans()}
                                    />
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {plans.length === 0 && (
                          <p className="text-center text-muted-foreground py-10">Nenhum plano cadastrado</p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab: Avaliações */}
              <TabsContent value="ratings" className="mt-0">
                <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
                  <Card className="border border-cyan/10 shadow-elegant">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 sm:pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
                      <CardTitle className="text-[12px] sm:text-[13px] font-medium text-muted-foreground">
                        Total de Avaliações
                      </CardTitle>
                      <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-cyan/10 flex items-center justify-center shrink-0">
                        <Star className="h-4 w-4 sm:h-5 sm:w-5 text-cyan stroke-[1.5]" />
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                      <div className="text-[24px] sm:text-[28px] font-semibold tracking-tight text-foreground">{totalRatings}</div>
                    </CardContent>
                  </Card>

                  <Card className="border border-cyan/10 shadow-elegant">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 sm:pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
                      <CardTitle className="text-[12px] sm:text-[13px] font-medium text-muted-foreground">
                        Média de Avaliações
                      </CardTitle>
                      <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-cyan/10 flex items-center justify-center shrink-0">
                        <Star className="h-4 w-4 sm:h-5 sm:w-5 text-cyan stroke-[1.5] fill-cyan" />
                      </div>
                    </CardHeader>
                    <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                      <div className="text-[24px] sm:text-[28px] font-semibold tracking-tight text-foreground">{averageRating}</div>
                    </CardContent>
                  </Card>

                  {ratingDistribution.slice(0, 2).map((dist) => (
                    <Card key={dist.stars} className="border border-cyan/10 shadow-elegant">
                      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 sm:pb-3 px-4 sm:px-6 pt-4 sm:pt-6">
                        <CardTitle className="text-[12px] sm:text-[13px] font-medium text-muted-foreground">
                          {dist.stars} Estrela{dist.stars > 1 ? "s" : ""}
                        </CardTitle>
                        <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg bg-cyan/10 flex items-center justify-center shrink-0">
                          <Star className="h-4 w-4 sm:h-5 sm:w-5 text-cyan stroke-[1.5]" />
                        </div>
                      </CardHeader>
                      <CardContent className="px-4 sm:px-6 pb-4 sm:pb-6">
                        <div className="text-[24px] sm:text-[28px] font-semibold tracking-tight text-foreground">{dist.count}</div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                <Card className="border border-cyan/10 shadow-elegant">
                  <CardHeader className="px-4 sm:px-6 py-4 border-b border-cyan/10">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                      <div>
                        <CardTitle className="text-[16px] sm:text-[18px] font-semibold text-navy">
                          Todas as Avaliações
                        </CardTitle>
                        <CardDescription className="text-[13px] sm:text-[14px] font-light mt-1 text-navy/60">
                          Visualize todas as avaliações feitas pelos usuários nos documentos premium
                        </CardDescription>
                      </div>
                      <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="Buscar por usuário ou documento..."
                          value={ratingsSearchTerm}
                          onChange={(e) => setRatingsSearchTerm(e.target.value)}
                          className="pl-9"
                        />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    {ratingsLoading ? (
                      <div className="text-center py-10">
                        <div className="inline-block h-6 w-6 animate-spin rounded-full border-3 border-solid border-cyan border-r-transparent"></div>
                        <p className="text-muted-foreground text-sm mt-2">Carregando avaliações...</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table className="min-w-full">
                          <TableHeader>
                            <TableRow>
                              <TableHead className="min-w-[200px]">Usuário</TableHead>
                              <TableHead className="min-w-[200px]">Documento</TableHead>
                              <TableHead className="min-w-[150px]">Avaliação</TableHead>
                              <TableHead className="min-w-[120px] hidden md:table-cell">Data</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {filteredRatings.map((rating) => (
                              <TableRow key={rating.id} className="hover:bg-cyan/5">
                                <TableCell className="font-medium">
                                  <div>
                                    <p className="font-medium text-sm text-navy">{rating.profile?.name || "Usuário"}</p>
                                    <p className="text-xs text-muted-foreground">{rating.profile?.email || "Email não disponível"}</p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div>
                                    <p className="font-medium text-sm text-navy">{rating.document?.title || "Documento"}</p>
                                    <p className="text-xs text-muted-foreground">{rating.document?.category || ""}</p>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2">
                                    <StarRating rating={rating.rating} readonly size="sm" />
                                    <span className="text-sm text-muted-foreground">({rating.rating}/5)</span>
                                  </div>
                                </TableCell>
                                <TableCell className="hidden md:table-cell">
                                  <span className="text-sm text-muted-foreground">
                                    {rating.unlocked_at
                                      ? new Date(rating.unlocked_at).toLocaleDateString('pt-BR', {
                                          day: '2-digit',
                                          month: '2-digit',
                                          year: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })
                                      : rating.created_at
                                      ? new Date(rating.created_at).toLocaleDateString('pt-BR', {
                                          day: '2-digit',
                                          month: '2-digit',
                                          year: 'numeric',
                                          hour: '2-digit',
                                          minute: '2-digit',
                                        })
                                      : '-'}
                                  </span>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                        {filteredRatings.length === 0 && (
                          <p className="text-center text-muted-foreground py-10">
                            {ratingsSearchTerm ? "Nenhuma avaliação encontrada com os filtros aplicados" : "Nenhuma avaliação encontrada"}
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tab: Notifications */}
              <TabsContent value="notifications" className="mt-0">
                <NotificationManagement />
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
