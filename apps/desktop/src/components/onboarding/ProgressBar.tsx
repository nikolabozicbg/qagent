import { Check } from 'lucide-react';

interface ProgressBarProps {
  currentStep: number;
  totalSteps: number;
}

const stepLabels = ['Welcome', 'Detection', 'Config', 'Discovery'];

export const ProgressBar = ({ currentStep, totalSteps }: ProgressBarProps) => {
  return (
    <div className="w-full">
      <div className="flex items-start justify-between relative">
        {stepLabels.map((label, index) => {
          const stepNumber = index + 1;
          const isCompleted = stepNumber < currentStep;
          const isCurrent = stepNumber === currentStep;
          const isLast = index === stepLabels.length - 1;
          
          return (
            <div key={label} className="flex flex-col items-center gap-2 relative" style={{ flex: 1 }}>
              {/* Connecting line to next step */}
              {!isLast && (
                <div className="absolute top-5 left-[50%] w-full h-0.5 -z-10">
                  <div className={`h-full transition-all duration-500 ${
                    isCompleted ? 'bg-primary' : 'bg-border/30'
                  }`} />
                </div>
              )}
              
              {/* Circle with number/check */}
              <div className={`relative z-10 flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all duration-300 ${
                isCompleted 
                  ? 'bg-primary border-primary shadow-glow-sm' 
                  : isCurrent 
                    ? 'bg-primary/20 border-primary shadow-glow animate-pulse' 
                    : 'bg-dark border-border'
              }`}>
                {isCompleted ? (
                  <Check size={18} className="text-white" />
                ) : (
                  <span className={`text-sm font-bold ${
                    isCurrent ? 'text-primary' : 'text-text-tertiary'
                  }`}>
                    {stepNumber}
                  </span>
                )}
              </div>
              
              {/* Label */}
              <span className={`text-xs font-medium transition-colors whitespace-nowrap ${
                isCurrent ? 'text-text-primary' : 'text-text-tertiary'
              }`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
};
