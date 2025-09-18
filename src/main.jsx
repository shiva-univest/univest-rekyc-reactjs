import { StrictMode, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";
import { initAuth } from "./api/api.js";

function Root() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    (async () => {
      await initAuth();
      setReady(true);
    })();
  }, []);

  if (!ready) {
    return ""
  }

  return <App />;
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <Root />
  </StrictMode>
);