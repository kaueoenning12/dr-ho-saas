import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AdminMetrics {
  totalRevenue: number;
  monthlyRevenue: number;
  mrr: number; // Monthly Recurring Revenue
  churnRate: number;
  conversionRate: number;
  activeSubscriptions: number;
  totalUsers: number;
  newUsersThisMonth: number;
  averageRevenuePerUser: number;
  lifetimeValue: number;
}

export interface RevenueData {
  month: string;
  revenue: number;
  subscriptions: number;
}

export interface UserGrowthData {
  month: string;
  newUsers: number;
  totalUsers: number;
}

export function useAdminMetrics() {
  return useQuery({
    queryKey: ["admin-metrics"],
    queryFn: async (): Promise<AdminMetrics> => {
      // Get subscription data
      const { data: subscriptions, error: subError } = await supabase
        .from('user_subscriptions')
        .select(`
          id,
          status,
          started_at,
          expires_at,
          subscription_plans (price)
        `);

      if (subError) {
        throw new Error(`Failed to fetch subscriptions: ${subError.message}`);
      }

      // Get user data
      const { data: users, error: userError } = await supabase
        .from('profiles')
        .select('created_at');

      if (userError) {
        throw new Error(`Failed to fetch users: ${userError.message}`);
      }

      // Calculate metrics
      const now = new Date();
      const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1);

      // Active subscriptions
      const activeSubscriptions = subscriptions?.filter(sub => 
        sub.status === 'active' && 
        (!sub.expires_at || new Date(sub.expires_at) > now)
      ) || [];

      // Total revenue (all time)
      const totalRevenue = activeSubscriptions.reduce((sum, sub) => 
        sum + (sub.subscription_plans?.price || 0), 0
      );

      // Monthly revenue (this month)
      const monthlyRevenue = activeSubscriptions
        .filter(sub => new Date(sub.started_at) >= thisMonth)
        .reduce((sum, sub) => sum + (sub.subscription_plans?.price || 0), 0);

      // MRR (Monthly Recurring Revenue)
      const mrr = activeSubscriptions.reduce((sum, sub) => 
        sum + ((sub.subscription_plans?.price || 0) / 12), 0
      );

      // Churn rate (last 3 months)
      const cancelledLast3Months = subscriptions?.filter(sub => 
        sub.status === 'cancelled' && 
        new Date(sub.started_at) >= threeMonthsAgo
      ).length || 0;

      const activeAtStartOfPeriod = subscriptions?.filter(sub => 
        sub.status === 'active' && 
        new Date(sub.started_at) < threeMonthsAgo
      ).length || 0;

      const churnRate = activeAtStartOfPeriod > 0 
        ? (cancelledLast3Months / activeAtStartOfPeriod) * 100 
        : 0;

      // Conversion rate (users with subscriptions / total users)
      const totalUsers = users?.length || 0;
      const conversionRate = totalUsers > 0 
        ? (activeSubscriptions.length / totalUsers) * 100 
        : 0;

      // New users this month
      const newUsersThisMonth = users?.filter(user => 
        new Date(user.created_at) >= thisMonth
      ).length || 0;

      // Average Revenue Per User (ARPU)
      const averageRevenuePerUser = totalUsers > 0 
        ? totalRevenue / totalUsers 
        : 0;

      // Lifetime Value (LTV) - simplified calculation
      const lifetimeValue = averageRevenuePerUser * 12; // Assuming 1 year average

      return {
        totalRevenue,
        monthlyRevenue,
        mrr,
        churnRate,
        conversionRate,
        activeSubscriptions: activeSubscriptions.length,
        totalUsers,
        newUsersThisMonth,
        averageRevenuePerUser,
        lifetimeValue,
      };
    },
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes
  });
}

export function useRevenueData() {
  return useQuery({
    queryKey: ["admin-revenue-data"],
    queryFn: async (): Promise<RevenueData[]> => {
      const { data: subscriptions, error } = await supabase
        .from('user_subscriptions')
        .select(`
          started_at,
          subscription_plans (price)
        `)
        .eq('status', 'active');

      if (error) {
        throw new Error(`Failed to fetch revenue data: ${error.message}`);
      }

      // Group by month for last 12 months
      const monthlyData: Record<string, { revenue: number; subscriptions: number }> = {};
      
      subscriptions?.forEach(sub => {
        const date = new Date(sub.started_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { revenue: 0, subscriptions: 0 };
        }
        
        monthlyData[monthKey].revenue += sub.subscription_plans?.price || 0;
        monthlyData[monthKey].subscriptions += 1;
      });

      // Convert to array and sort by month
      return Object.entries(monthlyData)
        .map(([month, data]) => ({
          month,
          revenue: data.revenue,
          subscriptions: data.subscriptions,
        }))
        .sort((a, b) => a.month.localeCompare(b.month));
    },
  });
}

export function useUserGrowthData() {
  return useQuery({
    queryKey: ["admin-user-growth"],
    queryFn: async (): Promise<UserGrowthData[]> => {
      const { data: users, error } = await supabase
        .from('profiles')
        .select('created_at')
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(`Failed to fetch user growth data: ${error.message}`);
      }

      // Group by month for last 12 months
      const monthlyData: Record<string, { newUsers: number; totalUsers: number }> = {};
      let cumulativeUsers = 0;
      
      users?.forEach(user => {
        const date = new Date(user.created_at);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        
        if (!monthlyData[monthKey]) {
          monthlyData[monthKey] = { newUsers: 0, totalUsers: 0 };
        }
        
        monthlyData[monthKey].newUsers += 1;
        cumulativeUsers += 1;
        monthlyData[monthKey].totalUsers = cumulativeUsers;
      });

      // Convert to array and sort by month
      return Object.entries(monthlyData)
        .map(([month, data]) => ({
          month,
          newUsers: data.newUsers,
          totalUsers: data.totalUsers,
        }))
        .sort((a, b) => a.month.localeCompare(b.month));
    },
  });
}












