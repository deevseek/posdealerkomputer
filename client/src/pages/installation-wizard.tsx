import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import WizardSidebar from "@/components/installation/wizard-sidebar";
import InstallationProgress from "@/components/installation/installation-progress";
import TransactionDiscountSetup from "@/components/installation/transaction-discount-setup";
import OnlineTrackingSetup from "@/components/installation/online-tracking-setup";
import WhatsAppTroubleshooting from "@/components/installation/whatsapp-troubleshooting";
import PrintLayoutSetup from "@/components/installation/print-layout-setup";
import DailyExpenseSetup from "@/components/installation/daily-expense-setup";
import { Button } from "@/components/ui/button";
import type { InstallationStep } from "@shared/schema";

export default function InstallationWizard() {
  const [activeStep, setActiveStep] = useState("transaction-discount");

  // Fetch installation steps
  const { data: steps = [], isLoading } = useQuery<InstallationStep[]>({
    queryKey: ["/api/installation/steps"],
  });

  const calculateOverallProgress = () => {
    if (steps.length === 0) return 0;
    const totalProgress = steps.reduce((sum, step) => sum + step.progress, 0);
    return Math.round(totalProgress / steps.length);
  };

  const handleFinalizeSetup = () => {
    console.log("Finalizing setup...");
    // This would typically complete the installation process
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading installation wizard...</p>
        </div>
      </div>
    );
  }

  const renderActiveComponent = () => {
    switch (activeStep) {
      case "transaction-discount":
        return <TransactionDiscountSetup />;
      case "online-tracking":
        return <OnlineTrackingSetup />;
      case "whatsapp-api":
        return <WhatsAppTroubleshooting />;
      case "print-layouts":
        return <PrintLayoutSetup />;
      case "daily-expenses":
        return <DailyExpenseSetup />;
      default:
        return <TransactionDiscountSetup />;
    }
  };

  return (
    <div className="min-h-screen flex bg-background">
      {/* Sidebar Navigation */}
      <WizardSidebar
        steps={steps}
        activeStep={activeStep}
        onStepChange={setActiveStep}
      />

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto">
        <InstallationProgress progress={calculateOverallProgress()} />

        <main className="p-6 space-y-6">
          <div className="slide-in-up">
            {renderActiveComponent()}
          </div>

          {/* Installation Complete */}
          <div className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950 dark:to-blue-950 border border-green-200 dark:border-green-800 rounded-lg p-6">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                <i className="fas fa-check text-green-600 dark:text-green-400 text-xl"></i>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">Installation Nearly Complete!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  All major features have been configured. Complete the WhatsApp API optimization to finish the setup.
                </p>
              </div>
              <div className="flex-shrink-0">
                <Button
                  onClick={handleFinalizeSetup}
                  className="bg-green-600 hover:bg-green-700 text-white px-6 py-3"
                  data-testid="button-finalize-setup"
                >
                  Finalize Setup
                </Button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
