export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  /** ReactNode, not string: several pages link the client name inside it. */
  description?: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-6">
      <div className="min-w-0">
        <h1 className="text-[28px] leading-tight font-semibold tracking-tight">{title}</h1>
        {description ? (
          <p className="text-muted-foreground mt-2 text-[15px]">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
