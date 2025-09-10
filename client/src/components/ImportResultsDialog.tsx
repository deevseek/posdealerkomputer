import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { CheckCircle, XCircle, AlertTriangle, FileText } from "lucide-react";
import { ImportResult } from "@/lib/importExportUtils";

interface ImportResultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  result: ImportResult | null;
  title?: string;
}

export default function ImportResultsDialog({ 
  open, 
  onOpenChange, 
  result, 
  title = "Import Results" 
}: ImportResultsDialogProps) {
  if (!result) return null;

  const hasErrors = result.errorCount > 0;
  const hasSuccesses = result.successCount > 0;
  const isPartialSuccess = hasErrors && hasSuccesses;

  const getStatusIcon = () => {
    if (!hasErrors) return <CheckCircle className="w-6 h-6 text-green-600" />;
    if (isPartialSuccess) return <AlertTriangle className="w-6 h-6 text-yellow-600" />;
    return <XCircle className="w-6 h-6 text-red-600" />;
  };

  const getStatusColor = () => {
    if (!hasErrors) return "text-green-600";
    if (isPartialSuccess) return "text-yellow-600";
    return "text-red-600";
  };

  const getStatusMessage = () => {
    if (!hasErrors) return `Successfully imported all ${result.successCount} records`;
    if (isPartialSuccess) return `Imported ${result.successCount} of ${result.totalRows} records`;
    return `Failed to import any records`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]" data-testid="dialog-import-results">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            {getStatusIcon()}
            <span>{title}</span>
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Summary Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center p-4 bg-muted rounded-lg">
              <div className="text-2xl font-bold text-muted-foreground" data-testid="total-rows">
                {result.totalRows}
              </div>
              <div className="text-sm text-muted-foreground">Total Rows</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <div className="text-2xl font-bold text-green-600" data-testid="success-count">
                {result.successCount}
              </div>
              <div className="text-sm text-green-600">Successful</div>
            </div>
            
            <div className="text-center p-4 bg-red-50 dark:bg-red-950 rounded-lg">
              <div className="text-2xl font-bold text-red-600" data-testid="error-count">
                {result.errorCount}
              </div>
              <div className="text-sm text-red-600">Errors</div>
            </div>
          </div>

          {/* Status Message */}
          <div className="text-center">
            <p className={`text-lg font-medium ${getStatusColor()}`} data-testid="status-message">
              {getStatusMessage()}
            </p>
          </div>

          {/* Error Details */}
          {hasErrors && (
            <div className="space-y-3">
              <Separator />
              <div className="flex items-center space-x-2">
                <FileText className="w-4 h-4 text-red-600" />
                <h4 className="font-medium text-red-600">Error Details</h4>
                <Badge variant="destructive" className="ml-auto" data-testid="error-badge">
                  {result.errors.length} errors
                </Badge>
              </div>
              
              <ScrollArea className="h-48 border rounded-md p-4">
                <div className="space-y-2" data-testid="error-list">
                  {result.errors.map((error, index) => (
                    <div 
                      key={index}
                      className="flex items-start space-x-3 p-3 bg-red-50 dark:bg-red-950 rounded-md"
                      data-testid={`error-item-${index}`}
                    >
                      <XCircle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-red-800 dark:text-red-200">
                          Row {error.row}
                          {error.field && <span className="ml-2 text-red-600">({error.field})</span>}
                        </p>
                        <p className="text-sm text-red-600 break-words">{error.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Success Message for Perfect Import */}
          {!hasErrors && (
            <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
              <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-sm text-green-600">
                All records were successfully imported into the system.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}