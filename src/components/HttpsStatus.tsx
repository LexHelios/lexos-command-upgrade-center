import { Shield, ShieldOff, Terminal } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useState } from 'react';

export const HttpsStatus = () => {
  const isHttps = window.location.protocol === 'https:';
  const [showInstructions, setShowInstructions] = useState(false);
  
  if (isHttps) {
    return (
      <Alert className="mb-4 border-green-500 bg-green-50 dark:bg-green-950">
        <Shield className="h-4 w-4 text-green-600" />
        <AlertTitle>Secure Connection</AlertTitle>
        <AlertDescription className="text-green-700 dark:text-green-300">
          HTTPS enabled - Microphone access available
        </AlertDescription>
      </Alert>
    );
  }
  
  return (
    <Alert className="mb-4 border-orange-500 bg-orange-50 dark:bg-orange-950">
      <ShieldOff className="h-4 w-4 text-orange-600" />
      <AlertTitle>HTTPS Required for Microphone</AlertTitle>
      <AlertDescription className="space-y-2">
        <p className="text-orange-700 dark:text-orange-300">
          Microphone access is blocked on HTTP connections.
        </p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowInstructions(!showInstructions)}
          className="mt-2"
        >
          <Terminal className="w-4 h-4 mr-2" />
          {showInstructions ? 'Hide' : 'Show'} Setup Instructions
        </Button>
        
        {showInstructions && (
          <Card className="mt-3 p-4 bg-black/5 dark:bg-white/5">
            <div className="space-y-2 font-mono text-sm">
              <p className="font-semibold">Run these commands:</p>
              <div className="space-y-1">
                <p className="text-green-600 dark:text-green-400">
                  $ cd /home/user/lexos-combined
                </p>
                <p className="text-green-600 dark:text-green-400">
                  $ npm run setup:https
                </p>
                <p className="text-green-600 dark:text-green-400">
                  $ npm run dev:https
                </p>
              </div>
              <p className="text-muted-foreground mt-3">
                Then access: <strong>https://localhost:8080</strong>
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Note: Accept the certificate warning on first visit
              </p>
            </div>
          </Card>
        )}
      </AlertDescription>
    </Alert>
  );
};