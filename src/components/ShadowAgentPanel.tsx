
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useUserPermissions } from '@/hooks/useUserPermissions';
import { useToast } from '@/hooks/use-toast';
import { Shield, UserCheck, AlertTriangle } from 'lucide-react';
import { ShadowAgentChat } from './ShadowAgentChat';

export const ShadowAgentPanel: React.FC = () => {
  const { permissions, hasShadowAccess, isAdmin, grantShadowAccess } = useUserPermissions();
  const { toast } = useToast();
  const [isPasswordVerified, setIsPasswordVerified] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [expirationDays, setExpirationDays] = useState('7');

  const handlePasswordSubmit = () => {
    if (passwordInput === 'Shadow') {
      setIsPasswordVerified(true);
      setPasswordInput('');
    } else {
      toast({
        title: "Access Denied",
        description: "Incorrect password",
        variant: "destructive",
      });
      setPasswordInput('');
    }
  };

  if (!hasShadowAccess) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="border-destructive bg-destructive/5">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mx-auto">
                <Shield className="h-8 w-8 text-destructive" />
              </div>
              <h3 className="text-xl font-bold text-destructive">Access Denied</h3>
              <p className="text-muted-foreground">
                Shadow Agent access is restricted. Contact an administrator for access.
              </p>
              <Badge variant="destructive" className="mt-2">
                RESTRICTED ACCESS
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Password verification screen
  if (!isPasswordVerified) {
    return (
      <div className="flex items-center justify-center h-full">
        <Card className="border-destructive bg-destructive/5 w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-destructive/20 rounded-full flex items-center justify-center mx-auto">
                <Shield className="h-8 w-8 text-destructive" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-destructive">🛡️ Shadow Agent Access</h3>
                <p className="text-muted-foreground mt-2">
                  Enter the Shadow Agent password to proceed
                </p>
              </div>
              <div className="space-y-4">
                <Input
                  type="password"
                  placeholder="Enter password..."
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handlePasswordSubmit()}
                  className="border-destructive/30"
                />
                <Button 
                  variant="destructive" 
                  onClick={handlePasswordSubmit}
                  disabled={!passwordInput.trim()}
                  className="w-full"
                >
                  Access Shadow Agent
                </Button>
              </div>
              <Badge variant="destructive" className="animate-pulse">
                RESTRICTED ACCESS
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleGrantAccess = async () => {
    if (!targetUserId.trim()) return;
    
    const expiresAt = expirationDays !== 'never' 
      ? new Date(Date.now() + parseInt(expirationDays) * 24 * 60 * 60 * 1000).toISOString()
      : undefined;
    
    await grantShadowAccess(targetUserId.trim(), expiresAt);
    setTargetUserId('');
  };

  return (
    <div className="h-full flex flex-col space-y-6 p-6">
      {/* Header */}
      <Card className="bg-gradient-to-br from-destructive/10 to-orange-500/10 border-destructive/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-destructive/20 rounded-full">
                <Shield className="h-6 w-6 text-destructive" />
              </div>
              <div>
                <CardTitle className="text-2xl text-destructive">🛡️ Shadow Agent</CardTitle>
                <CardDescription>
                  Unrestricted AI capabilities - {permissions?.role} access
                </CardDescription>
              </div>
            </div>
            <Badge variant="destructive" className="animate-pulse">
              SHADOW MODE
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Access Management - Admin Only */}
      {isAdmin && (
        <Card className="border-orange-500/30">
          <CardHeader>
            <CardTitle className="flex items-center">
              <UserCheck className="h-5 w-5 mr-2" />
              Access Management
            </CardTitle>
            <CardDescription>
              Grant or revoke Shadow Agent access for other users
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Input
                placeholder="User ID to grant access"
                value={targetUserId}
                onChange={(e) => setTargetUserId(e.target.value)}
              />
              <Select value={expirationDays} onValueChange={setExpirationDays}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Day</SelectItem>
                  <SelectItem value="7">7 Days</SelectItem>
                  <SelectItem value="30">30 Days</SelectItem>
                  <SelectItem value="never">Never Expires</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={handleGrantAccess}
                disabled={!targetUserId.trim()}
                variant="destructive"
              >
                Grant Access
              </Button>
            </div>
            
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4" />
              <span>Only grant Shadow Agent access to trusted users. This provides unrestricted AI capabilities.</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shadow Agent Chat Interface */}
      <div className="flex-1 min-h-0">
        <ShadowAgentChat />
      </div>

      {/* Warning */}
      <Card className="border-yellow-500/50 bg-yellow-500/5">
        <CardContent className="pt-6">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-yellow-800 dark:text-yellow-200">
                Shadow Agent Warning
              </p>
              <p className="text-yellow-700 dark:text-yellow-300 mt-1">
                This interface provides unrestricted AI capabilities. Use responsibly and in accordance with applicable laws and regulations.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
