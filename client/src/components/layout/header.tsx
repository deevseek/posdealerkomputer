import { Button } from "@/components/ui/button";
import { Download, User } from "lucide-react";

interface HeaderProps {
  title: string;
  subtitle?: string;
  showExport?: boolean;
}

export default function Header({ title, subtitle, showExport = false }: HeaderProps) {
  return (
    <header className="bg-white border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          {subtitle && (
            <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
          )}
        </div>
        <div className="flex items-center space-x-4">
          {showExport && (
            <Button 
              className="flex items-center space-x-2"
              data-testid="button-export"
            >
              <Download className="h-4 w-4" />
              <span>Export Data</span>
            </Button>
          )}
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">A</span>
            </div>
            <span className="text-sm font-medium">Adifya</span>
          </div>
        </div>
      </div>
    </header>
  );
}
