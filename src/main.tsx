import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./assets/styles.css";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
	<>
		{import.meta.env.PROD ? (
			<React.StrictMode>
				<App />
			</React.StrictMode>
		) : (
			<App />
		)}
	</>
);
