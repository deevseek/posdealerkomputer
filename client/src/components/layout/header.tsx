import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { Plus, User, ChevronDown } from "lucide-react";

interface HeaderProps {
  title: string;
  breadcrumb: string;
  action?: React.ReactNode;
}

export default function Header({ title, breadcrumb, action }: HeaderProps) {
  const { user } = useAuth();

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  return (
    <header className="bg-card border-b border-border px-6 py-4 flex justify-between items-center shadow-sm">
      <div className="flex items-center space-x-4">
        <h2 className="text-xl font-semibold text-foreground" data-testid="header-title">
          {title}
        </h2>
        <nav className="text-sm text-muted-foreground" data-testid="header-breadcrumb">
          {breadcrumb}
        </nav>
      </div>
      
      <div className="flex items-center space-x-4">
        {action}
        
        <div className="flex items-center space-x-3">
          <div className="text-right">
            <p className="text-sm font-medium" data-testid="text-user-name">
              {user?.firstName || user?.email || "User"}
            </p>
            <p className="text-xs text-muted-foreground capitalize" data-testid="text-user-role">
              {user?.role || "Staff"}
            </p>
          </div>
          <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center">
            <User className="w-4 h-4 text-primary-foreground" />
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground"
            data-testid="button-logout"
          >
            <ChevronDown className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </header>
  );
}
