interface LoadingProps {
  message?: string;
  subline?: string | null;
  className?: string;
}

export function Loading({ message, subline, className }: LoadingProps) {
  return (
    <div
      className={
        'absolute inset-0 z-[200] flex items-center justify-center bg-background/60 backdrop-blur-[2px]' +
        (className ? ` ${className}` : '')
      }
    >
      <div className="flex flex-col items-center justify-center gap-4 text-center">
        <img
          src="/travel-porto-circle.svg"
          alt=""
          className="h-32 w-32 animate-spin shrink-0"
          style={{ animationDuration: '2.5s' }}
          aria-hidden
        />
        {(message ?? subline) && (
          <div>
            {message && <p className="text-lg font-medium">{message}</p>}
            {subline && (
              <p className="text-sm text-muted-foreground">{subline}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}