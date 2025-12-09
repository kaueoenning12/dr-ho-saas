import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initializeErrorHandlers } from "./lib/services/errorHandler";

// Inicializar handlers globais de erro
initializeErrorHandlers();

createRoot(document.getElementById("root")!).render(<App />);
