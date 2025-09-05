import type { InstallationStep } from "@shared/schema";

interface WizardSidebarProps {
  steps: InstallationStep[];
  activeStep: string;
  onStepChange: (stepId: string) => void;
}

export default function WizardSidebar({ steps, activeStep, onStepChange }: WizardSidebarProps) {
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return "fas fa-check";
      case "in_progress":
        return "fas fa-cog fa-spin";
      case "failed":
        return "fas fa-times";
      default:
        return "fas fa-clock";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-primary/10 border-primary/20";
      case "in_progress":
        return "bg-accent/10 border-accent/20";
      case "failed":
        return "bg-red-50 dark:bg-red-950 border-red-200 dark:border-red-800";
      default:
        return "bg-muted/50 border-border";
    }
  };

  const getIconBgColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-primary";
      case "in_progress":
        return "bg-accent";
      case "failed":
        return "bg-red-500";
      default:
        return "bg-muted-foreground";
    }
  };

  return (
    <div className="w-80 bg-card shadow-xl border-r border-border">
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center">
            <i className="fas fa-cogs text-primary-foreground"></i>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Setup Wizard</h1>
            <p className="text-sm text-muted-foreground">Service Management System</p>
          </div>
        </div>
      </div>
      
      {/* Installation Steps */}
      <div className="p-6">
        <nav className="space-y-3">
          {steps.map((step) => (
            <div key={step.id} className={`wizard-step ${step.status !== "pending" ? "active" : ""}`}>
              <button
                onClick={() => onStepChange(step.id)}
                className={`w-full flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                  getStatusColor(step.status)
                } ${
                  activeStep === step.id 
                    ? "ring-2 ring-primary ring-offset-2 ring-offset-background" 
                    : "hover:bg-muted/30"
                }`}
                data-testid={`wizard-step-${step.id}`}
              >
                <div className={`w-8 h-8 ${getIconBgColor(step.status)} rounded-full flex items-center justify-center flex-shrink-0`}>
                  <i className={`${getStatusIcon(step.status)} text-white text-xs`}></i>
                </div>
                <div className="text-left flex-1">
                  <div className="text-sm font-medium text-foreground">{step.name}</div>
                  <div className="text-xs text-muted-foreground">{step.description}</div>
                  {step.status === "in_progress" && (
                    <div className="mt-1 w-full bg-muted rounded-full h-1">
                      <div 
                        className="bg-accent h-1 rounded-full transition-all duration-300"
                        style={{ width: `${step.progress}%` }}
                      ></div>
                    </div>
                  )}
                </div>
              </button>
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}
