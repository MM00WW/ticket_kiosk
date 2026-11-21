import { createRoot } from "react-dom/client";
import { QueueApp } from "./components/queue-app";
import "./style.css";

// 四个页面用普通链接切换，不再引入路由库。
const parts = location.pathname.split("/");
const page = parts[1];
if (page === "operator") {
  createRoot(document.getElementById("root")!).render(
    <QueueApp page="operator" windowId={Number(parts[2])} />,
  );
} else if (page === "display" || page === "admin") {
  createRoot(document.getElementById("root")!).render(<QueueApp page={page} />);
} else {
  createRoot(document.getElementById("root")!).render(
    <QueueApp page="kiosk" />,
  );
}
