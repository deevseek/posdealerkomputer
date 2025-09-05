interface InstallationProgressProps {
  progress: number;
}

export default function InstallationProgress({ progress }: InstallationProgressProps) {
  return (
    <header className="bg-card border-b border-border shadow-sm">
      <div className="px-6 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Installation Progress</h2>
            <p className="text-sm text-muted-foreground mt-1">Setting up new service management features</p>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-32 bg-muted rounded-full h-2">
              <div 
                className="bg-primary h-2 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
                data-testid="progress-bar"
              ></div>
            </div>
            <span className="text-sm font-medium text-muted-foreground" data-testid="progress-text">
              {progress}%
            </span>
          </div>
        </div>
      </div>
    </header>
  );
}
