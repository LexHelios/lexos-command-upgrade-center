import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { from, auth } from '@/integrations/supabase/client';
import { DollarSign, TrendingUp, AlertTriangle, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CostLimits {
  id: string;
  monthly_limit_usd: number;
  current_month_spend: number;
  alert_threshold: number;
  hard_limit_reached: boolean;
  reset_date: string;
}

interface ApiUsage {
  provider: string;
  model: string;
  tokens_used: number;
  cost_usd: number;
  created_at: string;
}

export const CostMonitor: React.FC = () => {
  const [costLimits, setCostLimits] = useState<CostLimits | null>(null);
  const [apiUsage, setApiUsage] = useState<ApiUsage[]>([]);
  const [newLimit, setNewLimit] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchCostData();
  }, [fetchCostData]);

  const fetchCostData = useCallback(async () => {
    try {
      // Get user from localStorage (set during login)
      const userJson = localStorage.getItem('user');
      const user = userJson ? JSON.parse(userJson) : null;
      if (!user) return;

      // Fetch cost limits
      const { data: limits, error: limitsError } = await from('cost_limits')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (limitsError) throw limitsError;
      setCostLimits(limits);

      // Fetch recent API usage
      const { data: usage, error: usageError } = await from('api_usage')
        .select('provider, model, tokens_used, cost_usd, created_at')
        .eq('user_id', user.id)
        .execute();

      if (usageError) throw usageError;
      setApiUsage(usage || []);

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch cost data";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [setCostLimits, setApiUsage, setLoading, toast]);

  const updateLimit = async () => {
    if (!newLimit || isNaN(Number(newLimit))) {
      toast({
        title: "Error",
        description: "Please enter a valid number",
        variant: "destructive",
      });
      return;
    }

    try {
      // Get user from localStorage (set during login)
      const userJson = localStorage.getItem('user');
      const user = userJson ? JSON.parse(userJson) : null;
      if (!user) return;

      const { error } = await from('cost_limits')
        .insert({
          user_id: user.id,
          monthly_limit_usd: Number(newLimit),
          current_month_spend: costLimits?.current_month_spend || 0,
          alert_threshold: 0.8,
          hard_limit_reached: false
        }).execute();

      if (error) throw error;

      toast({
        title: "Success",
        description: "Monthly limit updated successfully",
      });

      await fetchCostData();
      setNewLimit('');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to update limit";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    }
  };

  const getUsagePercentage = () => {
    if (!costLimits) return 0;
    return (costLimits.current_month_spend / costLimits.monthly_limit_usd) * 100;
  };

  const getStatusColor = () => {
    const percentage = getUsagePercentage();
    if (percentage >= 90) return 'destructive';
    if (percentage >= 70) return 'secondary';
    return 'default';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center space-x-2">
        <DollarSign className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Cost Monitor</h1>
      </div>

      {/* Current Usage Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monthly Spend</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${costLimits?.current_month_spend?.toFixed(2) || '0.00'}
            </div>
            <p className="text-xs text-muted-foreground">
              of ${costLimits?.monthly_limit_usd || 500} limit
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usage</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {getUsagePercentage().toFixed(1)}%
            </div>
            <Progress value={getUsagePercentage()} className="mt-2" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <Badge variant={getStatusColor()}>
              {costLimits?.hard_limit_reached ? 'Limit Reached' : 
               getUsagePercentage() >= 90 ? 'Near Limit' :
               getUsagePercentage() >= 70 ? 'Warning' : 'Good'}
            </Badge>
            <p className="text-xs text-muted-foreground mt-2">
              Resets on {costLimits?.reset_date ? new Date(costLimits.reset_date).toLocaleDateString() : 'N/A'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Limit Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Limit Management
          </CardTitle>
          <CardDescription>
            Set your monthly spending limit to control AI API costs
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Input
              type="number"
              placeholder="New monthly limit (USD)"
              value={newLimit}
              onChange={(e) => setNewLimit(e.target.value)}
              className="flex-1"
            />
            <Button onClick={updateLimit} disabled={!newLimit}>
              Update Limit
            </Button>
          </div>
          
          {costLimits?.hard_limit_reached && (
            <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-sm font-medium text-destructive">
                  Monthly limit reached. API calls are temporarily suspended.
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Usage */}
      <Card>
        <CardHeader>
          <CardTitle>Recent API Usage</CardTitle>
          <CardDescription>
            Track your recent AI API calls and costs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {apiUsage.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No API usage recorded yet
              </p>
            ) : (
              apiUsage.map((usage, index) => (
                <div key={index} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex-1">
                    <div className="text-sm font-medium">
                      {usage.provider}/{usage.model}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {usage.tokens_used} tokens • {new Date(usage.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="text-sm font-medium">
                    ${usage.cost_usd.toFixed(4)}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};