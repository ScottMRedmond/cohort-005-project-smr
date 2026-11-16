import { reactRouter } from "@react-router/dev/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tailwindcss(), reactRouter(), tsconfigPaths()],
  server: {
    // Listen on all interfaces. Inside the devcontainer `localhost` resolves
    // to IPv6 ::1 only, which the port forwarder (IPv4) can't reach.
    host: true,
    // Fail instead of silently moving to 5174, which isn't forwarded.
    strictPort: true,
  },
});
