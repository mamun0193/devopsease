import React from "react";
import clsx from "clsx";
import { FolderOpen } from "lucide-react";

export interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({
  icon = <FolderOpen className="h-10 w-10 text-slate-500" />,
  title,
  description,
  action,
  className,
  ...props
}: EmptyStateProps) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center p-12 text-center border border-white/10 rounded-xl bg-white/5",
        className
      )}
      {...props}
    >
      <div className="mb-4 p-4 rounded-full bg-white/5 shadow-inner">
        {icon}
      </div>
      <h3 className="text-xl font-medium text-slate-200 mb-2">{title}</h3>
      {description && (
        <p className="text-slate-400 max-w-sm mb-6">{description}</p>
      )}
      {action && <div>{action}</div>}
    </div>
  );
}
