/** Shared shell for the three non-interactive states the app can be in before there's
 * anything else to show: loading, not opened inside Telegram, or a fatal error. */
export function StatusScreen({
  title,
  subtitle,
  isError,
}: {
  title: string;
  subtitle?: string;
  isError?: boolean;
}) {
  return (
    <div className="screen screen-centered">
      <p className="title">{title}</p>
      {subtitle && <p className={isError ? "error-text" : "subtitle"}>{subtitle}</p>}
    </div>
  );
}
