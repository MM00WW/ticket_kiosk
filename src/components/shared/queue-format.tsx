export function elapsed(start: string | null | undefined, now: number) {
  if (!start) return "—";
  const seconds = Math.max(0, Math.floor((now - Date.parse(start)) / 1000));
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}
export function time(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
export function Status({ status }: { status: string }) {
  return (
    <span className={`pill status-${status}`}>
      <span className="status-dot" />
      {status.replaceAll("_", " ")}
    </span>
  );
}
