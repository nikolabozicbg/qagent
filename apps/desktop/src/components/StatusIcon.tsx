import { AlertCircle, CheckCircle2, Clock, XCircle } from 'lucide-react';

interface StatusIconProps {
  status: 'no-tests' | 'passing' | 'partial' | 'failing';
  size?: 'sm' | 'md' | 'lg';
}

export function StatusIcon({ status, size = 'md' }: StatusIconProps) {
  const getSizeClass = () => {
    switch (size) {
      case 'sm':
        return 'w-4 h-4';
      case 'md':
        return 'w-5 h-5';
      case 'lg':
        return 'w-6 h-6';
    }
  };

  const sizeClass = getSizeClass();

  switch (status) {
    case 'no-tests':
      return <AlertCircle className={`${sizeClass} text-error`} />;
    case 'passing':
      return <CheckCircle2 className={`${sizeClass} text-success`} />;
    case 'partial':
      return <Clock className={`${sizeClass} text-warning`} />;
    case 'failing':
      return <XCircle className={`${sizeClass} text-error`} />;
    default:
      return <AlertCircle className={`${sizeClass} text-white/60`} />;
  }
}
