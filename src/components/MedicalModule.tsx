import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Upload, FileText, Pill, Heart, Activity } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export const MedicalModule = () => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [notes, setNotes] = useState('');
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
    }
  };

  const handleSubmit = () => {
    if (!selectedFile && !notes.trim()) {
      toast({
        title: "Error",
        description: "Please upload a file or add notes",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Medical Record Added",
      description: "Your medical information has been saved for AI analysis",
    });

    setSelectedFile(null);
    setNotes('');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center space-x-2">
        <Heart className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold">Medical Health Optimization</h1>
      </div>

      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="upload">Upload Records</TabsTrigger>
          <TabsTrigger value="bloodwork">Blood Tests</TabsTrigger>
          <TabsTrigger value="medications">Medications</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Upload className="h-5 w-5" />
                <span>Upload Medical Documents</span>
              </CardTitle>
              <CardDescription>
                Upload blood tests, doctor notes, prescriptions, and other medical documents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="file-upload">Select File</Label>
                <Input
                  id="file-upload"
                  type="file"
                  accept=".pdf,.doc,.docx,.jpg,.png,.jpeg"
                  onChange={handleFileUpload}
                  className="mt-1"
                />
                {selectedFile && (
                  <p className="text-sm text-muted-foreground mt-1">
                    Selected: {selectedFile.name}
                  </p>
                )}
              </div>
              
              <div>
                <Label htmlFor="notes">Additional Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any additional context or notes about this medical record..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="mt-1"
                />
              </div>

              <Button onClick={handleSubmit} className="w-full">
                <Upload className="mr-2 h-4 w-4" />
                Save Medical Record
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bloodwork" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Blood Test Results</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No blood test results uploaded yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Upload your lab results to get AI-powered health insights
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="medications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Pill className="h-5 w-5" />
                <span>Current Medications</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Pill className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No medications recorded yet</p>
                <p className="text-sm text-muted-foreground mt-2">
                  Add your current medications for drug interaction analysis
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Health Insights</CardTitle>
              <CardDescription>
                Personalized health recommendations based on your medical data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Heart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Upload medical records to get AI insights</p>
                <p className="text-sm text-muted-foreground mt-2">
                  AI will analyze your data for preventative health optimization
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};