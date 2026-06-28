import { GoogleOAuthProvider } from "@react-oauth/google";
import { StrictMode } from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
	throw new Error("Root element not found");
}

ReactDOM.createRoot(rootElement).render(
	<StrictMode>
		<GoogleOAuthProvider clientId={import.meta.env.VITE_OAUTH_CLIENT_ID}>
			<App />
		</GoogleOAuthProvider>
	</StrictMode>,
);
