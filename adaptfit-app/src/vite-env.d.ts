/// <reference types="vite/client" />

interface ImportMetaEnv {
	readonly VITE_API_BASE_URL: string;
	readonly VITE_REDO_COOLDOWN_MS?: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
