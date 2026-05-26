// components/ui/EmptyState.tsx
import React from 'react';

interface EmptyStateProps {
  icon?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ icon = '📭', title, description, action }) => (
  <div className="card p-12 text-center space-y-4">
    <div className="text-4xl" aria-hidden="true">{icon}</div>
    <div className="space-y-1">
      <h3 className="font-medium text-stone-800">{title}</h3>
      {description && <p className="text-sm text-stone-400">{description}</p>}
    </div>
    {action && <div>{action}</div>}
  </div>
);
